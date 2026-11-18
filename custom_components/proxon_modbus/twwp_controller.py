"""Controller of the hot water heat pump (TWWP): runs `twwp.decide` and applies the result.

Free of Home Assistant imports: the readings, the switch calls and the storage
are passed in, so the controller can be unit tested with plain pytest.

In dry-run mode (`control` off, the default) nothing is switched. The
controller keeps its own state and reports what it would switch, so it can run
next to an existing automation and be compared with it before it takes over.
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass, field
from typing import Any, Protocol

from .twwp import (
    CONF_CONTROL,
    CONF_ENABLE_PV_SWITCH,
    CONF_ENABLE_SWITCH,
    CONF_MIN_OFF,
    CONF_MIN_ON,
    DEFAULT_HYSTERESIS,
    DEFAULT_TARGETS,
    HYST_RANGE,
    PROGRAM_OFF,
    PROGRAMS,
    PV_NONE,
    PV_STATES,
    REASON_LOCKED,
    REASON_NONE,
    REASON_SENSOR_UNAVAILABLE,
    TARGET_MAX_C,
    TARGET_MIN_C,
    TwwpDecision,
    build_input,
    decide,
    lock_active,
)

_LOGGER = logging.getLogger(__name__)

RUN_INTERVAL = 60  # seconds between two decisions


class Store(Protocol):
    async def async_load(self) -> Any: ...
    async def async_save(self, data: Any) -> None: ...


@dataclass
class TwwpState:
    """What the entities show."""

    control: bool = False
    water: float | None = None
    program: str = PROGRAM_OFF
    pv_status: str = PV_NONE
    targets: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_TARGETS))
    hysteresis: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_HYSTERESIS))
    reason: str | None = None
    last_run: float | None = None
    last_error: str | None = None
    # Switches the decision wants in another state than they are in now: [(entity_id, "on"|"off")].
    planned: list[tuple[str, str]] = field(default_factory=list)
    # Last seen state of the main enable switch and when it changed (for the minimum run/pause time).
    switch_state: str | None = None
    switch_since: float | None = None


class TwwpController:
    """One heat pump: keeps program and targets, decides, and (if enabled) switches."""

    def __init__(
        self,
        config: Mapping[str, Any],
        read_state: Callable[[str], str | None],
        call_service: Callable[[str, str], Awaitable[None]],
        store: Store,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._config = config
        self._read = read_state
        self._call = call_service  # (entity_id, "on" | "off") -> switches the entity
        self._store = store
        self._clock = clock
        self._lock = asyncio.Lock()
        self._listeners: list[Callable[[], None]] = []
        # The setup form no longer asks for it; a value in the config is only the starting point.
        self.state = TwwpState(control=bool(config.get(CONF_CONTROL, False)))

    @property
    def control(self) -> bool:
        """True: the controller switches. False: dry run, it only reports what it would switch."""
        return self.state.control

    async def async_set_control(self, on: bool) -> None:
        """Switch between dry run and controlling, and decide again right away."""
        self.state.control = bool(on)
        await self.async_run()

    @property
    def switches(self) -> list[str]:
        """The enable switches this controller operates."""
        return [e for e in (self._config.get(CONF_ENABLE_SWITCH), self._config.get(CONF_ENABLE_PV_SWITCH)) if e]

    def add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)

    def _notify(self) -> None:
        for listener in list(self._listeners):
            listener()

    async def async_load(self) -> None:
        """Restore program and targets saved by an earlier run."""
        data = await self._store.async_load()
        if not isinstance(data, dict):
            return
        if isinstance(data.get("control"), bool):
            self.state.control = data["control"]
        if data.get("program") in PROGRAMS:
            self.state.program = data["program"]
        if data.get("pv_status") in PV_STATES:
            self.state.pv_status = data["pv_status"]
        if data.get("switch_state") in ("on", "off"):
            self.state.switch_state = data["switch_state"]
            since = data.get("switch_since")
            if isinstance(since, (int, float)) and not isinstance(since, bool):
                self.state.switch_since = float(since)
        saved = data.get("targets")
        if isinstance(saved, dict):
            for key in self.state.targets:
                value = saved.get(key)
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    self.state.targets[key] = min(TARGET_MAX_C, max(TARGET_MIN_C, float(value)))
        saved_h = data.get("hysteresis")
        if isinstance(saved_h, dict):
            for key, (low, high) in HYST_RANGE.items():
                value = saved_h.get(key)
                if isinstance(value, (int, float)) and not isinstance(value, bool) and low <= value <= high:
                    self.state.hysteresis[key] = float(value)

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "control": self.state.control,
                "program": self.state.program,
                "pv_status": self.state.pv_status,
                "targets": self.state.targets,
                "hysteresis": self.state.hysteresis,
                "switch_state": self.state.switch_state,
                "switch_since": self.state.switch_since,
            }
        )

    async def async_set_target(self, key: str, value: float) -> None:
        """Change a target temperature and decide again."""
        if key not in self.state.targets:
            raise KeyError(key)
        self.state.targets[key] = min(TARGET_MAX_C, max(TARGET_MIN_C, float(value)))
        await self.async_run()

    async def async_set_hysteresis(self, key: str, value: float) -> None:
        """Change the start or stop band (kept inside the range the entity accepts) and decide again."""
        if key not in HYST_RANGE:
            raise KeyError(key)
        low, high = HYST_RANGE[key]
        self.state.hysteresis[key] = min(high, max(low, float(value)))
        await self.async_run()

    def _observe_switch(self) -> None:
        """Note when the main enable switch changed, also when somebody else changed it."""
        entity = self._config.get(CONF_ENABLE_SWITCH)
        current = self._read(entity) if entity else None
        if current in ("on", "off") and current != self.state.switch_state:
            # The first sighting has no known change time: nothing is held back then.
            self.state.switch_since = self._clock() if self.state.switch_state is not None else None
            self.state.switch_state = current

    def _locked(self) -> bool:
        return lock_active(
            self.state.switch_state,
            self.state.switch_since,
            self._clock(),
            float(self._config.get(CONF_MIN_ON) or 0),
            float(self._config.get(CONF_MIN_OFF) or 0),
        )

    async def async_run(self) -> TwwpDecision:
        """Decide once and apply the decision (if control is on)."""
        async with self._lock:
            inp = build_input(self._read, self._config, self.state.program, self.state.targets, self.state.hysteresis)
            decision = decide(inp)
            state = self.state
            self._observe_switch()
            if decision.reason != REASON_SENSOR_UNAVAILABLE and decision.reason != REASON_NONE and self._locked():
                # Held back: neither program nor switches change; the PV status is still tracked.
                decision = TwwpDecision(REASON_LOCKED, pv_status=decision.pv_status)
            state.reason = decision.reason
            state.water = inp.water
            state.last_run = self._clock()
            if decision.pv_status is not None:
                state.pv_status = decision.pv_status
            if decision.program is not None:
                state.program = decision.program

            wanted = [
                (self._config.get(CONF_ENABLE_SWITCH), decision.enable),
                (self._config.get(CONF_ENABLE_PV_SWITCH), decision.enable_pv),
            ]
            state.planned = [
                (entity, "on" if on else "off")
                for entity, on in wanted
                if entity and on is not None and self._read(entity) != ("on" if on else "off")
            ]

            error = None
            if self.control:
                for entity, target in state.planned:
                    try:
                        await self._call(entity, target)
                        if entity == self._config.get(CONF_ENABLE_SWITCH):
                            state.switch_state, state.switch_since = target, self._clock()
                    except Exception as err:  # noqa: BLE001 - one failing switch must not stop the controller
                        error = f"{entity}: {err}"
                        _LOGGER.warning("TWWP: switching %s %s failed: %s", entity, target, err)
            state.last_error = error
            await self._async_save()
        self._notify()
        return decision

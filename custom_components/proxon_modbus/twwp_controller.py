"""Controller of the hot water heat pump (TWWP): runs `twwp.decide` and applies the result.

Free of Home Assistant imports: the readings, the switch calls and the storage
are passed in, so the controller can be unit tested with plain pytest.

In observe mode (`control` off, the default) nothing is switched. The
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
    DEFAULT_TARGETS,
    PROGRAM_OFF,
    PROGRAMS,
    PV_NONE,
    PV_STATES,
    TwwpDecision,
    build_input,
    decide,
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
    reason: str | None = None
    last_run: float | None = None
    last_error: str | None = None
    # Switches the decision wants in another state than they are in now: [(entity_id, "on"|"off")].
    planned: list[tuple[str, str]] = field(default_factory=list)


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
        """True: the controller switches. False: it only observes and reports."""
        return self.state.control

    async def async_set_control(self, on: bool) -> None:
        """Switch between observing and controlling, and decide again right away."""
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
        saved = data.get("targets")
        if isinstance(saved, dict):
            for key in self.state.targets:
                value = saved.get(key)
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    self.state.targets[key] = float(value)

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "control": self.state.control,
                "program": self.state.program,
                "pv_status": self.state.pv_status,
                "targets": self.state.targets,
            }
        )

    async def async_set_target(self, key: str, value: float) -> None:
        """Change a target temperature and decide again."""
        if key not in self.state.targets:
            raise KeyError(key)
        self.state.targets[key] = float(value)
        await self.async_run()

    async def async_run(self) -> TwwpDecision:
        """Decide once and apply the decision (if control is on)."""
        async with self._lock:
            inp = build_input(self._read, self._config, self.state.program, self.state.targets)
            decision = decide(inp)
            state = self.state
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
                    except Exception as err:  # noqa: BLE001 - one failing switch must not stop the controller
                        error = f"{entity}: {err}"
                        _LOGGER.warning("TWWP: switching %s %s failed: %s", entity, target, err)
            state.last_error = error
            await self._async_save()
        self._notify()
        return decision

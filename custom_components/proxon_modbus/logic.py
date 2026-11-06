"""Pure (Home Assistant independent) logic: fan stage restore and run statistics.

Kept free of Home Assistant imports so it can be unit tested with plain pytest.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

ECO_MODES = frozenset({1, 2})
VALID_STAGES = frozenset({0, 1, 2, 3, 4})


class FanStageTracker:
    """Remember the fan stage the user chose and say when to write it back.

    The unit raises the fan stage in the same poll in which the heat pump
    starts and never lowers it again. A stage is therefore only learned when
    the heat pump was off in the previous poll *and* in this one. When the
    heat pump stops, `update` returns the stage to restore.
    """

    def __init__(self) -> None:
        self.enabled = False
        self.preferred: int | None = None
        self._prev_running: bool | None = None
        self._guard = 0

    def update(
        self, *, running: bool, mode: int | None, auto: bool, stage: int | None
    ) -> int | None:
        prev, self._prev_running = self._prev_running, running
        if mode not in ECO_MODES or auto or stage not in VALID_STAGES or running:
            return None
        if prev is True:
            if self.enabled and self.preferred is not None and stage != self.preferred:
                self._guard = 3
                return self.preferred
            return None
        if self._guard:
            self._guard -= 1
            if stage == self.preferred:
                self._guard = 0
            else:
                return None  # restore still settling: don't adopt the raised stage
        self.preferred = stage
        return None


class RunStats:
    """Heat pump runtime/starts and filter operating hours, persisted by the coordinator."""

    def __init__(self) -> None:
        self.hp_seconds = 0.0
        self.hp_starts = 0
        self.day: str | None = None
        self.hp_seconds_today = 0.0
        self.hp_starts_today = 0
        self.filter_seconds = 0.0
        self.recirc_seconds = 0.0
        self._prev_running: bool | None = None
        self._prev_filter: bool | None = None
        self._prev_recirc: bool | None = None

    def update(
        self,
        today: date,
        elapsed: float,
        *,
        running: bool | None,
        unit_on: bool | None,
        filter_due: bool | None,
        recirc_due: bool | None,
    ) -> None:
        """Account for one poll. `elapsed` is the (capped) time since the last poll."""
        iso = today.isoformat()
        if self.day != iso:
            self.day = iso
            self.hp_seconds_today = 0.0
            self.hp_starts_today = 0
        if running is not None:
            if running:
                self.hp_seconds += elapsed
                self.hp_seconds_today += elapsed
                if self._prev_running is False:
                    self.hp_starts += 1
                    self.hp_starts_today += 1
            self._prev_running = running
        if unit_on:
            self.filter_seconds += elapsed
            self.recirc_seconds += elapsed
        # A filter flag falling from "change due" to "ok" means the filter was replaced.
        if filter_due is not None:
            if self._prev_filter and not filter_due:
                self.filter_seconds = 0.0
            self._prev_filter = filter_due
        if recirc_due is not None:
            if self._prev_recirc and not recirc_due:
                self.recirc_seconds = 0.0
            self._prev_recirc = recirc_due

    def as_dict(self) -> dict[str, Any]:
        return {
            "hp_seconds": self.hp_seconds,
            "hp_starts": self.hp_starts,
            "day": self.day,
            "hp_seconds_today": self.hp_seconds_today,
            "hp_starts_today": self.hp_starts_today,
            "filter_seconds": self.filter_seconds,
            "recirc_seconds": self.recirc_seconds,
        }

    def load(self, data: dict[str, Any] | None) -> None:
        if not data:
            return
        self.hp_seconds = float(data.get("hp_seconds", 0))
        self.hp_starts = int(data.get("hp_starts", 0))
        self.day = data.get("day")
        self.hp_seconds_today = float(data.get("hp_seconds_today", 0))
        self.hp_starts_today = int(data.get("hp_starts_today", 0))
        self.filter_seconds = float(data.get("filter_seconds", 0))
        self.recirc_seconds = float(data.get("recirc_seconds", 0))

"""Decision logic for the hot water heat pump (TWWP) with PV surplus.

Pure (Home Assistant independent), so it can be unit tested with plain pytest.
The controller feeds it the current readings and applies the returned
decision; this module never touches switches or entities itself.

The rules are those of the blueprint `twwp_pv.yaml`; the first matching rule
wins, in the order of `decide`.
"""
from __future__ import annotations

from dataclasses import dataclass

# Programs (internal keys; the entity translates them).
PROGRAM_OFF = "off"
PROGRAM_NORMAL = "normal"
PROGRAM_PV = "pv"
PROGRAM_MINIMUM = "minimum"
PROGRAM_NIGHT = "night"
PROGRAMS = (PROGRAM_OFF, PROGRAM_NORMAL, PROGRAM_PV, PROGRAM_MINIMUM, PROGRAM_NIGHT)

# PV status (internal keys).
PV_AVAILABLE = "pv"
PV_NONE = "no_pv"
PV_TOO_COLD = "too_cold"
PV_STATES = (PV_AVAILABLE, PV_NONE, PV_TOO_COLD)

# Why the last decision was made (diagnostics).
REASON_SENSOR_UNAVAILABLE = "sensor_unavailable"
REASON_PV = "pv"
REASON_PV_TARGET_REACHED = "pv_target_reached"
REASON_MINIMUM_END = "minimum_end"
REASON_MINIMUM = "minimum"
REASON_NIGHT = "night"
REASON_NIGHT_END = "night_end"
REASON_PV_END = "pv_end"
REASON_NORMAL = "normal"
REASON_TARGET_REACHED = "target_reached"
REASON_NONE = "none"

HYSTERESIS_LOW = 3.0  # K below the target at which heating starts
HYSTERESIS_HIGH = 1.0  # K above the target at which heating stops
MINIMUM_END_OFFSET = 3.0  # K above the minimum at which the minimum program ends

DEFAULT_PV_THRESHOLD = 1500.0  # W
DEFAULT_FROST_BELOW = 0.0  # degC
DEFAULT_PV_MIN_OUTER = 5.0  # degC
DEFAULT_NIGHT_BELOW = 500.0
DEFAULT_DAY_ABOVE = 950.0


@dataclass(frozen=True)
class TwwpInput:
    """Readings and settings for one decision. None means unavailable."""

    water: float | None
    outer: float | None
    target_normal: float | None
    target_pv: float | None
    target_min: float | None
    pv_power: float | None
    pv_power_avg: float | None
    brightness: float | None
    has_brightness: bool
    program: str
    pv_threshold: float = DEFAULT_PV_THRESHOLD
    frost_below: float = DEFAULT_FROST_BELOW
    pv_min_outer: float = DEFAULT_PV_MIN_OUTER
    night_below: float = DEFAULT_NIGHT_BELOW
    day_above: float = DEFAULT_DAY_ABOVE


@dataclass(frozen=True)
class TwwpDecision:
    """What to do. None for program/enable/enable_pv means: leave it as it is."""

    reason: str
    pv_status: str | None = None
    program: str | None = None
    enable: bool | None = None
    enable_pv: bool | None = None


def pv_status(inp: TwwpInput) -> str:
    """PV status: too cold below the frost limit, else PV when both powers exceed the threshold."""
    if inp.outer is not None and inp.outer < inp.frost_below:
        return PV_TOO_COLD
    if (
        (inp.pv_power or 0) > inp.pv_threshold
        and (inp.pv_power_avg or 0) > inp.pv_threshold
    ):
        return PV_AVAILABLE
    return PV_NONE


def decide(inp: TwwpInput) -> TwwpDecision:
    """Return the decision for the given readings (first matching rule wins)."""
    water = inp.water
    if (
        water is None
        or inp.target_normal is None
        or inp.target_pv is None
        or inp.target_min is None
    ):
        return TwwpDecision(
            REASON_SENSOR_UNAVAILABLE,
            program=PROGRAM_OFF,
            enable=False,
            enable_pv=False,
        )

    status = pv_status(inp)
    program = inp.program
    # Without a brightness sensor it is always day; with an unavailable one it
    # is neither day nor night (the program stays as it is).
    if inp.has_brightness:
        is_night = inp.brightness is not None and inp.brightness < inp.night_below
        is_day = inp.brightness is not None and inp.brightness > inp.day_above
    else:
        is_night = False
        is_day = True

    def result(reason, **kw) -> TwwpDecision:
        return TwwpDecision(reason, pv_status=status, **kw)

    if (
        inp.outer is not None
        and inp.outer > inp.pv_min_outer
        and water <= inp.target_pv - HYSTERESIS_LOW
        and status == PV_AVAILABLE
    ):
        return result(REASON_PV, program=PROGRAM_PV, enable=True, enable_pv=True)

    if program == PROGRAM_PV and water >= inp.target_pv + HYSTERESIS_HIGH:
        return result(
            REASON_PV_TARGET_REACHED, program=PROGRAM_OFF, enable=False, enable_pv=False
        )

    if program == PROGRAM_MINIMUM and water >= inp.target_min + MINIMUM_END_OFFSET:
        return result(REASON_MINIMUM_END, program=PROGRAM_OFF, enable=False)

    if water < inp.target_min and program not in (PROGRAM_NORMAL, PROGRAM_PV):
        return result(REASON_MINIMUM, program=PROGRAM_MINIMUM, enable=True)

    if water >= inp.target_min and is_night and program != PROGRAM_MINIMUM:
        return result(
            REASON_NIGHT, program=PROGRAM_NIGHT, enable=False, enable_pv=False
        )

    if (
        inp.has_brightness
        and inp.brightness is not None
        and inp.brightness > inp.day_above
        and program == PROGRAM_NIGHT
    ):
        return result(REASON_NIGHT_END, program=PROGRAM_OFF, enable=False)

    if program == PROGRAM_PV and status in (PV_NONE, PV_TOO_COLD):
        return result(
            REASON_PV_END, program=PROGRAM_NORMAL, enable=True, enable_pv=False
        )

    if water <= inp.target_normal - HYSTERESIS_LOW and is_day and program != PROGRAM_PV:
        return result(
            REASON_NORMAL, program=PROGRAM_NORMAL, enable=True, enable_pv=False
        )

    if water >= inp.target_normal + HYSTERESIS_HIGH and program != PROGRAM_PV:
        return result(REASON_TARGET_REACHED, program=PROGRAM_OFF, enable=False)

    return result(REASON_NONE)

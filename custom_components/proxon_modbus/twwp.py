"""Decision logic for the hot water heat pump (TWWP) with PV surplus.

Pure (Home Assistant independent), so it can be unit tested with plain pytest.
The controller feeds it the current readings and applies the returned
decision; this module never touches switches or entities itself.

The rules are those of the blueprint `twwp_pv.yaml`; the first matching rule
wins, in the order of `decide`.
"""
from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

# Config subentry type and keys (entity ids and thresholds chosen in the setup).
SUBENTRY_TYPE_TWWP = "twwp"
CONF_ENABLE_SWITCH = "enable_switch"
CONF_ENABLE_PV_SWITCH = "enable_pv_switch"
CONF_WATER = "water_temp"
CONF_OUTER = "outer_temp"
CONF_PV_POWER = "pv_power"
CONF_PV_POWER_AVG = "pv_power_avg"
CONF_BRIGHTNESS = "brightness"
CONF_POWER_ENTITY = "power_entity"  # optional: power of the heat pump (panel only)
CONF_ENERGY_ENTITY = "energy_entity"  # optional: energy meter of the heat pump (panel only)
CONF_PV_THRESHOLD = "pv_threshold"
CONF_FROST_BELOW = "frost_below"
CONF_PV_MIN_OUTER = "pv_min_outer"
CONF_NIGHT_BELOW = "night_below"
CONF_DAY_ABOVE = "day_above"
CONF_MIN_ON = "min_on_minutes"  # minimum run time after switching on (0 = none)
CONF_MIN_OFF = "min_off_minutes"  # minimum pause after switching off (0 = none)
CONF_CONTROL = "control"  # False: dry run, only report what would be switched

TARGET_NORMAL = "normal"
TARGET_PV = "pv"
TARGET_MIN = "min"
DEFAULT_TARGETS = {TARGET_NORMAL: 50.0, TARGET_PV: 60.0, TARGET_MIN: 40.0}
TARGET_MIN_C = 30.0  # range and step of the target temperatures (number entities, water heater)
TARGET_MAX_C = 60.0
TARGET_STEP = 1.0

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
REASON_LOCKED = "locked"  # a decision was held back by the minimum run or pause time
REASONS = (
    REASON_SENSOR_UNAVAILABLE, REASON_PV, REASON_PV_TARGET_REACHED, REASON_MINIMUM_END,
    REASON_MINIMUM, REASON_NIGHT, REASON_NIGHT_END, REASON_PV_END, REASON_NORMAL,
    REASON_TARGET_REACHED, REASON_NONE, REASON_LOCKED,
)

HYSTERESIS_LOW = 3.0  # K below the target at which heating starts (default); also the minimum program ends this far above its target
HYSTERESIS_HIGH = 1.0  # K above the target at which heating stops (default)
HYST_LOW = "low"
HYST_HIGH = "high"
DEFAULT_HYSTERESIS = {HYST_LOW: HYSTERESIS_LOW, HYST_HIGH: HYSTERESIS_HIGH}
HYST_RANGE = {HYST_LOW: (1.0, 10.0), HYST_HIGH: (0.0, 5.0)}  # K, the values the entities accept
HYST_STEP = 0.5
MIN_BAND = 2.0  # K: below this total band the compressor may switch on and off in short intervals

RUNNING_ABOVE_W = 20.0  # the heat pump counts as running above this power (standby draws a few W at most)
MAX_LOCK_MINUTES = 120
DEFAULT_LOCK_MINUTES = 10.0  # 0 would switch the limit off
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
    hyst_low: float = HYSTERESIS_LOW
    hyst_high: float = HYSTERESIS_HIGH


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
            enable=True,
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
        and water <= inp.target_pv - inp.hyst_low
        and status == PV_AVAILABLE
    ):
        return result(REASON_PV, program=PROGRAM_PV, enable=True, enable_pv=True)

    if program == PROGRAM_PV and water >= inp.target_pv + inp.hyst_high:
        return result(
            REASON_PV_TARGET_REACHED, program=PROGRAM_OFF, enable=False, enable_pv=False
        )

    if program == PROGRAM_MINIMUM and water >= inp.target_min + inp.hyst_low:
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

    if water <= inp.target_normal - inp.hyst_low and is_day and program != PROGRAM_PV:
        return result(
            REASON_NORMAL, program=PROGRAM_NORMAL, enable=True, enable_pv=False
        )

    if water >= inp.target_normal + inp.hyst_high and program != PROGRAM_PV:
        return result(REASON_TARGET_REACHED, program=PROGRAM_OFF, enable=False)

    return result(REASON_NONE)


def lock_active(
    switch_state: str | None, since: float | None, now: float, min_on: float, min_off: float
) -> bool:
    """True while the enable switch was changed so recently that it must not change again.

    A switch that is on must run `min_on` minutes, one that is off must stay off `min_off`
    minutes; both counted from the last change of the switch, whoever made it. Without a
    known change time (first start) or with an unknown switch state nothing is held back.
    """
    if switch_state not in ("on", "off") or since is None:
        return False
    minutes = min_on if switch_state == "on" else min_off
    return minutes > 0 and now - since < minutes * 60


def parse_float(raw: str | None) -> float | None:
    """A state string as a number; None when missing, unknown, unavailable or not numeric."""
    if raw is None or raw in ("unknown", "unavailable", ""):
        return None
    try:
        value = float(raw)
    except ValueError:
        return None
    return value if value == value and abs(value) != float("inf") else None


def build_input(
    read: Callable[[str], str | None],
    config: Mapping[str, Any],
    program: str,
    targets: Mapping[str, float],
    hysteresis: Mapping[str, float] | None = None,
) -> TwwpInput:
    """Collect the readings for `decide` from the configured entities.

    `read` returns an entity's state string (None if the entity does not exist).
    """

    def num(key: str) -> float | None:
        entity = config.get(key)
        return parse_float(read(entity)) if entity else None

    brightness_entity = config.get(CONF_BRIGHTNESS)
    return TwwpInput(
        water=num(CONF_WATER),
        outer=num(CONF_OUTER),
        target_normal=targets.get(TARGET_NORMAL),
        target_pv=targets.get(TARGET_PV),
        target_min=targets.get(TARGET_MIN),
        pv_power=num(CONF_PV_POWER),
        pv_power_avg=num(CONF_PV_POWER_AVG),
        brightness=num(CONF_BRIGHTNESS),
        has_brightness=bool(brightness_entity),
        program=program,
        pv_threshold=config.get(CONF_PV_THRESHOLD, DEFAULT_PV_THRESHOLD),
        frost_below=config.get(CONF_FROST_BELOW, DEFAULT_FROST_BELOW),
        pv_min_outer=config.get(CONF_PV_MIN_OUTER, DEFAULT_PV_MIN_OUTER),
        night_below=config.get(CONF_NIGHT_BELOW, DEFAULT_NIGHT_BELOW),
        day_above=config.get(CONF_DAY_ABOVE, DEFAULT_DAY_ABOVE),
        hyst_low=(hysteresis or {}).get(HYST_LOW, HYSTERESIS_LOW),
        hyst_high=(hysteresis or {}).get(HYST_HIGH, HYSTERESIS_HIGH),
    )


def number_config(minimum: float, maximum: float, step: float, unit: str | None = None) -> dict[str, Any]:
    """Options of a number selector without empty values.

    Home Assistant rejects `unit_of_measurement=None`: the form then fails to
    open with only "400: Bad Request" in the browser and nothing in the log.
    """
    config: dict[str, Any] = {"min": minimum, "max": maximum, "step": step}
    if unit:
        config["unit_of_measurement"] = unit
    return config

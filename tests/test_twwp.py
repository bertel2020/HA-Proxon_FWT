"""Decision logic of the hot water heat pump (same cases as the blueprint simulation)."""
import pytest


@pytest.fixture
def make(twwp):
    base = dict(
        water=45.0, outer=10.0, target_normal=53.0, target_pv=60.0, target_min=42.0,
        pv_power=3000.0, pv_power_avg=2500.0, brightness=1200.0, has_brightness=True,
        program=twwp.PROGRAM_OFF,
    )

    def build(**over):
        return twwp.TwwpInput(**{**base, **over})

    return build


def test_pv_start(twwp, make):
    d = twwp.decide(make())
    assert (d.reason, d.program, d.enable, d.enable_pv, d.pv_status) == (
        twwp.REASON_PV, twwp.PROGRAM_PV, True, True, twwp.PV_AVAILABLE)


def test_pv_needs_both_powers_above_threshold(twwp, make):
    assert twwp.pv_status(make(pv_power_avg=1500.0)) == twwp.PV_NONE  # not strictly above
    assert twwp.pv_status(make(pv_power=None)) == twwp.PV_NONE


def test_pv_blocked_by_cold_top_unit(twwp, make):
    d = twwp.decide(make(outer=3.0))  # PV available, but not above the 5 degC minimum
    assert d.pv_status == twwp.PV_AVAILABLE and d.reason == twwp.REASON_NORMAL
    d = twwp.decide(make(outer=-2.0))
    assert d.pv_status == twwp.PV_TOO_COLD and d.reason == twwp.REASON_NORMAL


def test_pv_target_reached_in_pv_program(twwp, make):
    d = twwp.decide(make(program=twwp.PROGRAM_PV, water=61.0))
    assert (d.reason, d.program, d.enable, d.enable_pv) == (
        twwp.REASON_PV_TARGET_REACHED, twwp.PROGRAM_OFF, False, False)


def test_pv_ends_to_normal(twwp, make):
    d = twwp.decide(make(program=twwp.PROGRAM_PV, pv_power=0.0, pv_power_avg=0.0, water=50.0))
    assert (d.reason, d.program, d.enable, d.enable_pv) == (
        twwp.REASON_PV_END, twwp.PROGRAM_NORMAL, True, False)


def test_normal_start_and_target_reached(twwp, make):
    no_pv = dict(pv_power=0.0, pv_power_avg=0.0)
    d = twwp.decide(make(water=49.0, **no_pv))
    assert (d.reason, d.program, d.enable, d.enable_pv) == (
        twwp.REASON_NORMAL, twwp.PROGRAM_NORMAL, True, False)
    d = twwp.decide(make(water=55.0, **no_pv))
    assert (d.reason, d.program, d.enable) == (twwp.REASON_TARGET_REACHED, twwp.PROGRAM_OFF, False)
    assert twwp.decide(make(water=52.0, **no_pv)).reason == twwp.REASON_NONE  # inside the hysteresis


def test_night_wins_over_target_reached(twwp, make):
    # at night the night rule comes first, so "target reached" never switches the night program off
    d = twwp.decide(make(water=55.0, pv_power=0.0, pv_power_avg=0.0, brightness=100.0))
    assert d.reason == twwp.REASON_NIGHT


def test_night(twwp, make):
    no_pv = dict(pv_power=0.0, pv_power_avg=0.0, brightness=100.0)
    d = twwp.decide(make(water=50.0, **no_pv))
    assert (d.reason, d.program, d.enable, d.enable_pv) == (
        twwp.REASON_NIGHT, twwp.PROGRAM_NIGHT, False, False)
    d = twwp.decide(make(water=40.0, **no_pv))  # below the minimum, minimum wins
    assert (d.reason, d.program, d.enable) == (twwp.REASON_MINIMUM, twwp.PROGRAM_MINIMUM, True)


def test_night_end_in_the_morning(twwp, make):
    d = twwp.decide(make(program=twwp.PROGRAM_NIGHT, brightness=1000.0,
                         pv_power=0.0, pv_power_avg=0.0, water=50.0))
    assert (d.reason, d.program, d.enable) == (twwp.REASON_NIGHT_END, twwp.PROGRAM_OFF, False)


def test_minimum_end(twwp, make):
    d = twwp.decide(make(program=twwp.PROGRAM_MINIMUM, water=46.0, brightness=100.0,
                         pv_power=0.0, pv_power_avg=0.0))
    assert (d.reason, d.program, d.enable) == (twwp.REASON_MINIMUM_END, twwp.PROGRAM_OFF, False)


def test_minimum_does_not_replace_normal_or_pv(twwp, make):
    no_pv = dict(pv_power=0.0, pv_power_avg=0.0, water=40.0)
    assert twwp.decide(make(program=twwp.PROGRAM_NORMAL, **no_pv)).reason != twwp.REASON_MINIMUM


@pytest.mark.parametrize("field", ["water", "target_normal", "target_pv", "target_min"])
def test_failsafe_when_a_value_is_missing(twwp, make, field):
    d = twwp.decide(make(**{field: None}))
    assert (d.reason, d.program, d.enable, d.enable_pv, d.pv_status) == (
        twwp.REASON_SENSOR_UNAVAILABLE, twwp.PROGRAM_OFF, True, False, None)


def test_without_brightness_sensor_it_is_always_day(twwp, make):
    d = twwp.decide(make(has_brightness=False, brightness=None, water=50.0,
                         pv_power=0.0, pv_power_avg=0.0))
    assert d.reason == twwp.REASON_NORMAL


def test_unavailable_brightness_is_neither_day_nor_night(twwp, make):
    d = twwp.decide(make(brightness=None, water=50.0, pv_power=0.0, pv_power_avg=0.0))
    assert d.reason == twwp.REASON_NONE


def test_decision_values_are_known_keys(twwp, make):
    for kw in ({}, {"water": 55.0}, {"program": twwp.PROGRAM_PV}):
        d = twwp.decide(make(**kw))
        assert d.program in (None, *twwp.PROGRAMS)
        assert d.pv_status in (None, *twwp.PV_STATES)


def test_reasons_list_is_complete(twwp):
    constants = {v for k, v in vars(twwp).items() if k.startswith("REASON_") and isinstance(v, str)}
    assert constants == set(twwp.REASONS)


def test_entity_translations_cover_all_states(twwp):
    import json
    from pathlib import Path

    pkg = Path(__file__).resolve().parents[1] / "custom_components" / "proxon_modbus"
    for name in ("strings.json", "translations/en.json", "translations/de.json"):
        entity = json.loads((pkg / name).read_text())["entity"]
        assert set(entity["water_heater"]["twwp"]["state"]) == set(twwp.PROGRAMS)
        assert set(entity["sensor"]["twwp_program"]["state"]) == set(twwp.PROGRAMS)
        assert set(entity["sensor"]["twwp_pv_status"]["state"]) == set(twwp.PV_STATES)
        assert set(entity["sensor"]["twwp_reason"]["state"]) == set(twwp.REASONS)


def test_number_selector_config_has_no_empty_values(twwp):
    # unit_of_measurement=None made the TWWP form fail to open ("400: Bad Request")
    assert twwp.number_config(0, 100000, 1) == {"min": 0, "max": 100000, "step": 1}
    assert twwp.number_config(0, 20000, 100, "W") == {"min": 0, "max": 20000, "step": 100, "unit_of_measurement": "W"}
    assert None not in twwp.number_config(-20, 20, 0.5, None).values()


def test_default_targets_lie_inside_the_target_range(twwp):
    assert twwp.TARGET_MIN_C < twwp.TARGET_MAX_C and twwp.TARGET_STEP > 0
    for value in twwp.DEFAULT_TARGETS.values():
        assert twwp.TARGET_MIN_C <= value <= twwp.TARGET_MAX_C
    assert twwp.DEFAULT_TARGETS[twwp.TARGET_MIN] < twwp.DEFAULT_TARGETS[twwp.TARGET_NORMAL] < twwp.DEFAULT_TARGETS[twwp.TARGET_PV]


def test_hysteresis_is_configurable(twwp, make):
    no_pv = dict(pv_power=0.0, pv_power_avg=0.0)
    # default: heats at target - 3 (50), stops at target + 1 (54)
    assert twwp.decide(make(water=51.0, **no_pv)).reason == twwp.REASON_NONE
    assert twwp.decide(make(water=51.0, hyst_low=1.5, **no_pv)).reason == twwp.REASON_NORMAL  # 51 <= 53 - 1.5
    assert twwp.decide(make(water=54.0, **no_pv)).reason == twwp.REASON_TARGET_REACHED
    assert twwp.decide(make(water=54.0, hyst_high=2.0, **no_pv)).reason == twwp.REASON_NONE  # stops at 55
    assert twwp.decide(make(water=53.0, hyst_high=0.0, **no_pv)).reason == twwp.REASON_TARGET_REACHED  # exactly at the target
    # the PV band uses the same values
    assert twwp.decide(make(water=58.0)).reason != twwp.REASON_PV  # 58 > 60 - 3
    assert twwp.decide(make(water=58.0, hyst_low=2.0)).reason == twwp.REASON_PV  # 58 <= 60 - 2
    # the minimum program ends this far above its target
    ended = twwp.decide(make(program=twwp.PROGRAM_MINIMUM, water=44.0, brightness=100.0, hyst_low=2.0, pv_power=0.0, pv_power_avg=0.0))
    assert ended.reason == twwp.REASON_MINIMUM_END  # 44 >= 42 + 2


def test_hysteresis_defaults_and_ranges(twwp):
    assert twwp.DEFAULT_HYSTERESIS == {twwp.HYST_LOW: 3.0, twwp.HYST_HIGH: 1.0}
    for key, (low, high) in twwp.HYST_RANGE.items():
        assert low <= twwp.DEFAULT_HYSTERESIS[key] <= high
    assert sum(twwp.DEFAULT_HYSTERESIS.values()) >= twwp.MIN_BAND

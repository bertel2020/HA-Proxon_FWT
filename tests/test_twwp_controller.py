"""TWWP controller: observe mode, control mode, persistence, error handling."""
import asyncio

import pytest


class FakeStore:
    def __init__(self, data=None):
        self.data, self.saved = data, []

    async def async_load(self):
        return self.data

    async def async_save(self, data):
        self.saved.append(data)


class Home:
    """Entity states and recorded switch calls."""

    def __init__(self, states):
        self.states, self.calls, self.fail = dict(states), [], set()

    def read(self, entity_id):
        return self.states.get(entity_id)

    async def call(self, entity_id, target):
        if entity_id in self.fail:
            raise RuntimeError("boom")
        self.calls.append((entity_id, target))
        self.states[entity_id] = target


CONFIG = {
    "enable_switch": "switch.freigabe",
    "enable_pv_switch": "switch.freigabe_pv",
    "water_temp": "sensor.wasser",
    "outer_temp": "sensor.oberteil",
    "pv_power": "sensor.pv",
    "pv_power_avg": "sensor.pv_avg",
    "brightness": "sensor.hell",
}
STATES = {
    "switch.freigabe": "off", "switch.freigabe_pv": "off", "sensor.wasser": "45",
    "sensor.oberteil": "10", "sensor.pv": "3000", "sensor.pv_avg": "2500", "sensor.hell": "1200",
}


def make(twwp_controller, config=None, states=None, store=None):
    home = Home(states or STATES)
    ctl = twwp_controller.TwwpController(
        {**CONFIG, **(config or {})}, home.read, home.call, store or FakeStore(), clock=lambda: 1000.0
    )
    return ctl, home


def test_observe_mode_switches_nothing_but_reports(twwp_controller):
    ctl, home = make(twwp_controller)
    asyncio.run(ctl.async_run())
    assert home.calls == []
    assert ctl.state.program == "pv" and ctl.state.pv_status == "pv" and ctl.state.reason == "pv"
    assert ctl.state.planned == [("switch.freigabe", "on"), ("switch.freigabe_pv", "on")]
    assert ctl.state.last_run == 1000.0


def test_plan_only_lists_switches_that_differ(twwp_controller):
    ctl, home = make(twwp_controller, states={**STATES, "switch.freigabe": "on"})
    asyncio.run(ctl.async_run())
    assert ctl.state.planned == [("switch.freigabe_pv", "on")]


def test_control_mode_switches_and_stops_repeating(twwp_controller):
    ctl, home = make(twwp_controller, {"control": True})
    asyncio.run(ctl.async_run())
    assert home.calls == [("switch.freigabe", "on"), ("switch.freigabe_pv", "on")]
    asyncio.run(ctl.async_run())  # already in the wanted state: no repeated telegrams
    assert len(home.calls) == 2 and ctl.state.planned == []


def test_failsafe_leaves_the_heat_pump_to_itself(twwp_controller):
    ctl, home = make(twwp_controller, {"control": True},
                     {**STATES, "switch.freigabe": "off", "switch.freigabe_pv": "on", "sensor.wasser": "unavailable"})
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "sensor_unavailable" and ctl.state.program == "off"
    assert home.calls == [("switch.freigabe", "on"), ("switch.freigabe_pv", "off")]


def test_one_failing_switch_does_not_stop_the_other(twwp_controller):
    ctl, home = make(twwp_controller, {"control": True})
    home.fail.add("switch.freigabe")
    asyncio.run(ctl.async_run())
    assert home.calls == [("switch.freigabe_pv", "on")]
    assert "switch.freigabe" in ctl.state.last_error


def test_target_change_decides_again(twwp_controller):
    ctl, home = make(twwp_controller, states={**STATES, "sensor.pv": "0", "sensor.pv_avg": "0", "sensor.wasser": "46"})
    asyncio.run(ctl.async_run())
    assert ctl.state.program == "normal"  # 46 <= 50 - 3
    asyncio.run(ctl.async_set_target("normal", 40))  # 46 >= 40 + 1: target reached
    assert ctl.state.program == "off" and ctl.state.targets["normal"] == 40.0
    with pytest.raises(KeyError):
        asyncio.run(ctl.async_set_target("nope", 1))


def test_state_is_saved_and_restored(twwp_controller):
    store = FakeStore()
    ctl, _ = make(twwp_controller, store=store)
    asyncio.run(ctl.async_run())
    saved = store.saved[-1]
    assert saved["program"] == "pv" and saved["targets"]["pv"] == 60.0

    store.data = {"program": "night", "pv_status": "too_cold", "targets": {"normal": 55, "pv": "x", "bogus": 1}}
    other, _ = make(twwp_controller, store=store)
    asyncio.run(other.async_load())
    assert other.state.program == "night" and other.state.pv_status == "too_cold"
    assert other.state.targets == {"normal": 55.0, "pv": 60.0, "min": 40.0}

    store.data = {"program": "garbage", "targets": 5}
    third, _ = make(twwp_controller, store=store)
    asyncio.run(third.async_load())
    assert third.state.program == "off"


def test_listeners_are_notified_and_removable(twwp_controller):
    ctl, _ = make(twwp_controller)
    seen = []
    remove = ctl.add_listener(lambda: seen.append(1))
    asyncio.run(ctl.async_run())
    remove()
    asyncio.run(ctl.async_run())
    assert seen == [1]


def test_parse_float_and_build_input(twwp_pure):
    parse = twwp_pure.parse_float
    assert parse("5.5") == 5.5 and parse("-3") == -3.0
    assert parse(None) is None and parse("unavailable") is None and parse("unknown") is None
    assert parse("abc") is None and parse("nan") is None and parse("inf") is None
    inp = twwp_pure.build_input(lambda e: None, {"water_temp": "sensor.w"}, "off", twwp_pure.DEFAULT_TARGETS)
    assert inp.water is None and inp.has_brightness is False and inp.pv_threshold == 1500.0


def test_control_can_be_switched_at_runtime(twwp_controller):
    ctl, home = make(twwp_controller)
    assert ctl.control is False
    asyncio.run(ctl.async_run())
    assert home.calls == []  # observing
    asyncio.run(ctl.async_set_control(True))  # decides again right away and now switches
    assert ctl.control is True
    assert home.calls == [("switch.freigabe", "on"), ("switch.freigabe_pv", "on")]
    asyncio.run(ctl.async_set_control(False))
    assert ctl.control is False


def test_control_is_saved_and_restored(twwp_controller):
    store = FakeStore()
    ctl, _ = make(twwp_controller, store=store)
    asyncio.run(ctl.async_set_control(True))
    assert store.saved[-1]["control"] is True

    other, _ = make(twwp_controller, store=store)
    store.data = store.saved[-1]
    asyncio.run(other.async_load())
    assert other.control is True

    store.data = {"control": "yes"}  # not a bool: ignored, the config value stays
    third, _ = make(twwp_controller, {"control": False}, store=store)
    asyncio.run(third.async_load())
    assert third.control is False


def test_switches_lists_configured_enables(twwp_controller):
    ctl, _ = make(twwp_controller)
    assert ctl.switches == ["switch.freigabe", "switch.freigabe_pv"]
    ctl, _ = make(twwp_controller, {"enable_pv_switch": None})
    assert ctl.switches == ["switch.freigabe"]


def test_hysteresis_changes_the_decision_and_is_kept_inside_its_range(twwp_controller):
    states = {**STATES, "sensor.pv": "0", "sensor.pv_avg": "0", "sensor.wasser": "49"}
    ctl, _ = make(twwp_controller, states=states)
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "none"  # 49 > 50 - 3
    asyncio.run(ctl.async_set_hysteresis("low", 0.2))  # clamped to the range minimum, 1 K
    assert ctl.state.hysteresis["low"] == 1.0 and ctl.state.reason == "normal"  # 49 <= 50 - 1
    asyncio.run(ctl.async_set_hysteresis("high", 99))
    assert ctl.state.hysteresis["high"] == 5.0
    with pytest.raises(KeyError):
        asyncio.run(ctl.async_set_hysteresis("nope", 1))


def test_hysteresis_is_saved_and_restored(twwp_controller):
    store = FakeStore()
    ctl, _ = make(twwp_controller, store=store)
    asyncio.run(ctl.async_set_hysteresis("high", 2))
    assert store.saved[-1]["hysteresis"] == {"low": 3.0, "high": 2.0}
    other, _ = make(twwp_controller, store=store)
    store.data = {"hysteresis": {"low": 4, "high": "x"}}
    asyncio.run(other.async_load())
    assert other.state.hysteresis == {"low": 4.0, "high": 1.0}  # bad values keep the default
    third, _ = make(twwp_controller, store=store)
    store.data = {"hysteresis": {"low": 99}}  # outside the range: ignored
    asyncio.run(third.async_load())
    assert third.state.hysteresis["low"] == 3.0


def test_targets_are_kept_inside_their_range(twwp_controller, twwp_pure):
    lo, hi = twwp_pure.TARGET_MIN_C, twwp_pure.TARGET_MAX_C
    assert hi == 60.0
    ctl, _ = make(twwp_controller)
    asyncio.run(ctl.async_set_target("pv", 99))
    assert ctl.state.targets["pv"] == hi
    asyncio.run(ctl.async_set_target("min", 5))
    assert ctl.state.targets["min"] == lo
    # values saved while the range was wider (up to 70) are brought back
    store = FakeStore({"targets": {"normal": 70, "pv": 61.5, "min": 20}})
    other, _ = make(twwp_controller, store=store)
    asyncio.run(other.async_load())
    assert other.state.targets == {"normal": hi, "pv": hi, "min": lo}


def make_timed(twwp_controller, config, states=None, store=None):
    home = Home(states or STATES)
    now = [1000.0]
    ctl = twwp_controller.TwwpController(
        {**CONFIG, **config}, home.read, home.call, store or FakeStore(), clock=lambda: now[0]
    )
    return ctl, home, now


def test_minimum_run_time_holds_the_switch_off_decision(twwp_controller):
    ctl, home, now = make_timed(twwp_controller, {"min_on_minutes": 10})
    asyncio.run(ctl.async_set_control(True))  # PV: both switches on at t=1000
    assert home.calls == [("switch.freigabe", "on"), ("switch.freigabe_pv", "on")]
    home.states["sensor.pv"] = home.states["sensor.pv_avg"] = "0"  # cloud: PV ends -> normal program wants to go on
    home.states["sensor.wasser"] = "62"  # PV target reached: wants everything off
    home.calls.clear()
    now[0] = 1000 + 599
    asyncio.run(ctl.async_run())
    assert home.calls == [] and ctl.state.reason == "locked" and ctl.state.program == "pv"
    now[0] = 1000 + 601
    asyncio.run(ctl.async_run())
    assert ("switch.freigabe", "off") in home.calls and ctl.state.reason == "pv_target_reached"


def test_minimum_pause_holds_the_switch_on_decision(twwp_controller):
    ctl, home, now = make_timed(twwp_controller, {"min_off_minutes": 5}, states={**STATES, "switch.freigabe": "on", "sensor.wasser": "62"})
    asyncio.run(ctl.async_set_control(True))  # first sighting: no known change, target reached -> off at t=1000
    assert home.calls == [("switch.freigabe", "off")]
    home.states["sensor.wasser"] = "30"  # now it wants to heat again
    home.calls.clear()
    now[0] = 1000 + 200
    asyncio.run(ctl.async_run())
    assert home.calls == [] and ctl.state.reason == "locked"
    now[0] = 1000 + 301
    asyncio.run(ctl.async_run())
    assert ("switch.freigabe", "on") in home.calls


def test_no_lock_without_minutes_and_for_sensor_failure(twwp_controller):
    ctl, home, now = make_timed(twwp_controller, {"min_on_minutes": 0, "min_off_minutes": 0})
    asyncio.run(ctl.async_set_control(True))
    home.states["sensor.wasser"] = "62"
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "pv_target_reached"  # nothing held back
    ctl2, home2, _ = make_timed(twwp_controller, {"min_on_minutes": 60, "min_off_minutes": 60})
    asyncio.run(ctl2.async_set_control(True))
    home2.calls.clear()
    home2.states["sensor.wasser"] = "unavailable"
    asyncio.run(ctl2.async_run())
    assert ctl2.state.reason == "sensor_unavailable" and ("switch.freigabe_pv", "off") in home2.calls  # fail-safe is never held


def test_foreign_switch_change_starts_the_lock(twwp_controller):
    ctl, home, now = make_timed(twwp_controller, {"min_on_minutes": 10}, states={**STATES, "sensor.pv": "0", "sensor.pv_avg": "0", "sensor.wasser": "62"})
    asyncio.run(ctl.async_run())  # observes "off" first
    now[0] = 2000
    home.states["switch.freigabe"] = "on"  # somebody else switched it on
    now[0] = 2060
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "locked" and ctl.state.switch_since == 2060


def test_switch_state_is_saved_and_restored(twwp_controller):
    store = FakeStore()
    ctl, home, now = make_timed(twwp_controller, {"min_on_minutes": 10}, store=store)
    asyncio.run(ctl.async_set_control(True))
    ctl2, _, _ = make_timed(twwp_controller, {"min_on_minutes": 10}, store=FakeStore(store.saved[-1]))
    asyncio.run(ctl2.async_load())
    assert ctl2.state.switch_state == "on" and ctl2.state.switch_since == 1000.0


def test_lock_is_on_by_default(twwp_controller):
    ctl, home, now = make_timed(twwp_controller, {})  # no minutes configured: 10 minutes each
    asyncio.run(ctl.async_set_control(True))
    home.states["sensor.wasser"] = "62"
    now[0] = 1000 + 300
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "locked"
    now[0] = 1000 + 601
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "pv_target_reached"

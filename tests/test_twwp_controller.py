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


def test_failsafe_switches_off(twwp_controller):
    ctl, home = make(twwp_controller, {"control": True},
                     {**STATES, "switch.freigabe": "on", "sensor.wasser": "unavailable"})
    asyncio.run(ctl.async_run())
    assert ctl.state.reason == "sensor_unavailable" and ctl.state.program == "off"
    assert home.calls == [("switch.freigabe", "off")]


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

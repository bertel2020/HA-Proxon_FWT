"""Coordinator behaviour (boost, PTC mask, stats saving, link errors) without Home Assistant.

Home Assistant is not installed for these tests (and `pytest-homeassistant-custom-component` needs a
newer Python than this project's dev setup), so the few HA modules the coordinator imports are replaced
by small stand-ins, and the package is loaded without running its `__init__.py`.
"""
import asyncio
import importlib
import sys
import time
import types
from datetime import datetime, timezone
from pathlib import Path

import pytest

PKG_DIR = Path(__file__).resolve().parents[1] / "custom_components" / "proxon_modbus"


class HomeAssistantError(Exception):
    pass


class ServiceValidationError(HomeAssistantError):
    pass


class UpdateFailed(Exception):
    pass


class FakeStore:
    instances: list = []

    def __init__(self, hass, version, key):
        self.key, self.delay_saves, self.saves = key, [], []
        FakeStore.instances.append(self)

    async def async_load(self):
        return None

    def async_delay_save(self, data_func, delay=0):
        self.delay_saves.append(delay)

    async def async_save(self, data):
        self.saves.append(data)


class FakeDataUpdateCoordinator:
    def __init__(self, hass, logger, *, config_entry=None, name=None, update_interval=None):
        self.hass, self.config_entry, self.data = hass, config_entry, None

    def __class_getitem__(cls, item):
        return cls

    def async_update_listeners(self):
        pass

    async def async_request_refresh(self):
        pass


def _install_stubs():
    def mod(name, **attrs):
        m = types.ModuleType(name)
        m.__dict__.update(attrs)
        sys.modules[name] = m
        return m

    class IssueSeverity:
        WARNING, ERROR = "warning", "error"

    ha = mod("homeassistant")
    mod("homeassistant.const", CONF_HOST="host", CONF_PORT="port", CONF_NAME="name")
    mod("homeassistant.config_entries", ConfigEntry=object)
    mod("homeassistant.core", CALLBACK_TYPE=object, HomeAssistant=object, callback=lambda f: f)
    mod("homeassistant.exceptions", HomeAssistantError=HomeAssistantError, ServiceValidationError=ServiceValidationError)
    helpers = mod("homeassistant.helpers")
    issues = mod("homeassistant.helpers.issue_registry", IssueSeverity=IssueSeverity,
                 async_create_issue=lambda *a, **k: None, async_delete_issue=lambda *a, **k: None)
    helpers.issue_registry = issues
    mod("homeassistant.helpers.event", async_call_later=lambda hass, delay, cb: (lambda: None))
    mod("homeassistant.helpers.storage", Store=FakeStore)
    mod("homeassistant.helpers.update_coordinator", DataUpdateCoordinator=FakeDataUpdateCoordinator, UpdateFailed=UpdateFailed)
    util = mod("homeassistant.util")
    util.dt = mod("homeassistant.util.dt", utcnow=lambda: datetime.now(timezone.utc), now=datetime.now,
                  utc_from_timestamp=lambda ts: datetime.fromtimestamp(ts, timezone.utc))
    ha.helpers, ha.util = helpers, util

    class ModbusError(Exception):
        pass

    mod("modbus_connection", ModbusError=ModbusError, ModbusSerialParams=object, ModbusTcpParams=object, ModbusUnit=object)


@pytest.fixture(scope="module")
def coord():
    _install_stubs()
    pkg = types.ModuleType("proxon_pkg")
    pkg.__path__ = [str(PKG_DIR)]
    sys.modules["proxon_pkg"] = pkg
    module = importlib.import_module("proxon_pkg.coordinator")
    module.WRITE_SETTLE_DELAY = 0
    return module


class FakeHub:
    def __init__(self, hub_error):
        self.writes, self.fail_on, self.reads, self.hub_error = [], set(), 0, hub_error

    async def async_write_register(self, address, value):
        if address in self.fail_on:
            raise self.hub_error(f"write {address} rejected")
        self.writes.append((address, value))

    async def async_read_holding_registers(self, address, count):
        self.reads += 1
        err = self.hub_error("link down")
        err.__cause__ = TimeoutError("timeout")
        raise err


class Entry:
    entry_id = "e1"
    title = "Proxon"
    options = {}


def make(coord):
    from proxon_pkg.hub import ProxonModbusError  # noqa: PLC0415

    hub = FakeHub(ProxonModbusError)
    c = coord.ProxonModbusCoordinator(object(), Entry(), hub, 2, 0, 0, 30)
    c.data = coord.ProxonData(rooms={}, ptc_enable_mask=0)
    return c, hub


def fan_state(c, mode=1, stage=2, auto=True, intensive=False, caps=None):
    c.data.function_block = {"operating_mode_read": mode, "fan_stage_read": stage, "fan_auto_read": int(auto),
                             "fan_intensive_read": int(intensive)}
    c.data.capabilities = caps or {}


def run(coro):
    return asyncio.run(coro)


def test_parallel_ptc_switches_keep_each_others_bits(coord):
    c, hub = make(coord)

    async def go():
        await asyncio.gather(c.async_set_ptc_enable(0, True), c.async_set_ptc_enable(1, True))

    run(go())
    assert [v for _, v in hub.writes] == [0b01, 0b11]


def test_stage_boost_roundtrip_restores_stage_and_auto(coord):
    c, hub = make(coord)
    fan_state(c, mode=1, stage=2, auto=True)

    async def go():
        await c.async_start_boost(15)
        assert c.boost.active
        await c.async_end_boost()

    run(go())
    assert hub.writes == [(coord.REG_FAN_AUTO_WRITE, 0), (coord.REG_FAN_STAGE_WRITE, 4),
                          (coord.REG_FAN_STAGE_WRITE, 2), (coord.REG_FAN_AUTO_WRITE, 1)]
    assert not c.boost.active


def test_failed_boost_start_switches_the_automatic_back_on(coord):
    c, hub = make(coord)
    fan_state(c, mode=1, stage=2, auto=True)
    hub.fail_on = {coord.REG_FAN_STAGE_WRITE}

    with pytest.raises(Exception, match="rejected"):
        run(c.async_start_boost(15))
    assert hub.writes == [(coord.REG_FAN_AUTO_WRITE, 0), (coord.REG_FAN_AUTO_WRITE, 1)]
    assert not c.boost.active


def test_stage_boost_does_not_write_back_after_mode_change(coord):
    c, hub = make(coord)
    fan_state(c, mode=1, stage=2, auto=False)
    run(c.async_start_boost(15))
    hub.writes.clear()
    fan_state(c, mode=3, stage=4, auto=False)  # operating mode changed to comfort meanwhile
    run(c.async_end_boost())
    assert hub.writes == []
    assert not c.boost.active


def test_intensive_boost_keeps_an_already_active_intensive_ventilation(coord):
    c, hub = make(coord)
    fan_state(c, mode=3, intensive=True, caps={"intensive_ventilation_selectable": True})
    run(c.async_start_boost(15))
    run(c.async_end_boost())
    assert hub.writes == []

    c2, hub2 = make(coord)
    fan_state(c2, mode=3, intensive=False, caps={"intensive_ventilation_selectable": True})
    run(c2.async_start_boost(15))
    run(c2.async_end_boost())
    assert hub2.writes == [(coord.REG_FAN_INTENSIVE_WRITE, 1), (coord.REG_FAN_INTENSIVE_WRITE, 0)]


def test_boost_end_is_given_up_after_repeated_failures(coord):
    c, hub = make(coord)
    fan_state(c, mode=1, stage=2, auto=False)
    run(c.async_start_boost(15))
    hub.fail_on = {coord.REG_FAN_STAGE_WRITE}
    for _ in range(coord.BOOST_END_MAX_RETRIES - 1):
        with pytest.raises(Exception, match="rejected"):
            run(c.async_end_boost())
        assert c.boost.active
    with pytest.raises(Exception, match="rejected"):
        run(c.async_end_boost())
    assert not c.boost.active


def test_stats_are_saved_at_most_every_interval(coord):
    c, _ = make(coord)
    data = coord.ProxonData(rooms={})
    store = c._store
    for _ in range(10):
        c._track_stats(data)
    assert len(store.delay_saves) == 1
    c._stats_saved_at -= coord.STATS_SAVE_INTERVAL + 1
    c._track_stats(data)
    assert len(store.delay_saves) == 2


def test_poll_stops_after_two_link_errors(coord):
    c, hub = make(coord)
    with pytest.raises(Exception, match="link down"):
        run(c._async_read_all())
    assert hub.reads == 2  # not one timeout per remaining block


def test_capability_flags_block_only_explicit_refusals(coord):
    c, _ = make(coord)
    c.data.capabilities = {"fan_off_selectable": False, "fan_auto_selectable": True}
    with pytest.raises(ServiceValidationError):
        c.ensure_selectable("fan_off_selectable")
    c.ensure_selectable("fan_auto_selectable")
    c.ensure_selectable("unknown_flag")


def test_ptc_write_refused_when_mask_unknown(coord):
    c, hub = make(coord)
    c.data.ptc_enable_mask = None
    with pytest.raises(Exception):
        run(c.async_set_ptc_enable(0, True))
    assert hub.writes == []


def test_boost_end_is_retried_when_function_block_unreadable(coord):
    c, hub = make(coord)
    fan_state(c, mode=1, stage=2, auto=True)
    run(c.async_start_boost(15))
    c.data.function_block = {}
    c.data.failed = {coord.BLOCK_FUNCTION}
    with pytest.raises(Exception):
        run(c.async_end_boost())
    assert c.boost.active  # not given up: retried later

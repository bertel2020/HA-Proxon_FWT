"""Integration tests that run the real integration inside a (test) Home Assistant.

They need `pytest-homeassistant-custom-component` (see requirements_test.txt) and therefore a newer
Python than the stub-based unit tests; run them with `python -m pytest tests/integration`.
The Modbus unit is replaced by a small in-memory fake that behaves like the device's register map.
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.proxon_modbus import const  # noqa: E402

# a write register and the register the device reports the new value in
MIRRORS = {
    const.REG_COOLING_ENABLE_WRITE: const.REG_COOLING_ENABLE_READ,
    const.REG_FAN_STAGE_WRITE: const.REG_FAN_STAGE_READ,
    const.REG_FAN_AUTO_WRITE: const.REG_FAN_AUTO_READ,
    const.REG_FAN_INTENSIVE_WRITE: const.REG_FAN_INTENSIVE_READ,
    const.REG_OPERATING_MODE_WRITE: const.REG_OPERATING_MODE_READ,
    const.REG_PTC_ENABLE_WRITE: const.REG_PTC_ENABLE_READ,
}


class FakeUnit:
    """In-memory stand-in for a `modbus_connection` unit."""

    def __init__(self) -> None:
        self.regs: dict[int, int] = {}
        self.writes: list[tuple[int, int]] = []
        self.fail = False
        self.regs.update({
            const.REG_TEMP_SUPPLY_AIR: 194, const.REG_TEMP_EXTRACT_AIR: 213, const.REG_TEMP_EXHAUST_AIR: 62,
            const.REG_TEMP_FRESH_AIR: 41, const.REG_TEMP_OUTSIDE: 41, const.REG_POWER_CONSUMPTION: 4500,
            const.REG_ROOM_TEMP_BASE: 215, const.REG_ROOM_TEMP_BASE + 1: 205,
            const.REG_ROOM_SETPOINT_READ_BASE: 220, const.REG_ROOM_SETPOINT_READ_BASE + 1: 210,
            const.REG_ROOM_MID_TEMP_BASE: 210,
            const.REG_OPERATING_MODE_READ: 1, const.REG_FAN_STAGE_READ: 2, const.REG_FAN_AUTO_READ: 1,
            const.REG_CAPABILITY_FLAGS: 0xFFFF,
            const.REG_CO2_BASE: 650, const.REG_RF_BASE: 45,
        })

    async def read_holding_registers(self, address: int, count: int) -> list[int]:
        if self.fail:
            raise TimeoutError("device not reachable")
        return [self.regs.get(address + i, 0) for i in range(count)]

    async def write_register(self, address: int, value: int) -> None:
        if self.fail:
            raise TimeoutError("device not reachable")
        self.writes.append((address, value))
        self.regs[address] = value
        if address in MIRRORS:
            self.regs[MIRRORS[address]] = value


@pytest.fixture(autouse=True)
def _enable(enable_custom_integrations):
    """Let Home Assistant find `custom_components/proxon_modbus`."""


@pytest.fixture(autouse=True)
def _no_settle_delay():
    """The device needs a moment after a write; the fake does not."""
    with patch("custom_components.proxon_modbus.coordinator.WRITE_SETTLE_DELAY", 0):
        yield


@pytest.fixture
def unit():
    """The fake device; the integration gets it instead of a real Modbus connection for the whole test."""
    fake = FakeUnit()
    with patch("custom_components.proxon_modbus.async_get_unit", return_value=fake):
        yield fake


@pytest.fixture
def entry_data():
    return {
        const.CONF_CONNECTION_TYPE: const.CONNECTION_TYPE_TCP,
        "name": "Proxon FWT",
        "host": "192.0.2.10",
        "port": 502,
        const.CONF_UNIT_ID: 10,
    }


@pytest.fixture
def entry(hass, entry_data):
    config_entry = MockConfigEntry(
        domain=const.DOMAIN,
        data=entry_data,
        options={const.CONF_NUM_ROOMS: 2, const.CONF_ROOM_NAMES: ["Wohnen", "Schlafen"]},
        title="Proxon",
        entry_id="e1",
    )
    config_entry.add_to_hass(hass)
    return config_entry


@pytest.fixture
async def setup_integration(hass, entry, unit):
    """Set the entry up against the fake unit."""

    async def _setup() -> MockConfigEntry:
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup

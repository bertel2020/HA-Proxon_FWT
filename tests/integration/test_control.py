"""Writing to the unit through the entities and services, against the fake register map."""
from __future__ import annotations

import pytest
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError

from custom_components.proxon_modbus import const

PTC_WRITE = const.REG_PTC_ENABLE_WRITE


async def call(hass, domain, service, data, blocking=True):
    await hass.services.async_call(domain, service, data, blocking=blocking)
    await hass.async_block_till_done()


async def test_climate_writes_the_setpoint_of_its_room(hass, setup_integration, unit):
    await setup_integration()
    await call(hass, "climate", "set_temperature", {"entity_id": "climate.wohnen", "temperature": 23})
    await call(hass, "climate", "set_temperature", {"entity_id": "climate.schlafen", "temperature": 20})
    assert (const.REG_ROOM_SETPOINT_WRITE_BASE, 23) in unit.writes
    assert (const.REG_ROOM_SETPOINT_WRITE_BASE + 1, 20) in unit.writes


async def test_ptc_switches_keep_each_others_bits(hass, setup_integration, unit):
    await setup_integration()
    await call(hass, "switch", "turn_on", {"entity_id": "switch.wohnen_ptc_element_enabled"})
    await call(hass, "switch", "turn_on", {"entity_id": "switch.schlafen_ptc_element_enabled"})
    assert [v for a, v in unit.writes if a == PTC_WRITE] == [0b01, 0b11]
    assert hass.states.get("switch.wohnen_ptc_element_enabled").state == "on"
    await call(hass, "switch", "turn_off", {"entity_id": "switch.wohnen_ptc_element_enabled"})
    assert unit.writes[-1] == (PTC_WRITE, 0b10)


async def test_selects_write_their_registers(hass, setup_integration, unit):
    await setup_integration()
    await call(hass, "select", "select_option", {"entity_id": "select.proxon_fwt_fan_stage", "option": "stage_3"})
    assert unit.writes[-1] == (const.REG_FAN_STAGE_WRITE, 3)
    assert hass.states.get("select.proxon_fwt_fan_stage").state == "stage_3"


async def test_capability_flags_refuse_unselectable_options(hass, setup_integration, unit):
    unit.regs[const.REG_CAPABILITY_FLAGS] = 0xFFFF & ~(1 << 5)  # fan stage 4 not selectable
    await setup_integration()
    with pytest.raises(ServiceValidationError):
        await call(hass, "select", "select_option", {"entity_id": "select.proxon_fwt_fan_stage", "option": "stage_4"})
    assert not [w for w in unit.writes if w[0] == const.REG_FAN_STAGE_WRITE]


async def test_failed_write_raises_and_is_reported(hass, setup_integration, unit):
    entry = await setup_integration()
    unit.fail = True
    with pytest.raises(HomeAssistantError):
        await call(hass, "select", "select_option", {"entity_id": "select.proxon_fwt_fan_stage", "option": "stage_3"})
    assert entry.runtime_data.last_write_error is not None


async def test_boost_with_intensive_ventilation(hass, setup_integration, unit):
    await setup_integration()
    boost = "switch.proxon_fwt_boost_ventilation"
    await call(hass, "proxon_modbus", "start_boost", {"entity_id": boost, "minutes": 10})
    assert hass.states.get(boost).state == "on"
    assert unit.writes == [(const.REG_FAN_INTENSIVE_WRITE, 1)]
    await call(hass, "switch", "turn_off", {"entity_id": boost})
    assert hass.states.get(boost).state == "off"
    assert unit.writes[-1] == (const.REG_FAN_INTENSIVE_WRITE, 0)


async def test_boost_with_stage_returns_the_previous_stage_and_automatic(hass, setup_integration, unit):
    unit.regs[const.REG_CAPABILITY_FLAGS] = 0xFFFF & ~(1 << 7)  # no intensive ventilation: boost via fan stage 4
    unit.regs[const.REG_OPERATING_MODE_READ] = 1  # eco
    await setup_integration()
    boost = "switch.proxon_fwt_boost_ventilation"
    await call(hass, "proxon_modbus", "start_boost", {"entity_id": boost, "minutes": 10})
    assert unit.writes == [(const.REG_FAN_AUTO_WRITE, 0), (const.REG_FAN_STAGE_WRITE, 4)]
    await call(hass, "switch", "turn_off", {"entity_id": boost})
    assert unit.writes[-2:] == [(const.REG_FAN_STAGE_WRITE, 2), (const.REG_FAN_AUTO_WRITE, 1)]
    assert hass.states.get(boost).state == "off"


async def test_start_boost_on_another_switch_is_a_clear_error(hass, setup_integration):
    await setup_integration()
    with pytest.raises(ServiceValidationError, match="boost"):
        await call(hass, "proxon_modbus", "start_boost", {"entity_id": "switch.proxon_fwt_cooling_enabled"})

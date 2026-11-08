"""A boost that was running when Home Assistant stopped is taken over, finished on time or ended right away."""
from __future__ import annotations

import time
from datetime import timedelta

from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.proxon_modbus import const

BOOST = "switch.proxon_fwt_boost_ventilation"
KEY = f"{const.DOMAIN}.e1.boost"


def stored(hass_storage, **data):
    hass_storage[KEY] = {"version": 1, "minor_version": 1, "key": KEY, "data": data}


def eco_stage_unit(unit):
    unit.regs[const.REG_CAPABILITY_FLAGS] = 0xFFFF & ~(1 << 7)  # no intensive ventilation: stage boost
    unit.regs[const.REG_OPERATING_MODE_READ] = 1  # eco
    unit.regs[const.REG_FAN_STAGE_READ] = 4  # the unit is at the boost stage


async def test_running_boost_is_taken_over_and_ends_on_time(hass, setup_integration, unit, hass_storage):
    eco_stage_unit(unit)
    stored(hass_storage, until=time.time() + 600, kind="stage", stage=2, auto=True)
    entry = await setup_integration()
    assert entry.runtime_data.boost.active
    assert hass.states.get(BOOST).state == "on"
    assert unit.writes == []  # taking over writes nothing

    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(minutes=11))
    await hass.async_block_till_done()
    assert unit.writes == [(const.REG_FAN_STAGE_WRITE, 2), (const.REG_FAN_AUTO_WRITE, 1)]
    assert not entry.runtime_data.boost.active
    assert hass.states.get(BOOST).state == "off"


async def test_expired_boost_is_ended_shortly_after_the_start(hass, setup_integration, unit, hass_storage):
    eco_stage_unit(unit)
    stored(hass_storage, until=time.time() - 3600, kind="stage", stage=3, auto=False)
    entry = await setup_integration()
    assert entry.runtime_data.boost.active  # not yet: the end is scheduled a few seconds out

    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=10))
    await hass.async_block_till_done()
    assert unit.writes == [(const.REG_FAN_STAGE_WRITE, 3)]
    assert not entry.runtime_data.boost.active


async def test_unusable_stored_boost_is_ignored(hass, setup_integration, unit, hass_storage):
    stored(hass_storage, until="soon", kind="warp", stage=9)
    entry = await setup_integration()
    assert not entry.runtime_data.boost.active
    assert hass.states.get(BOOST).state == "off"
    assert unit.writes == []

"""Config flow (TCP), reconfigure and options flow."""
from __future__ import annotations

from contextlib import asynccontextmanager
from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType

from custom_components.proxon_modbus import const

TCP = {"name": "Proxon FWT", "host": "192.0.2.20", "port": 502, "unit_id": 10}


def patch_temporary_unit(unit):
    @asynccontextmanager
    async def fake(hass, params, unit_id):
        yield unit

    return patch("custom_components.proxon_modbus.config_flow.async_get_temporary_unit", fake)


def names_input(result, *room_names):
    """Submit the names form with these room names (an empty name would mean "room not installed")."""
    values = {f"room_{i}": name for i, name in enumerate(room_names, 1)}
    values.update({f"room_{i}_sensors": {} for i in range(1, len(room_names) + 1)})
    return result["data_schema"](values)


async def run_to_names(hass, unit):
    result = await hass.config_entries.flow.async_init(const.DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.MENU
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"next_step_id": "tcp"})
    with patch_temporary_unit(unit):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], TCP)
    assert result["step_id"] == "rooms"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {const.CONF_NUM_ROOMS: 3, const.CONF_NUM_CO2_SENSORS: 1, const.CONF_NUM_RF_SENSORS: 0,
         const.CONF_SCAN_INTERVAL: 30, const.CONF_COOLING_AVAILABLE: True, const.CONF_OUTDOOR_SIDE: "left"},
    )
    assert result["step_id"] == "names"
    return result


async def test_user_flow_creates_the_entry(hass, unit):
    result = await run_to_names(hass, unit)
    result = await hass.config_entries.flow.async_configure(result["flow_id"], names_input(result, "Wohnen", "Gast", "Schlafen"))
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Proxon FWT"
    assert result["data"] == {const.CONF_CONNECTION_TYPE: "tcp", "name": "Proxon FWT", "host": "192.0.2.20",
                              "port": 502, "unit_id": 10}
    assert result["options"][const.CONF_NUM_ROOMS] == 3
    assert result["options"][const.CONF_ROOM_NAMES] == ["Wohnen", "Gast", "Schlafen"]
    await hass.async_block_till_done()
    entry = hass.config_entries.async_entries(const.DOMAIN)[0]
    assert entry.state is config_entries.ConfigEntryState.LOADED
    assert len(hass.states.async_entity_ids("climate")) == 3


async def test_unreachable_gateway_shows_an_error(hass, unit):
    result = await hass.config_entries.flow.async_init(const.DOMAIN, context={"source": config_entries.SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"next_step_id": "tcp"})
    unit.fail = True
    with patch_temporary_unit(unit):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], TCP)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "cannot_connect"}


async def test_the_same_gateway_cannot_be_added_twice(hass, entry, unit, setup_integration):
    await setup_integration()
    hass.config_entries.async_update_entry(entry, unique_id="tcp_192.0.2.20_502_10")
    result = await hass.config_entries.flow.async_init(const.DOMAIN, context={"source": config_entries.SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"next_step_id": "tcp"})
    with patch_temporary_unit(unit):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], TCP)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_reconfigure_updates_host_and_title(hass, entry, unit, setup_integration):
    await setup_integration()
    result = await entry.start_reconfigure_flow(hass)
    assert result["type"] is FlowResultType.MENU
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"next_step_id": "tcp"})
    with patch_temporary_unit(unit):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {**TCP, "name": "Lüftung", "host": "192.0.2.99"}
        )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"
    assert entry.data["host"] == "192.0.2.99"
    assert entry.title == "Lüftung"


async def test_options_flow_changes_room_count_and_reloads(hass, entry, unit, setup_integration):
    await setup_integration()
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["step_id"] == "init"
    values = result["data_schema"]({})
    values[const.CONF_NUM_ROOMS] = 1
    result = await hass.config_entries.options.async_configure(result["flow_id"], values)
    assert result["step_id"] == "names"
    result = await hass.config_entries.options.async_configure(result["flow_id"], names_input(result, "Wohnen"))
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options[const.CONF_NUM_ROOMS] == 1
    assert hass.states.async_entity_ids("climate") == ["climate.wohnen"]  # the dropped room is gone, not unavailable

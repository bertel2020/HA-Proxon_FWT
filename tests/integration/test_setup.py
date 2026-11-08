"""Setting the integration up and taking it down again: devices, entities, panel, served frontend files, storage."""
from __future__ import annotations

from homeassistant.components import frontend
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import device_registry as dr, entity_registry as er

from custom_components.proxon_modbus.const import CONF_CO2_NAMES, CONF_NUM_CO2_SENSORS, DOMAIN

VERSION = "2.1.0"


async def test_setup_creates_devices_and_entities(hass, setup_integration):
    entry = await setup_integration()
    assert entry.state is ConfigEntryState.LOADED

    devices = dr.async_entries_for_config_entry(dr.async_get(hass), entry.entry_id)
    assert {d.name for d in devices} == {"Proxon FWT", "Wohnen", "Schlafen"}
    central = next(d for d in devices if d.name == "Proxon FWT")
    assert {d.via_device_id for d in devices if d is not central} == {central.id}
    assert entry.runtime_data.central_device_id == central.id
    entities = er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id)
    assert len(entities) > 40
    assert hass.states.get("climate.wohnen").attributes["current_temperature"] == 21.5
    assert hass.states.get("sensor.proxon_fwt_supply_air_temperature").state == "19.4"


async def test_panel_and_card_module_are_registered(hass, setup_integration):
    await setup_integration()
    assert hass.data[DOMAIN]["module_url"] == f"/{DOMAIN}/{VERSION}/proxon-fwt-card.js"
    assert "proxon-fwt" in hass.data[frontend.DATA_PANELS]
    assert hass.data[frontend.DATA_EXTRA_MODULE_URL].urls  # the card module is loaded in the frontend


async def test_frontend_files_are_served_under_the_versioned_path(hass, hass_client, setup_integration):
    await setup_integration()
    client = await hass_client()
    for path in (
        f"/{DOMAIN}/{VERSION}/proxon-fwt-card.js",
        f"/{DOMAIN}/{VERSION}/lib/base.js",
        f"/{DOMAIN}/{VERSION}/lib/panel.js",
        f"/{DOMAIN}/{VERSION}/lib/text.js",
        f"/{DOMAIN}/proxon-fwt-card.js",  # legacy manual resource
        f"/{DOMAIN}/lib/base.js",
    ):
        resp = await client.get(path)
        assert resp.status == 200, path
        assert "javascript" in resp.headers["Content-Type"], path
    assert (await client.get(f"/{DOMAIN}/{VERSION}/lib/does-not-exist.js")).status == 404


async def test_websocket_settings(hass, hass_ws_client, setup_integration):
    entry = await setup_integration()
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": f"{DOMAIN}/settings"})
    result = (await ws.receive_json())["result"]
    assert len(result) == 1
    central = dr.async_get(hass).async_get_device_by_identifier((DOMAIN, entry.entry_id), entry.entry_id)
    assert result[0]["device_id"] == central.id
    assert result[0]["outdoor_side"] == "left"


async def test_reload_keeps_the_panel_and_saves_the_statistics(hass, setup_integration, hass_storage):
    entry = await setup_integration()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert entry.state is ConfigEntryState.NOT_LOADED
    assert f"{DOMAIN}.{entry.entry_id}.stats" in hass_storage
    assert "proxon-fwt" in hass.data[frontend.DATA_PANELS]  # not removed on unload


async def test_removing_the_entry_removes_panel_and_storage(hass, setup_integration, hass_storage):
    entry = await setup_integration()
    await hass.config_entries.async_unload(entry.entry_id)
    assert f"{DOMAIN}.{entry.entry_id}.stats" in hass_storage
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert f"{DOMAIN}.{entry.entry_id}.stats" not in hass_storage
    assert "proxon-fwt" not in hass.data[frontend.DATA_PANELS]


async def test_unreachable_device_retries_the_setup(hass, entry, unit):
    unit.fail = True
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.SETUP_RETRY


async def test_dropped_sensors_are_removed_from_the_registry(hass, entry, setup_integration):
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, CONF_NUM_CO2_SENSORS: 2, CONF_CO2_NAMES: ["CO2 A", "CO2 B"]}
    )
    await setup_integration()
    registry = er.async_get(hass)

    def co2_ids() -> set[str]:
        return {e.unique_id for e in er.async_entries_for_config_entry(registry, entry.entry_id) if "co2" in e.unique_id}

    assert len(co2_ids()) == 2

    hass.config_entries.async_update_entry(
        entry, options={**entry.options, CONF_NUM_CO2_SENSORS: 1, CONF_CO2_NAMES: ["CO2 A"]}
    )
    await hass.async_block_till_done()  # the options listener reloads the entry
    assert len(co2_ids()) == 1

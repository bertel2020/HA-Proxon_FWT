"""The Proxon FWT Modbus integration."""
from __future__ import annotations

from pathlib import Path

import voluptuous as vol
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.frontend import add_extra_js_url, async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.modbus import async_get_unit
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv, device_registry as dr
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import (
    CONF_NUM_CO2_SENSORS,
    CONF_ROOM_CO2_ENTITIES,
    CONF_ROOM_RF_ENTITIES,
    CONF_NUM_ROOMS,
    CONF_NUM_RF_SENSORS,
    CONF_FILTER_INTERVAL,
    CONF_RECIRC_FILTER,
    DEFAULT_RECIRC_FILTER,
    CONF_OUTDOOR_ENTITY,
    DEFAULT_FILTER_INTERVAL,
    CONF_OUTDOOR_SIDE,
    CONF_POWER_ENTITY,
    CONF_ROOM_AREAS,
    CONF_ROOM_NAMES,
    CONF_SCAN_INTERVAL,
    CONF_UNIT_ID,
    DEFAULT_NUM_CO2_SENSORS,
    DEFAULT_NUM_ROOMS,
    DEFAULT_NUM_RF_SENSORS,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
)
from .coordinator import ProxonModbusCoordinator
from .hub import ProxonModbusHub, params_from_entry_data

PLATFORMS: list[Platform] = [
    Platform.CLIMATE,
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.SWITCH,
    Platform.SELECT,
    Platform.BUTTON,
]

ProxonConfigEntry = ConfigEntry[ProxonModbusCoordinator]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

CARD_FILENAME = "proxon-fwt-card.js"
CARD_URL = f"/{DOMAIN}/{CARD_FILENAME}"
PANEL_PATH = "proxon-fwt"
PANEL_ELEMENT = "proxon-fwt-panel"


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/settings"})
@callback
def _ws_settings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Return the dashboard settings (options) of every loaded entry.

    The card and side panel read this once so the options chosen in the
    integration apply in every browser. `device_id` identifies the unit's
    central device, which is how the frontend matches settings to a unit.
    """
    registry = dr.async_get(hass)
    result = []
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        device = registry.async_get_device(identifiers={(DOMAIN, entry.entry_id)})
        rooms = []
        for kind, key in (("co2", CONF_ROOM_CO2_ENTITIES), ("rf", CONF_ROOM_RF_ENTITIES)):
            for i, ent in enumerate(entry.options.get(key, [])):
                if not ent:
                    continue
                room_dev = registry.async_get_device(identifiers={(DOMAIN, f"{entry.entry_id}_room_{i}")})
                if room_dev:
                    rooms.append({"device_id": room_dev.id, kind: ent})
        result.append(
            {
                "device_id": device.id if device else None,
                "room_sensors": rooms,
                "outdoor_side": entry.options.get(CONF_OUTDOOR_SIDE, "left"),
                "power_entity": entry.options.get(CONF_POWER_ENTITY),
                "outdoor_entity": entry.options.get(CONF_OUTDOOR_ENTITY),
                "filter_interval": entry.options.get(CONF_FILTER_INTERVAL, DEFAULT_FILTER_INTERVAL),
                "recirc_filter": entry.options.get(CONF_RECIRC_FILTER, DEFAULT_RECIRC_FILTER),
            }
        )
    connection.send_result(msg["id"], result)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the bundled dashboard card and load it in the frontend.

    The card is a single JS file shipped with the integration, so it is
    available as `custom:proxon-fwt-card` without adding a Lovelace resource.
    The integration version is appended as a query string so the browser
    fetches the new file after an update.
    """
    websocket_api.async_register_command(hass, _ws_settings)
    integration = await async_get_integration(hass, DOMAIN)
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                CARD_URL,
                str(Path(__file__).parent / "www" / CARD_FILENAME),
                cache_headers=False,
            ),
            StaticPathConfig(
                f"/{DOMAIN}/icon.png",
                str(Path(__file__).parent / "brand" / "icon@2x.png"),
                cache_headers=True,
            ),
        ]
    )
    module_url = f"{CARD_URL}?v={integration.version}"
    add_extra_js_url(hass, module_url)
    hass.data.setdefault(DOMAIN, {})["module_url"] = module_url
    return True


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Add the "Proxon FWT" side panel (once, however many entries exist)."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get("panel_registered"):
        return
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_ELEMENT,
        frontend_url_path=PANEL_PATH,
        module_url=domain_data["module_url"],
        sidebar_title="Proxon FWT",
        sidebar_icon="mdi:heat-pump",
        require_admin=False,
        embed_iframe=False,
    )
    domain_data["panel_registered"] = True


async def async_setup_entry(hass: HomeAssistant, entry: ProxonConfigEntry) -> bool:
    """Set up Proxon FWT from a config entry."""
    data = entry.data
    options = entry.options

    # Requesting a unit performs no I/O: the shared connection opens lazily on
    # the first read, so a powered-down gateway surfaces as ConfigEntryNotReady
    # from the first coordinator refresh below.
    unit = async_get_unit(
        hass,
        entry,
        params_from_entry_data(data),
        int(data[CONF_UNIT_ID]),
    )
    hub = ProxonModbusHub(unit)

    coordinator = ProxonModbusCoordinator(
        hass,
        entry,
        hub,
        num_rooms=options.get(CONF_NUM_ROOMS, DEFAULT_NUM_ROOMS),
        num_co2_sensors=options.get(CONF_NUM_CO2_SENSORS, DEFAULT_NUM_CO2_SENSORS),
        num_rf_sensors=options.get(CONF_NUM_RF_SENSORS, DEFAULT_NUM_RF_SENSORS),
        scan_interval=options.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
    )
    await coordinator.async_load_stats()
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = coordinator
    entry.async_on_unload(coordinator.async_cancel_boost_timer)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await _async_register_panel(hass)
    _remove_stale_room_devices(hass, entry)
    _apply_room_areas(hass, entry)
    return True


def _remove_stale_room_devices(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Remove devices of rooms that are no longer configured (room count
    reduced). Only devices belonging to this config entry are touched."""
    keep = {(DOMAIN, entry.entry_id)} | {
        (DOMAIN, f"{entry.entry_id}_room_{index}")
        for index, name in enumerate(entry.options.get(CONF_ROOM_NAMES, []))
        if name
    }
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if not device.identifiers & keep:
            registry.async_update_device(
                device.id, remove_config_entry_id=entry.entry_id
            )


def _apply_room_areas(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Put each room's device into the Home Assistant area chosen in the
    options. Rooms without a chosen area are left alone, so areas set by hand
    on those devices are never touched."""
    registry = dr.async_get(hass)
    for index, area_id in enumerate(entry.options.get(CONF_ROOM_AREAS, [])):
        if not area_id:
            continue
        device = registry.async_get_device(
            identifiers={(DOMAIN, f"{entry.entry_id}_room_{index}")}
        )
        if device is not None and device.area_id != area_id:
            registry.async_update_device(device.id, area_id=area_id)


async def _async_update_listener(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Reload the entry when its options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ProxonConfigEntry) -> bool:
    """Unload a config entry."""
    # The shared connection closes itself once the last unit holder unloads.
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded and not [
        e for e in hass.config_entries.async_loaded_entries(DOMAIN) if e.entry_id != entry.entry_id
    ]:
        async_remove_panel(hass, PANEL_PATH)
        hass.data.get(DOMAIN, {}).pop("panel_registered", None)
    return unloaded

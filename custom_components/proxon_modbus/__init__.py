"""The Proxon FWT Modbus integration."""
from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import voluptuous as vol
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.frontend import add_extra_js_url, async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.modbus import async_get_unit
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME, Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv, device_registry as dr, entity_platform, entity_registry as er
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
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
    CONF_ENERGY_ENTITY,
    CONF_OUTDOOR_ENTITY,
    DEFAULT_FILTER_INTERVAL,
    CONF_OUTDOOR_SIDE,
    CONF_POWER_ENTITY,
    CONF_PTC_ENERGY_ENTITY,
    CONF_PTC_POWER_ENTITY,
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
from .entity import central_device_info
from .hub import ProxonModbusHub, params_from_entry_data
from .twwp import (
    CONF_BRIGHTNESS as TWWP_BRIGHTNESS,
    CONF_ENABLE_PV_SWITCH,
    CONF_ENABLE_SWITCH,
    CONF_ENERGY_ENTITY as TWWP_ENERGY,
    CONF_OUTER,
    CONF_POWER_ENTITY as TWWP_POWER,
    CONF_PV_MIN_OUTER,
    CONF_PV_POWER,
    CONF_PV_POWER_AVG,
    CONF_WATER,
    SUBENTRY_TYPE_TWWP,
)
from .twwp_controller import RUN_INTERVAL, TwwpController
from .twwp_entity import twwp_device_identifier

PLATFORMS: list[Platform] = [
    Platform.CLIMATE,
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.SWITCH,
    Platform.SELECT,
    Platform.BUTTON,
    Platform.NUMBER,
    Platform.WATER_HEATER,
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
        device = registry.async_get_device_by_identifier((DOMAIN, entry.entry_id), entry.entry_id)
        rooms = []
        for kind, key in (("co2", CONF_ROOM_CO2_ENTITIES), ("rf", CONF_ROOM_RF_ENTITIES)):
            for i, ent in enumerate(entry.options.get(key, [])):
                if not ent:
                    continue
                room_dev = registry.async_get_device_by_identifier((DOMAIN, f"{entry.entry_id}_room_{i}"), entry.entry_id)
                if room_dev:
                    rooms.append({"device_id": room_dev.id, kind: ent})
        twwp = []
        for subentry_id, subentry in entry.subentries.items():
            if subentry.subentry_type != SUBENTRY_TYPE_TWWP:
                continue
            twwp_device = registry.async_get_device_by_identifier(
                twwp_device_identifier(entry.entry_id, subentry_id), entry.entry_id
            )
            if twwp_device is None:
                continue
            twwp.append(
                {
                    "device_id": twwp_device.id,
                    **{
                        key: subentry.data.get(key)
                        for key in (
                            CONF_WATER,
                            CONF_OUTER,
                            CONF_PV_POWER,
                            CONF_PV_POWER_AVG,
                            CONF_PV_MIN_OUTER,
                            TWWP_BRIGHTNESS,
                            TWWP_POWER,
                            TWWP_ENERGY,
                            CONF_ENABLE_SWITCH,
                            CONF_ENABLE_PV_SWITCH,
                        )
                    },
                }
            )
        result.append(
            {
                "device_id": device.id if device else None,
                "twwp": twwp,
                "room_sensors": rooms,
                "outdoor_side": entry.options.get(CONF_OUTDOOR_SIDE, "left"),
                "power_entity": entry.options.get(CONF_POWER_ENTITY),
                "outdoor_entity": entry.options.get(CONF_OUTDOOR_ENTITY),
                "energy_entity": entry.options.get(CONF_ENERGY_ENTITY),
                "ptc_power_entity": entry.options.get(CONF_PTC_POWER_ENTITY),
                "ptc_energy_entity": entry.options.get(CONF_PTC_ENERGY_ENTITY),
                "filter_interval": entry.options.get(CONF_FILTER_INTERVAL, DEFAULT_FILTER_INTERVAL),
                "recirc_filter": entry.options.get(CONF_RECIRC_FILTER, DEFAULT_RECIRC_FILTER),
            }
        )
    connection.send_result(msg["id"], result)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the bundled dashboard card and load it in the frontend.

    The card is a small set of ES modules shipped with the integration, so it
    is available as `custom:proxon-fwt-card` without adding a Lovelace
    resource. The whole `www` folder is served below a path that contains the
    integration version, so the browser fetches every module anew after an
    update (the modules import each other by relative path).
    """
    websocket_api.async_register_command(hass, _ws_settings)
    integration = await async_get_integration(hass, DOMAIN)
    www = Path(__file__).parent / "www"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                f"/{DOMAIN}/{integration.version}",
                str(www),
                cache_headers=False,
            ),
            # Older installations may have added the card as a manual resource at the unversioned URL.
            StaticPathConfig(CARD_URL, str(www / CARD_FILENAME), cache_headers=False),
            StaticPathConfig(f"/{DOMAIN}/lib", str(www / "lib"), cache_headers=False),
            StaticPathConfig(
                f"/{DOMAIN}/icon.png",
                str(Path(__file__).parent / "brand" / "icon@2x.png"),
                cache_headers=True,
            ),
        ]
    )
    module_url = f"/{DOMAIN}/{integration.version}/{CARD_FILENAME}"
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
    # Registered before anything can schedule the boost timer, so a failed setup never leaves it behind.
    entry.async_on_unload(coordinator.async_cancel_boost_timer)
    await coordinator.async_load_stats()
    await coordinator.async_config_entry_first_refresh()

    # The central device is created first so the room devices can be linked to it by id.
    central = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        **central_device_info(entry.entry_id, data[CONF_NAME]),
    )
    coordinator.central_device_id = central.id

    entry.runtime_data = coordinator
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    # Before the platforms: the TWWP entities are created from the controllers.
    await _async_setup_twwp(hass, entry, coordinator)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await _async_register_panel(hass)
    _remove_stale_room_devices(hass, entry)
    _remove_stale_entities(hass, entry)
    _apply_room_areas(hass, entry)
    return True


async def _async_setup_twwp(
    hass: HomeAssistant, entry: ProxonConfigEntry, coordinator: ProxonModbusCoordinator
) -> None:
    """Start one controller per hot water heat pump (TWWP) subentry.

    The heat pump is not a Modbus device: its enable switches and sensors belong
    to other integrations, chosen in the subentry. Each controller decides once a
    minute; with `control` off it only reports what it would switch.
    """

    def read_state(entity_id: str) -> str | None:
        state = hass.states.get(entity_id)
        return state.state if state is not None else None

    async def call_switch(entity_id: str, target: str) -> None:
        await hass.services.async_call(
            "switch", f"turn_{target}", {"entity_id": entity_id}, blocking=True
        )

    for subentry in entry.subentries.values():
        if subentry.subentry_type != SUBENTRY_TYPE_TWWP:
            continue
        controller = TwwpController(
            dict(subentry.data),
            read_state,
            call_switch,
            Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.twwp_{subentry.subentry_id}"),
        )
        await controller.async_load()
        coordinator.twwp_controllers[subentry.subentry_id] = controller

        async def _run(_now, controller=controller) -> None:
            await controller.async_run()

        entry.async_on_unload(
            async_track_time_interval(hass, _run, timedelta(seconds=RUN_INTERVAL))
        )
        entry.async_create_background_task(
            hass, controller.async_run(), f"{DOMAIN}_twwp_first_run"
        )


def _remove_stale_entities(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Drop registry entries the integration no longer provides (fewer CO2/humidity sensors,
    cooling or recirculation filter switched off in the options). Skipped unless every
    platform finished setting up, and entries disabled by the user are left alone."""
    platforms = [
        p for p in entity_platform.async_get_platforms(hass, DOMAIN) if p.config_entry is entry
    ]
    if len(platforms) < len(PLATFORMS):
        return
    live = {e.unique_id for p in platforms for e in p.entities.values()}
    registry = er.async_get(hass)
    for ent in er.async_entries_for_config_entry(registry, entry.entry_id):
        if ent.unique_id not in live and ent.disabled_by is None:
            registry.async_remove(ent.entity_id)


def _remove_stale_room_devices(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Remove devices of rooms that are no longer configured (room count
    reduced). Only devices belonging to this config entry are touched."""
    keep = (
        {(DOMAIN, entry.entry_id)}
        | {
            (DOMAIN, f"{entry.entry_id}_room_{index}")
            for index, name in enumerate(entry.options.get(CONF_ROOM_NAMES, []))
            if name
        }
        | {
            twwp_device_identifier(entry.entry_id, subentry_id)
            for subentry_id, subentry in entry.subentries.items()
            if subentry.subentry_type == SUBENTRY_TYPE_TWWP
        }
    )
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if not device.identifiers & keep:
            registry.async_update_device(
                device.id, remove_config_entry_id=entry.entry_id
            )


def _apply_room_areas(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Put each room's device into the Home Assistant area chosen in the
    options. Rooms without a chosen area are left alone, and so are devices that
    already have an area, so areas set by hand are never overwritten."""
    registry = dr.async_get(hass)
    for index, area_id in enumerate(entry.options.get(CONF_ROOM_AREAS, [])):
        if not area_id:
            continue
        device = registry.async_get_device_by_identifier(
            (DOMAIN, f"{entry.entry_id}_room_{index}"), entry.entry_id
        )
        if device is not None and device.area_id is None:
            registry.async_update_device(device.id, area_id=area_id)


async def _async_update_listener(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Reload the entry when its options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_remove_entry(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Delete the persisted statistics and boost state of a removed entry."""
    suffixes = ["stats", "boost"] + [
        f"twwp_{subentry_id}" for subentry_id in entry.subentries
    ]
    for suffix in suffixes:
        await Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.{suffix}").async_remove()
    if not [e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id != entry.entry_id]:
        async_remove_panel(hass, PANEL_PATH)
        hass.data.get(DOMAIN, {}).pop("panel_registered", None)


async def async_unload_entry(hass: HomeAssistant, entry: ProxonConfigEntry) -> bool:
    """Unload a config entry."""
    # The shared connection closes itself once the last unit holder unloads.
    coordinator = getattr(entry, "runtime_data", None)
    if coordinator is not None:
        await coordinator.async_save_stats()
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    # The side panel stays registered across reloads (options changes); it goes away in async_remove_entry.
    return unloaded

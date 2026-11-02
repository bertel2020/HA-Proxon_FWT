"""The Proxon FWT Modbus integration."""
from __future__ import annotations

from homeassistant.components.modbus import async_get_unit
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr

from .const import (
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_ROOMS,
    CONF_NUM_RF_SENSORS,
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
]

ProxonConfigEntry = ConfigEntry[ProxonModbusCoordinator]


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
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = coordinator
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
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
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

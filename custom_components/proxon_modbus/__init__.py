"""The Proxon FWT Modbus integration."""
from __future__ import annotations

from homeassistant.components.modbus import async_get_unit
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import (
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_ROOMS,
    CONF_NUM_RF_SENSORS,
    CONF_SCAN_INTERVAL,
    CONF_UNIT_ID,
    DEFAULT_NUM_CO2_SENSORS,
    DEFAULT_NUM_ROOMS,
    DEFAULT_NUM_RF_SENSORS,
    DEFAULT_SCAN_INTERVAL,
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
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ProxonConfigEntry) -> None:
    """Reload the entry when its options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ProxonConfigEntry) -> bool:
    """Unload a config entry."""
    # The shared connection closes itself once the last unit holder unloads.
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

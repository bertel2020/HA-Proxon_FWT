"""The Proxon FWT Modbus integration."""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady

from .const import (
    CONF_BAUDRATE,
    CONF_BYTESIZE,
    CONF_CONNECTION_TYPE,
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_ROOMS,
    CONF_NUM_RF_SENSORS,
    CONF_PARITY,
    CONF_SCAN_INTERVAL,
    CONF_SERIAL_PORT,
    CONF_STOPBITS,
    CONF_UNIT_ID,
    CONNECTION_TYPE_TCP,
    DEFAULT_NUM_CO2_SENSORS,
    DEFAULT_NUM_ROOMS,
    DEFAULT_NUM_RF_SENSORS,
    DEFAULT_SCAN_INTERVAL,
)
from .coordinator import ProxonModbusCoordinator
from .hub import ProxonModbusError, ProxonModbusHub, SerialConnectionParams, TcpConnectionParams

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

    if data[CONF_CONNECTION_TYPE] == CONNECTION_TYPE_TCP:
        params: TcpConnectionParams | SerialConnectionParams = TcpConnectionParams(
            host=data[CONF_HOST], port=data[CONF_PORT]
        )
    else:
        params = SerialConnectionParams(
            port=data[CONF_SERIAL_PORT],
            baudrate=data[CONF_BAUDRATE],
            bytesize=data[CONF_BYTESIZE],
            parity=data[CONF_PARITY],
            stopbits=data[CONF_STOPBITS],
        )

    hub = ProxonModbusHub(data[CONF_CONNECTION_TYPE], params, data[CONF_UNIT_ID])
    try:
        await hub.async_setup()
    except ProxonModbusError as err:
        raise ConfigEntryNotReady(
            f"Could not connect to the Proxon FWT: {err}"
        ) from err

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
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.hub.async_close()
    return unload_ok

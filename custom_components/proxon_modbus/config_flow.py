"""Config flow for the Proxon FWT Modbus integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_HOST, CONF_NAME, CONF_PORT
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_BAUDRATE,
    CONF_BYTESIZE,
    CONF_CO2_NAMES,
    CONF_CONNECTION_TYPE,
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_ROOMS,
    CONF_NUM_RF_SENSORS,
    CONF_PARITY,
    CONF_RF_NAMES,
    CONF_ROOM_NAMES,
    CONF_SCAN_INTERVAL,
    CONF_SERIAL_PORT,
    CONF_STOPBITS,
    CONF_UNIT_ID,
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_TCP,
    DEFAULT_BAUDRATE,
    DEFAULT_BYTESIZE,
    DEFAULT_NAME,
    DEFAULT_NUM_CO2_SENSORS,
    DEFAULT_NUM_ROOMS,
    DEFAULT_NUM_RF_SENSORS,
    DEFAULT_PARITY,
    DEFAULT_ROOM_NAMES,
    DEFAULT_SCAN_INTERVAL,
    DEFAULT_STOPBITS,
    DEFAULT_TCP_PORT,
    DEFAULT_UNIT_ID,
    DOMAIN,
    MAX_EXTERNAL_SENSORS,
    MAX_ROOMS,
    REG_DEVICE_DATA_BASE,
)
from .hub import (
    ProxonModbusError,
    ProxonModbusHub,
    SerialConnectionParams,
    TcpConnectionParams,
)

_LOGGER = logging.getLogger(__name__)

BAUDRATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
PARITIES = ["N", "E", "O"]
STOPBITS = [1, 2]


def _default_room_name(index: int) -> str:
    """1-based room number -> default name."""
    if index - 1 < len(DEFAULT_ROOM_NAMES):
        return DEFAULT_ROOM_NAMES[index - 1]
    return f"Raum {index}"


async def _async_test_connection(
    connection_type: str,
    params: TcpConnectionParams | SerialConnectionParams,
    unit_id: int,
) -> None:
    """Open a connection and read one known register to confirm a Proxon
    FWT is actually answering - not just that a TCP port/serial device
    exists. Raises ProxonModbusError on failure; always closes the hub."""
    hub = ProxonModbusHub(connection_type, params, unit_id)
    try:
        await hub.async_setup()
        await hub.async_read_holding_registers(REG_DEVICE_DATA_BASE, 1)
    finally:
        await hub.async_close()


class ProxonModbusConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Proxon FWT."""

    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """First step: choose how the FWT / BusBridge gateway is reached."""
        return self.async_show_menu(step_id="user", menu_options=["tcp", "serial"])

    async def async_step_tcp(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Configure a TCP (Modbus TCP / gateway) connection."""
        errors: dict[str, str] = {}
        if user_input is not None:
            await self.async_set_unique_id(
                f"tcp_{user_input[CONF_HOST]}_{user_input[CONF_PORT]}_{user_input[CONF_UNIT_ID]}"
            )
            self._abort_if_unique_id_configured()

            try:
                await _async_test_connection(
                    CONNECTION_TYPE_TCP,
                    TcpConnectionParams(
                        host=user_input[CONF_HOST], port=user_input[CONF_PORT]
                    ),
                    user_input[CONF_UNIT_ID],
                )
            except ProxonModbusError:
                errors["base"] = "cannot_connect"
            except Exception:
                _LOGGER.exception("Unexpected error testing Proxon FWT connection")
                errors["base"] = "unknown"
            else:
                self._data = {
                    CONF_CONNECTION_TYPE: CONNECTION_TYPE_TCP,
                    CONF_NAME: user_input[CONF_NAME],
                    CONF_HOST: user_input[CONF_HOST],
                    CONF_PORT: user_input[CONF_PORT],
                    CONF_UNIT_ID: user_input[CONF_UNIT_ID],
                }
                return await self.async_step_rooms()

        schema = vol.Schema(
            {
                vol.Required(CONF_NAME, default=DEFAULT_NAME): str,
                vol.Required(CONF_HOST): str,
                vol.Required(CONF_PORT, default=DEFAULT_TCP_PORT): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=1, max=65535, mode="box")
                ),
                vol.Required(
                    CONF_UNIT_ID, default=DEFAULT_UNIT_ID
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=1, max=247, mode="box")
                ),
            }
        )
        return self.async_show_form(step_id="tcp", data_schema=schema, errors=errors)

    async def async_step_serial(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Configure a serial (RTU, USB-to-serial) connection."""
        errors: dict[str, str] = {}
        if user_input is not None:
            # The baudrate/bytesize/stopbits selectors are string-valued
            # (their options lists are strings) - pyserial wants real ints.
            baudrate = int(user_input[CONF_BAUDRATE])
            bytesize = int(user_input[CONF_BYTESIZE])
            stopbits = int(user_input[CONF_STOPBITS])

            await self.async_set_unique_id(
                f"serial_{user_input[CONF_SERIAL_PORT]}_{user_input[CONF_UNIT_ID]}"
            )
            self._abort_if_unique_id_configured()

            try:
                await _async_test_connection(
                    CONNECTION_TYPE_SERIAL,
                    SerialConnectionParams(
                        port=user_input[CONF_SERIAL_PORT],
                        baudrate=baudrate,
                        bytesize=bytesize,
                        parity=user_input[CONF_PARITY],
                        stopbits=stopbits,
                    ),
                    user_input[CONF_UNIT_ID],
                )
            except ProxonModbusError:
                errors["base"] = "cannot_connect"
            except Exception:
                _LOGGER.exception("Unexpected error testing Proxon FWT connection")
                errors["base"] = "unknown"
            else:
                self._data = {
                    CONF_CONNECTION_TYPE: CONNECTION_TYPE_SERIAL,
                    CONF_NAME: user_input[CONF_NAME],
                    CONF_SERIAL_PORT: user_input[CONF_SERIAL_PORT],
                    CONF_BAUDRATE: baudrate,
                    CONF_BYTESIZE: bytesize,
                    CONF_PARITY: user_input[CONF_PARITY],
                    CONF_STOPBITS: stopbits,
                    CONF_UNIT_ID: user_input[CONF_UNIT_ID],
                }
                return await self.async_step_rooms()

        schema = vol.Schema(
            {
                vol.Required(CONF_NAME, default=DEFAULT_NAME): str,
                vol.Required(CONF_SERIAL_PORT, default="/dev/ttyUSB0"): str,
                vol.Required(
                    CONF_BAUDRATE, default=DEFAULT_BAUDRATE
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[str(b) for b in BAUDRATES],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Required(
                    CONF_BYTESIZE, default=DEFAULT_BYTESIZE
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=["5", "6", "7", "8"],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Required(
                    CONF_PARITY, default=DEFAULT_PARITY
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=PARITIES, mode=selector.SelectSelectorMode.DROPDOWN
                    )
                ),
                vol.Required(
                    CONF_STOPBITS, default=DEFAULT_STOPBITS
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=["1", "2"], mode=selector.SelectSelectorMode.DROPDOWN
                    )
                ),
                vol.Required(
                    CONF_UNIT_ID, default=DEFAULT_UNIT_ID
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=1, max=247, mode="box")
                ),
            }
        )
        return self.async_show_form(step_id="serial", data_schema=schema, errors=errors)

    async def async_step_rooms(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Configure how many rooms and external sensors to create entities for."""
        if user_input is not None:
            num_rooms = int(user_input[CONF_NUM_ROOMS])
            options = {
                CONF_NUM_ROOMS: num_rooms,
                CONF_ROOM_NAMES: [_default_room_name(i) for i in range(1, num_rooms + 1)],
                CONF_NUM_CO2_SENSORS: int(user_input[CONF_NUM_CO2_SENSORS]),
                CONF_CO2_NAMES: [
                    f"CO2 {i}" for i in range(1, int(user_input[CONF_NUM_CO2_SENSORS]) + 1)
                ],
                CONF_NUM_RF_SENSORS: int(user_input[CONF_NUM_RF_SENSORS]),
                CONF_RF_NAMES: [
                    f"Luftfeuchte {i}"
                    for i in range(1, int(user_input[CONF_NUM_RF_SENSORS]) + 1)
                ],
                CONF_SCAN_INTERVAL: int(user_input[CONF_SCAN_INTERVAL]),
            }
            return self.async_create_entry(
                title=self._data[CONF_NAME], data=self._data, options=options
            )

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_NUM_ROOMS, default=DEFAULT_NUM_ROOMS
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=1, max=MAX_ROOMS, mode="box")
                ),
                vol.Required(
                    CONF_NUM_CO2_SENSORS, default=DEFAULT_NUM_CO2_SENSORS
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0, max=MAX_EXTERNAL_SENSORS, mode="box"
                    )
                ),
                vol.Required(
                    CONF_NUM_RF_SENSORS, default=DEFAULT_NUM_RF_SENSORS
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0, max=MAX_EXTERNAL_SENSORS, mode="box"
                    )
                ),
                vol.Required(
                    CONF_SCAN_INTERVAL, default=DEFAULT_SCAN_INTERVAL
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=5, max=3600, unit_of_measurement="s", mode="box"
                    )
                ),
            }
        )
        return self.async_show_form(step_id="rooms", data_schema=schema)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> ProxonModbusOptionsFlow:
        return ProxonModbusOptionsFlow()


class ProxonModbusOptionsFlow(OptionsFlow):
    """Options flow: room count/names, external sensors, scan interval."""

    def __init__(self) -> None:
        self._pending: dict[str, Any] = {}

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        options = self.config_entry.options

        if user_input is not None:
            self._pending = {
                CONF_NUM_ROOMS: int(user_input[CONF_NUM_ROOMS]),
                CONF_NUM_CO2_SENSORS: int(user_input[CONF_NUM_CO2_SENSORS]),
                CONF_NUM_RF_SENSORS: int(user_input[CONF_NUM_RF_SENSORS]),
                CONF_SCAN_INTERVAL: int(user_input[CONF_SCAN_INTERVAL]),
            }
            return await self.async_step_names()

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_NUM_ROOMS,
                    default=options.get(CONF_NUM_ROOMS, DEFAULT_NUM_ROOMS),
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=1, max=MAX_ROOMS, mode="box")
                ),
                vol.Required(
                    CONF_NUM_CO2_SENSORS,
                    default=options.get(CONF_NUM_CO2_SENSORS, DEFAULT_NUM_CO2_SENSORS),
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0, max=MAX_EXTERNAL_SENSORS, mode="box"
                    )
                ),
                vol.Required(
                    CONF_NUM_RF_SENSORS,
                    default=options.get(CONF_NUM_RF_SENSORS, DEFAULT_NUM_RF_SENSORS),
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0, max=MAX_EXTERNAL_SENSORS, mode="box"
                    )
                ),
                vol.Required(
                    CONF_SCAN_INTERVAL,
                    default=options.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=5, max=3600, unit_of_measurement="s", mode="box"
                    )
                ),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)

    async def async_step_names(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Let the user (re)name every room and external sensor."""
        options = self.config_entry.options
        num_rooms = self._pending[CONF_NUM_ROOMS]
        num_co2 = self._pending[CONF_NUM_CO2_SENSORS]
        num_rf = self._pending[CONF_NUM_RF_SENSORS]

        existing_rooms = options.get(CONF_ROOM_NAMES, [])
        existing_co2 = options.get(CONF_CO2_NAMES, [])
        existing_rf = options.get(CONF_RF_NAMES, [])

        if user_input is not None:
            room_names = [
                user_input[f"room_{i + 1}"] for i in range(num_rooms)
            ]
            co2_names = [user_input[f"co2_{i + 1}"] for i in range(num_co2)]
            rf_names = [user_input[f"rf_{i + 1}"] for i in range(num_rf)]
            new_options = {
                **self._pending,
                CONF_ROOM_NAMES: room_names,
                CONF_CO2_NAMES: co2_names,
                CONF_RF_NAMES: rf_names,
            }
            return self.async_create_entry(title="", data=new_options)

        fields: dict[Any, Any] = {}
        for i in range(num_rooms):
            default = (
                existing_rooms[i] if i < len(existing_rooms) else _default_room_name(i + 1)
            )
            fields[vol.Required(f"room_{i + 1}", default=default)] = str
        for i in range(num_co2):
            default = existing_co2[i] if i < len(existing_co2) else f"CO2 {i + 1}"
            fields[vol.Required(f"co2_{i + 1}", default=default)] = str
        for i in range(num_rf):
            default = existing_rf[i] if i < len(existing_rf) else f"Luftfeuchte {i + 1}"
            fields[vol.Required(f"rf_{i + 1}", default=default)] = str

        return self.async_show_form(step_id="names", data_schema=vol.Schema(fields))

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
    CONF_CO2_ROOMS,
    CONF_CONNECTION_TYPE,
    CONF_COOLING_AVAILABLE,
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_ROOMS,
    CONF_NUM_RF_SENSORS,
    CONF_PARITY,
    CONF_RF_NAMES,
    CONF_RF_ROOMS,
    CONF_ROOM_NAMES,
    CONF_SCAN_INTERVAL,
    CONF_SERIAL_PORT,
    CONF_STOPBITS,
    CONF_UNIT_ID,
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_TCP,
    DEFAULT_BAUDRATE,
    DEFAULT_BYTESIZE,
    DEFAULT_COOLING_AVAILABLE,
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

# Sentinel select value meaning "keep this external sensor on the central
# device" rather than assigning it to one of the rooms.
_NO_ROOM = "none"


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
        """First step: choose how the FWT Modbus gateway is reached."""
        return self.async_show_menu(step_id="user", menu_options=["tcp", "serial"])

    async def async_step_tcp(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Configure a TCP (Modbus TCP / gateway) connection."""
        errors: dict[str, str] = {}
        if user_input is not None:
            # NumberSelector-sourced values come back as float (e.g. 10.0,
            # 502.0) - pymodbus/socket code downstream needs real ints.
            port = int(user_input[CONF_PORT])
            unit_id = int(user_input[CONF_UNIT_ID])

            await self.async_set_unique_id(
                f"tcp_{user_input[CONF_HOST]}_{port}_{unit_id}"
            )
            self._abort_if_unique_id_configured()

            try:
                await _async_test_connection(
                    CONNECTION_TYPE_TCP,
                    TcpConnectionParams(host=user_input[CONF_HOST], port=port),
                    unit_id,
                )
            except ProxonModbusError as err:
                _LOGGER.warning("Proxon FWT connection test failed: %s", err)
                errors["base"] = "cannot_connect"
            except Exception:
                _LOGGER.exception("Unexpected error testing Proxon FWT connection")
                errors["base"] = "unknown"
            else:
                self._data = {
                    CONF_CONNECTION_TYPE: CONNECTION_TYPE_TCP,
                    CONF_NAME: user_input[CONF_NAME],
                    CONF_HOST: user_input[CONF_HOST],
                    CONF_PORT: port,
                    CONF_UNIT_ID: unit_id,
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
            # NumberSelector/SelectSelector-sourced values come back as
            # float or str (e.g. 10.0, "9600") - pymodbus/pyserial need
            # real ints.
            baudrate = int(user_input[CONF_BAUDRATE])
            bytesize = int(user_input[CONF_BYTESIZE])
            stopbits = int(user_input[CONF_STOPBITS])
            unit_id = int(user_input[CONF_UNIT_ID])

            await self.async_set_unique_id(
                f"serial_{user_input[CONF_SERIAL_PORT]}_{unit_id}"
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
                    unit_id,
                )
            except ProxonModbusError as err:
                _LOGGER.warning("Proxon FWT connection test failed: %s", err)
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
                    CONF_UNIT_ID: unit_id,
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
                    f"CO2-Sensor {i}" for i in range(1, int(user_input[CONF_NUM_CO2_SENSORS]) + 1)
                ],
                CONF_NUM_RF_SENSORS: int(user_input[CONF_NUM_RF_SENSORS]),
                CONF_RF_NAMES: [
                    f"Luftfeuchte-Sensor {i}"
                    for i in range(1, int(user_input[CONF_NUM_RF_SENSORS]) + 1)
                ],
                CONF_SCAN_INTERVAL: int(user_input[CONF_SCAN_INTERVAL]),
                CONF_COOLING_AVAILABLE: bool(user_input[CONF_COOLING_AVAILABLE]),
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
                vol.Required(
                    CONF_COOLING_AVAILABLE, default=DEFAULT_COOLING_AVAILABLE
                ): selector.BooleanSelector(),
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
                CONF_COOLING_AVAILABLE: bool(user_input[CONF_COOLING_AVAILABLE]),
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
                vol.Required(
                    CONF_COOLING_AVAILABLE,
                    default=options.get(CONF_COOLING_AVAILABLE, DEFAULT_COOLING_AVAILABLE),
                ): selector.BooleanSelector(),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)

    async def async_step_names(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Let the user (re)name every room and external sensor, and
        optionally assign each external sensor to one of the rooms."""
        options = self.config_entry.options
        num_rooms = self._pending[CONF_NUM_ROOMS]
        num_co2 = self._pending[CONF_NUM_CO2_SENSORS]
        num_rf = self._pending[CONF_NUM_RF_SENSORS]

        existing_rooms = options.get(CONF_ROOM_NAMES, [])
        existing_co2 = options.get(CONF_CO2_NAMES, [])
        existing_rf = options.get(CONF_RF_NAMES, [])
        existing_co2_rooms = options.get(CONF_CO2_ROOMS, [])
        existing_rf_rooms = options.get(CONF_RF_ROOMS, [])

        def parse_room(raw: str) -> int | None:
            return None if raw == _NO_ROOM else int(raw)

        if user_input is not None:
            room_names = [
                user_input[f"room_{i + 1}"] for i in range(num_rooms)
            ]
            co2_names = [user_input[f"co2_{i + 1}"] for i in range(num_co2)]
            rf_names = [user_input[f"rf_{i + 1}"] for i in range(num_rf)]
            co2_rooms = [parse_room(user_input[f"co2_{i + 1}_room"]) for i in range(num_co2)]
            rf_rooms = [parse_room(user_input[f"rf_{i + 1}_room"]) for i in range(num_rf)]
            new_options = {
                **self._pending,
                CONF_ROOM_NAMES: room_names,
                CONF_CO2_NAMES: co2_names,
                CONF_RF_NAMES: rf_names,
                CONF_CO2_ROOMS: co2_rooms,
                CONF_RF_ROOMS: rf_rooms,
            }
            return self.async_create_entry(title="", data=new_options)

        room_labels = [
            existing_rooms[i] if i < len(existing_rooms) else _default_room_name(i + 1)
            for i in range(num_rooms)
        ]
        no_room_label = (
            "Zentral (kein Raum)"
            if (self.hass.config.language or "").startswith("de")
            else "Central (no room)"
        )
        room_select_options = [
            selector.SelectOptionDict(value=_NO_ROOM, label=no_room_label)
        ] + [
            selector.SelectOptionDict(value=str(i), label=room_labels[i])
            for i in range(num_rooms)
        ]

        def room_default(existing_rooms_assignment: list[int | None], i: int) -> str:
            if i >= len(existing_rooms_assignment) or existing_rooms_assignment[i] is None:
                return _NO_ROOM
            room_index = existing_rooms_assignment[i]
            return str(room_index) if room_index < num_rooms else _NO_ROOM

        fields: dict[Any, Any] = {}
        for i in range(num_rooms):
            fields[vol.Required(f"room_{i + 1}", default=room_labels[i])] = str
        for i in range(num_co2):
            default = existing_co2[i] if i < len(existing_co2) else f"CO2-Sensor {i + 1}"
            fields[vol.Required(f"co2_{i + 1}", default=default)] = str
            fields[
                vol.Required(
                    f"co2_{i + 1}_room", default=room_default(existing_co2_rooms, i)
                )
            ] = selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=room_select_options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            )
        for i in range(num_rf):
            default = existing_rf[i] if i < len(existing_rf) else f"Luftfeuchte-Sensor {i + 1}"
            fields[vol.Required(f"rf_{i + 1}", default=default)] = str
            fields[
                vol.Required(
                    f"rf_{i + 1}_room", default=room_default(existing_rf_rooms, i)
                )
            ] = selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=room_select_options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            )

        return self.async_show_form(step_id="names", data_schema=vol.Schema(fields))

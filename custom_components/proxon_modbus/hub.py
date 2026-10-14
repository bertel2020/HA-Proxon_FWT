"""Modbus access for the Proxon FWT integration.

The connection itself is owned by Home Assistant's `modbus` integration: it
hands out a unit on a shared connection (one connection per physical link,
requests serialized, lazy connect/reconnect), so this module only wraps that
unit and normalizes its errors to ProxonModbusError.
"""
from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.exceptions import HomeAssistantError
from modbus_connection import (
    ModbusError,
    ModbusSerialParams,
    ModbusTcpParams,
    ModbusUnit,
)

from .const import (
    CONF_BAUDRATE,
    CONF_BYTESIZE,
    CONF_CONNECTION_TYPE,
    CONF_PARITY,
    CONF_SERIAL_PORT,
    CONF_STOPBITS,
    CONNECTION_TYPE_TCP,
)

_LOGGER = logging.getLogger(__name__)


class ProxonModbusError(Exception):
    """Raised when a Modbus read or write to the Proxon FWT fails."""


def build_params(
    connection_type: str, data: Mapping[str, Any]
) -> ModbusTcpParams | ModbusSerialParams:
    """Build the connection params for the `modbus` integration.

    Home Assistant's selectors don't guarantee int types (e.g. NumberSelector
    returns float), so everything numeric is cast defensively.
    """
    if connection_type == CONNECTION_TYPE_TCP:
        return ModbusTcpParams(host=data[CONF_HOST], port=int(data[CONF_PORT]))
    return ModbusSerialParams(
        device=data[CONF_SERIAL_PORT],
        baudrate=int(data[CONF_BAUDRATE]),
        bytesize=int(data[CONF_BYTESIZE]),
        parity=data[CONF_PARITY],
        stopbits=int(data[CONF_STOPBITS]),
    )


def params_from_entry_data(
    data: Mapping[str, Any],
) -> ModbusTcpParams | ModbusSerialParams:
    """Build connection params from a config entry's data."""
    return build_params(data[CONF_CONNECTION_TYPE], data)


class ProxonModbusHub:
    """Reads and writes holding registers of one Proxon FWT unit."""

    def __init__(self, unit: ModbusUnit) -> None:
        self._unit = unit

    async def async_read_holding_registers(
        self, address: int, count: int
    ) -> list[int]:
        """Read `count` holding registers starting at `address`."""
        try:
            return list(await self._unit.read_holding_registers(address, count))
        except (ModbusError, HomeAssistantError, OSError, TimeoutError) as err:
            raise ProxonModbusError(
                f"Error reading register {address} ({count}): {err}"
            ) from err

    async def async_write_register(self, address: int, value: int) -> None:
        """Write a single holding register."""
        try:
            await self._unit.write_register(address, value)
        except (ModbusError, HomeAssistantError, OSError, TimeoutError) as err:
            raise ProxonModbusError(
                f"Error writing {value} to register {address}: {err}"
            ) from err


def decode_int16(raw: int) -> int:
    """Decode a raw uint16 register value as a signed 16-bit integer."""
    return raw - 0x10000 if raw >= 0x8000 else raw


def bit(value: int, index: int) -> bool:
    """Return True if bit `index` (0 = LSB) is set in `value`."""
    return bool((value >> index) & 1)


def set_bit(value: int, index: int, on: bool) -> int:
    """Return `value` with bit `index` set to `on`."""
    if on:
        return value | (1 << index)
    return value & ~(1 << index)

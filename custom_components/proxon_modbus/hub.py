"""Modbus connection handling for the Proxon FWT integration.

A single hub instance owns one Modbus connection (TCP or serial/RTU) for the
whole config entry and serializes all reads/writes through an asyncio.Lock,
so the integration never opens more than one connection per configured
device and never overlaps requests on the wire.
"""
from __future__ import annotations

import asyncio
import inspect
import logging
from dataclasses import dataclass

from pymodbus.client import AsyncModbusSerialClient, AsyncModbusTcpClient

from .const import (
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_TCP,
    DEFAULT_TIMEOUT,
)

_LOGGER = logging.getLogger(__name__)


class ProxonModbusError(Exception):
    """Raised when a Modbus read or write to the Proxon FWT fails."""


@dataclass
class TcpConnectionParams:
    """Connection parameters for a TCP-connected Proxon FWT / BusBridge."""

    host: str
    port: int


@dataclass
class SerialConnectionParams:
    """Connection parameters for an RTU-connected Proxon FWT / BusBridge."""

    port: str
    baudrate: int
    bytesize: int
    parity: str
    stopbits: int


class ProxonModbusHub:
    """Owns the Modbus client and serializes access to a single device."""

    def __init__(
        self,
        connection_type: str,
        params: TcpConnectionParams | SerialConnectionParams,
        unit_id: int,
    ) -> None:
        self._connection_type = connection_type
        self._params = params
        self.unit_id = unit_id
        self._lock = asyncio.Lock()
        self._client = self._build_client()
        # pymodbus renamed the per-request unit-id keyword from `slave` to
        # `device_id` in 3.9; detect which one this installed version wants
        # so we work across the whole 3.6-3.x range without pinning tightly.
        self._unit_kwarg = (
            "device_id"
            if "device_id" in inspect.signature(self._client.read_holding_registers).parameters
            else "slave"
        )

    def _build_client(self):
        if self._connection_type == CONNECTION_TYPE_TCP:
            assert isinstance(self._params, TcpConnectionParams)
            return AsyncModbusTcpClient(
                host=self._params.host,
                port=self._params.port,
                timeout=DEFAULT_TIMEOUT,
            )
        if self._connection_type == CONNECTION_TYPE_SERIAL:
            assert isinstance(self._params, SerialConnectionParams)
            return AsyncModbusSerialClient(
                port=self._params.port,
                baudrate=self._params.baudrate,
                bytesize=self._params.bytesize,
                parity=self._params.parity,
                stopbits=self._params.stopbits,
                timeout=DEFAULT_TIMEOUT,
            )
        raise ValueError(f"Unknown connection type: {self._connection_type}")

    async def async_setup(self) -> None:
        """Open the connection."""
        async with self._lock:
            try:
                connected = await self._client.connect()
            except Exception as err:  # noqa: BLE001 - pymodbus/pyserial raise a
                # wide, version-dependent variety of exceptions here (OSError,
                # socket.gaierror, asyncio.TimeoutError, SerialException, ...)
                # instead of always returning False; normalize all of them to
                # ProxonModbusError so callers only ever have one thing to
                # catch.
                raise ProxonModbusError(
                    f"Could not establish Modbus connection to the Proxon FWT: {err}"
                ) from err
            if not connected:
                raise ProxonModbusError(
                    "Could not establish Modbus connection to the Proxon FWT"
                )

    async def async_close(self) -> None:
        """Close the connection."""
        async with self._lock:
            self._client.close()

    @property
    def connected(self) -> bool:
        return bool(self._client.connected)

    async def async_read_holding_registers(
        self, address: int, count: int
    ) -> list[int]:
        """Read `count` holding registers starting at `address`."""
        async with self._lock:
            try:
                if not self._client.connected:
                    await self._client.connect()
                result = await self._client.read_holding_registers(
                    address, count=count, **{self._unit_kwarg: self.unit_id}
                )
            except Exception as err:  # noqa: BLE001 - see async_setup
                raise ProxonModbusError(
                    f"Error reading register {address} ({count}): {err}"
                ) from err
            if result.isError():
                raise ProxonModbusError(
                    f"Modbus error reading register {address} ({count}): {result}"
                )
            return list(result.registers)

    async def async_write_register(self, address: int, value: int) -> None:
        """Write a single holding register."""
        async with self._lock:
            try:
                if not self._client.connected:
                    await self._client.connect()
                result = await self._client.write_register(
                    address, value, **{self._unit_kwarg: self.unit_id}
                )
            except Exception as err:  # noqa: BLE001 - see async_setup
                raise ProxonModbusError(
                    f"Error writing {value} to register {address}: {err}"
                ) from err
            if result.isError():
                raise ProxonModbusError(
                    f"Modbus error writing {value} to register {address}: {result}"
                )


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

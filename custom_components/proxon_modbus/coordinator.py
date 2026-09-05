"""DataUpdateCoordinator for the Proxon FWT Modbus integration."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    CAPABILITY_FLAGS,
    DOMAIN,
    MESSAGE_FLAGS,
    REG_BYPASS_STATE,
    REG_CAPABILITY_FLAGS,
    REG_CO2_BASE,
    REG_COMPRESSOR_SPEED,
    REG_COOLING_ENABLE_READ,
    REG_COOLING_ENABLE_WRITE,
    REG_DEVICE_DATA_BASE,
    REG_DEVICE_DATA_COUNT,
    REG_FAN_AUTO_READ,
    REG_FAN_AUTO_WRITE,
    REG_FAN_INTENSIVE_READ,
    REG_FAN_INTENSIVE_WRITE,
    REG_FAN_SPEED_EXTRACT,
    REG_FAN_SPEED_SUPPLY,
    REG_FAN_STAGE_READ,
    REG_FAN_STAGE_WRITE,
    REG_FUNCTION_BLOCK_BASE,
    REG_FUNCTION_BLOCK_COUNT,
    REG_MESSAGES,
    REG_OPERATING_MODE_READ,
    REG_OPERATING_MODE_WRITE,
    REG_POWER_CONSUMPTION,
    REG_PTC_ENABLE_READ,
    REG_PTC_STATE,
    REG_RF_BASE,
    REG_ROOM_MID_TEMP_BASE,
    REG_ROOM_SETPOINT_READ_BASE,
    REG_ROOM_TEMP_BASE,
    REG_TEMP_COMPRESSOR,
    REG_TEMP_CONDENSER,
    REG_TEMP_EVAPORATOR,
    REG_TEMP_EXHAUST_AIR,
    REG_TEMP_EXTRACT_AIR,
    REG_TEMP_FRESH_AIR,
    REG_TEMP_OUTSIDE,
    REG_TEMP_POST_PREHEAT,
    REG_TEMP_PRE_CONDENSER,
    REG_TEMP_PRE_EVAPORATOR,
    REG_TEMP_SUPPLY_AIR,
    WRITE_SETTLE_DELAY,
)
from .hub import ProxonModbusError, ProxonModbusHub, bit, decode_int16

_LOGGER = logging.getLogger(__name__)


@dataclass
class RoomData:
    """Decoded data for a single room."""

    index: int  # 0-based
    temperature: float | None = None
    setpoint: float | None = None
    mid_temperature: float | None = None
    ptc_active: bool | None = None
    ptc_enabled: bool | None = None


@dataclass
class ProxonData:
    """All decoded data for one poll cycle."""

    device: dict[str, float | int | bool] = field(default_factory=dict)
    rooms: dict[int, RoomData] = field(default_factory=dict)
    function_block: dict[str, int] = field(default_factory=dict)
    capabilities: dict[str, bool] = field(default_factory=dict)
    messages: dict[str, bool] = field(default_factory=dict)
    co2: dict[int, int] = field(default_factory=dict)
    humidity: dict[int, int] = field(default_factory=dict)
    ptc_enable_mask: int = 0


class ProxonModbusCoordinator(DataUpdateCoordinator[ProxonData]):
    """Polls the Proxon FWT and decodes all registers into ProxonData."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        hub: ProxonModbusHub,
        num_rooms: int,
        num_co2_sensors: int,
        num_rf_sensors: int,
        scan_interval: int,
    ) -> None:
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=timedelta(seconds=scan_interval),
        )
        self.hub = hub
        self.num_rooms = num_rooms
        self.num_co2_sensors = num_co2_sensors
        self.num_rf_sensors = num_rf_sensors

    async def _async_update_data(self) -> ProxonData:
        try:
            return await self._async_read_all()
        except ProxonModbusError as err:
            raise UpdateFailed(str(err)) from err

    async def async_write_register(self, address: int, value: int) -> None:
        """Write a "Soll" register, then refresh once the device has had a
        moment to apply it and reflect the change in its "Ist" register."""
        await self.hub.async_write_register(address, value)
        await asyncio.sleep(WRITE_SETTLE_DELAY)
        await self.async_request_refresh()

    async def _async_read_all(self) -> ProxonData:
        data = ProxonData()

        # --- Device / system data (100..115) ---
        device_regs = await self.hub.async_read_holding_registers(
            REG_DEVICE_DATA_BASE, REG_DEVICE_DATA_COUNT
        )

        def dev(addr: int) -> int:
            return device_regs[addr - REG_DEVICE_DATA_BASE]

        data.device["temp_supply_air"] = decode_int16(dev(REG_TEMP_SUPPLY_AIR)) / 10
        data.device["temp_extract_air"] = decode_int16(dev(REG_TEMP_EXTRACT_AIR)) / 10
        data.device["temp_exhaust_air"] = decode_int16(dev(REG_TEMP_EXHAUST_AIR)) / 10
        data.device["temp_fresh_air"] = decode_int16(dev(REG_TEMP_FRESH_AIR)) / 10
        data.device["temp_pre_evaporator"] = (
            decode_int16(dev(REG_TEMP_PRE_EVAPORATOR)) / 10
        )
        data.device["temp_evaporator"] = decode_int16(dev(REG_TEMP_EVAPORATOR)) / 10
        data.device["temp_post_preheat"] = decode_int16(dev(REG_TEMP_POST_PREHEAT)) / 10
        data.device["temp_pre_condenser"] = (
            decode_int16(dev(REG_TEMP_PRE_CONDENSER)) / 10
        )
        data.device["temp_condenser"] = decode_int16(dev(REG_TEMP_CONDENSER)) / 10
        data.device["temp_compressor"] = decode_int16(dev(REG_TEMP_COMPRESSOR)) / 10
        data.device["temp_outside"] = decode_int16(dev(REG_TEMP_OUTSIDE)) / 10
        data.device["compressor_speed"] = decode_int16(dev(REG_COMPRESSOR_SPEED))
        data.device["bypass_active"] = bool(dev(REG_BYPASS_STATE))
        data.device["power_consumption"] = decode_int16(dev(REG_POWER_CONSUMPTION)) / 10
        data.device["fan_speed_supply"] = decode_int16(dev(REG_FAN_SPEED_SUPPLY))
        data.device["fan_speed_extract"] = decode_int16(dev(REG_FAN_SPEED_EXTRACT))

        # --- Room actual temperature (150..) ---
        room_temp_regs = await self.hub.async_read_holding_registers(
            REG_ROOM_TEMP_BASE, self.num_rooms
        )
        # --- Room setpoint, device-confirmed (180..) ---
        room_setpoint_regs = await self.hub.async_read_holding_registers(
            REG_ROOM_SETPOINT_READ_BASE, self.num_rooms
        )
        # --- Mid-room temperature (220..), rooms 2..N only ---
        mid_temp_regs: list[int] = []
        if self.num_rooms > 1:
            mid_temp_regs = await self.hub.async_read_holding_registers(
                REG_ROOM_MID_TEMP_BASE, self.num_rooms - 1
            )

        # --- PTC state/enable bitfields ---
        ptc_state_reg = (
            await self.hub.async_read_holding_registers(REG_PTC_STATE, 1)
        )[0]
        ptc_enable_reg = (
            await self.hub.async_read_holding_registers(REG_PTC_ENABLE_READ, 1)
        )[0]
        data.ptc_enable_mask = ptc_enable_reg

        for i in range(self.num_rooms):
            room = RoomData(index=i)
            room.temperature = decode_int16(room_temp_regs[i]) / 10
            room.setpoint = decode_int16(room_setpoint_regs[i]) / 10
            if i > 0:
                room.mid_temperature = decode_int16(mid_temp_regs[i - 1]) / 10
            room.ptc_active = bit(ptc_state_reg, i)
            room.ptc_enabled = bit(ptc_enable_reg, i)
            data.rooms[i] = room

        # --- Functional parameter block (305..315) ---
        func_regs = await self.hub.async_read_holding_registers(
            REG_FUNCTION_BLOCK_BASE, REG_FUNCTION_BLOCK_COUNT
        )

        def func(addr: int) -> int:
            return func_regs[addr - REG_FUNCTION_BLOCK_BASE]

        data.function_block = {
            "cooling_enable_write": func(REG_COOLING_ENABLE_WRITE),
            "cooling_enable_read": func(REG_COOLING_ENABLE_READ),
            "fan_stage_write": func(REG_FAN_STAGE_WRITE),
            "fan_stage_read": func(REG_FAN_STAGE_READ),
            "fan_auto_write": func(REG_FAN_AUTO_WRITE),
            "fan_auto_read": func(REG_FAN_AUTO_READ),
            "fan_intensive_write": func(REG_FAN_INTENSIVE_WRITE),
            "fan_intensive_read": func(REG_FAN_INTENSIVE_READ),
            "operating_mode_write": func(REG_OPERATING_MODE_WRITE),
            "operating_mode_read": func(REG_OPERATING_MODE_READ),
        }

        capability_reg = func(REG_CAPABILITY_FLAGS)
        data.capabilities = {
            key: bit(capability_reg, idx) for idx, key in CAPABILITY_FLAGS.items()
        }

        # --- Messages (380) ---
        messages_reg = (await self.hub.async_read_holding_registers(REG_MESSAGES, 1))[0]
        data.messages = {
            key: bit(messages_reg, idx) for idx, key in MESSAGE_FLAGS.items()
        }

        # --- External sensors ---
        if self.num_co2_sensors:
            co2_regs = await self.hub.async_read_holding_registers(
                REG_CO2_BASE, self.num_co2_sensors
            )
            data.co2 = {i: co2_regs[i] for i in range(self.num_co2_sensors)}
        if self.num_rf_sensors:
            rf_regs = await self.hub.async_read_holding_registers(
                REG_RF_BASE, self.num_rf_sensors
            )
            data.humidity = {i: rf_regs[i] for i in range(self.num_rf_sensors)}

        return data

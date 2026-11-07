"""DataUpdateCoordinator for the Proxon FWT Modbus integration."""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .const import (
    CAPABILITY_FLAGS,
    CONF_BOOST_MINUTES,
    DEFAULT_BOOST_MINUTES,
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
from .logic import Boost, FanStageTracker, RunStats, boost_kind
from .hub import ProxonModbusError, ProxonModbusHub, bit, decode_int16

_LOGGER = logging.getLogger(__name__)

# Repair issues: raised only after a problem has persisted, so a brief
# glitch doesn't nag. Cleared automatically as soon as things work again.
CONNECTION_ISSUE_AFTER = 600  # seconds of failed polls
WRITE_ISSUE_AFTER = 3  # consecutive failed writes

# Independently polled register blocks; a failing block only makes the
# entities that depend on it unavailable (see ProxonEntity.available).
BLOCK_DEVICE = "device"
BLOCK_ROOMS = "rooms"
BLOCK_PTC = "ptc"
BLOCK_FUNCTION = "function"
BLOCK_MESSAGES = "messages"
BLOCK_CO2 = "co2"
BLOCK_HUMIDITY = "humidity"


STATS_SAVE_INTERVAL = 300  # seconds between statistics writes


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
    # Names of the register blocks that failed to read in this poll.
    failed: set[str] = field(default_factory=set)


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
        # Most recent failed write, shown by the "Last write error" diagnostic
        # sensor so a rejected command is visible without reading the log.
        self.last_write_error: str | None = None
        self.last_write_error_at: datetime | None = None
        self.write_error_count = 0
        # Fan stage restore: the unit raises the fan stage whenever the heat
        # pump starts and never lowers it again. We remember the stage the
        # user picked while the heat pump was idle and write it back once the
        # heat pump has stopped. See _track_fan_stage.
        self.fan_tracker = FanStageTracker()  # .enabled set by the "restore fan stage" switch
        self.fan_stage_restored_at: datetime | None = None
        # Persisted heat pump / filter statistics.
        self.stats = RunStats()
        self._store: Store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.stats")
        # Boost ventilation (Stoßlüften) with automatic return to the previous state.
        self.boost = Boost()
        self._stats_saved_at = float("-inf")
        self._boost_store: Store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.boost")
        self._boost_cancel: CALLBACK_TYPE | None = None
        self._scan_interval = scan_interval
        self._last_poll: float | None = None
        self._fail_since: float | None = None
        self._write_fail_streak = 0

    async def _async_update_data(self) -> ProxonData:
        try:
            data = await self._async_read_all()
        except ProxonModbusError as err:
            now = time.monotonic()
            if self._fail_since is None:
                self._fail_since = now
            if now - self._fail_since >= CONNECTION_ISSUE_AFTER:
                self._set_issue("connection_lost", True, ir.IssueSeverity.ERROR)
            raise UpdateFailed(str(err)) from err
        self._fail_since = None
        self._set_issue("connection_lost", False)
        if not self.boost.active:  # the unit's fan stage is deliberately changed during a boost
            self._track_fan_stage(data)
        self._track_stats(data)
        return data

    def _set_issue(
        self,
        key: str,
        active: bool,
        severity: ir.IssueSeverity = ir.IssueSeverity.WARNING,
        **placeholders: str,
    ) -> None:
        assert self.config_entry is not None
        issue_id = f"{key}_{self.config_entry.entry_id}"
        if active:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                issue_id,
                is_fixable=False,
                severity=severity,
                translation_key=key,
                translation_placeholders={"name": self.config_entry.title, **placeholders},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)

    def _track_fan_stage(self, data: ProxonData) -> None:
        """Let the tracker learn/restore the fan stage (see logic.FanStageTracker)."""
        if (
            BLOCK_FUNCTION in data.failed
            or BLOCK_MESSAGES in data.failed
            or not data.function_block
        ):
            return
        func = data.function_block
        running = bool(
            data.messages.get("heat_pump_heating") or data.messages.get("heat_pump_cooling")
        )
        restore = self.fan_tracker.update(
            running=running,
            mode=func.get("operating_mode_read"),
            auto=bool(func.get("fan_auto_read")),
            stage=func.get("fan_stage_read"),
        )
        if restore is not None:
            assert self.config_entry is not None
            self.config_entry.async_create_background_task(
                self.hass,
                self._async_restore_fan_stage(restore),
                "proxon_restore_fan_stage",
            )

    def _track_stats(self, data: ProxonData) -> None:
        """Accumulate heat pump runtime/starts and filter hours."""
        now = time.monotonic()
        last, self._last_poll = self._last_poll, now
        if BLOCK_MESSAGES in data.failed:
            return
        elapsed = 0.0 if last is None else min(now - last, 3 * self._scan_interval)
        mode = data.function_block.get("operating_mode_read") if data.function_block else None
        self.stats.update(
            dt_util.now().date(),
            elapsed,
            running=bool(
                data.messages.get("heat_pump_heating") or data.messages.get("heat_pump_cooling")
            ),
            unit_on=None if mode is None else mode != 0,
            filter_due=data.messages.get("filter_device"),
            recirc_due=data.messages.get("filter_recirculation"),
        )
        days = self.stats.filter_shutdown_days()
        self._set_issue(
            "filter_due",
            days is not None,
            ir.IssueSeverity.ERROR if days is not None and days <= 7 else ir.IssueSeverity.WARNING,
            days=str(days),
        )
        # async_delay_save restarts its timer on every call, so calling it each poll would never write.
        now = time.monotonic()
        if now - self._stats_saved_at >= STATS_SAVE_INTERVAL:
            self._stats_saved_at = now
            self._store.async_delay_save(self.stats.as_dict, 1)

    async def async_save_stats(self) -> None:
        """Write the statistics right away (entry unload / reload)."""
        await self._store.async_save(self.stats.as_dict())

    def async_mark_filter_changed(self) -> None:
        """The user replaced the device filter ("Filter changed" button)."""
        self.stats.mark_filter_changed(manual=True)
        self._set_issue("filter_due", False)
        self._store.async_delay_save(self.stats.as_dict, 5)
        self.async_update_listeners()

    async def async_load_stats(self) -> None:
        self.stats.load(await self._store.async_load())
        self.boost.load(await self._boost_store.async_load())
        if self.boost.active:  # HA restarted during a boost: finish it on time (or right away)
            self._schedule_boost_end(max(5.0, self.boost.remaining(time.time()) or 0.0))

    # ---- boost ventilation ------------------------------------------------

    @property
    def boost_possible(self) -> bool:
        return boost_kind(self.data.capabilities, self.data.function_block) is not None

    @property
    def boost_minutes(self) -> int:
        assert self.config_entry is not None
        return int(self.config_entry.options.get(CONF_BOOST_MINUTES, DEFAULT_BOOST_MINUTES))

    def _schedule_boost_end(self, seconds: float) -> None:
        self.async_cancel_boost_timer()
        self._boost_cancel = async_call_later(self.hass, seconds, self._async_boost_expired)

    def async_cancel_boost_timer(self) -> None:
        if self._boost_cancel is not None:
            self._boost_cancel()
            self._boost_cancel = None

    async def async_start_boost(self, minutes: float | None = None) -> None:
        """Run the fan at the highest level for a while, then put everything back."""
        kind = boost_kind(self.data.capabilities, self.data.function_block)
        if kind is None:
            raise HomeAssistantError("Boost ventilation is not available in the current operating mode")
        minutes = minutes or self.boost_minutes
        func = self.data.function_block
        if not self.boost.active:
            if kind == "intensive":
                await self.async_write_register(REG_FAN_INTENSIVE_WRITE, 1)
            else:
                if func.get("fan_auto_read"):
                    await self.async_write_register(REG_FAN_AUTO_WRITE, 0)
                await self.async_write_register(REG_FAN_STAGE_WRITE, 4)
        self.boost.start(time.time(), minutes, kind, func.get("fan_stage_read"), bool(func.get("fan_auto_read")))
        self._boost_store.async_delay_save(self.boost.as_dict, 1)
        self._schedule_boost_end(minutes * 60)
        self.async_update_listeners()

    async def async_end_boost(self) -> None:
        """Back to the state before the boost. Raises if the unit rejects the write; the boost then stays active."""
        if not self.boost.active:
            return
        self.async_cancel_boost_timer()
        try:
            if self.boost.kind == "intensive":
                await self.async_write_register(REG_FAN_INTENSIVE_WRITE, 0)
            else:
                if self.boost.stage is not None:
                    await self.async_write_register(REG_FAN_STAGE_WRITE, self.boost.stage)
                if self.boost.auto:
                    await self.async_write_register(REG_FAN_AUTO_WRITE, 1)
        except ProxonModbusError:
            self._schedule_boost_end(60)  # retry
            raise
        self.boost.clear()
        self._boost_store.async_delay_save(self.boost.as_dict, 1)
        self.async_update_listeners()

    async def _async_boost_expired(self, _now: datetime) -> None:
        self._boost_cancel = None
        try:
            await self.async_end_boost()
        except ProxonModbusError:
            _LOGGER.warning("Could not end the boost ventilation, retrying in a minute")

    async def _async_restore_fan_stage(self, stage: int) -> None:
        try:
            await self.async_write_register(REG_FAN_STAGE_WRITE, stage)
        except ProxonModbusError:
            return  # recorded by async_write_register ("Last write error")
        self.fan_stage_restored_at = dt_util.utcnow()
        self.async_update_listeners()

    async def async_write_register(self, address: int, value: int) -> None:
        """Write a "Soll" register, then refresh once the device has had a
        moment to apply it and reflect the change in its "Ist" register."""
        try:
            await self.hub.async_write_register(address, value)
        except ProxonModbusError as err:
            self.last_write_error = str(err)[:255]
            self.last_write_error_at = dt_util.utcnow()
            self.write_error_count += 1
            self._write_fail_streak += 1
            if self._write_fail_streak >= WRITE_ISSUE_AFTER:
                self._set_issue("write_failing", True)
            self.async_update_listeners()
            raise
        self._write_fail_streak = 0
        self._set_issue("write_failing", False)
        await asyncio.sleep(WRITE_SETTLE_DELAY)
        await self.async_request_refresh()

    async def _async_read_all(self) -> ProxonData:
        """Read every register block independently.

        A block that fails to read only marks its own entities unavailable
        (see `ProxonData.failed` and `ProxonEntity.available`); the whole
        update fails only when no block answered at all, which usually means
        the connection is gone.
        """
        data = ProxonData(
            rooms={i: RoomData(index=i) for i in range(self.num_rooms)}
        )
        blocks = {
            BLOCK_DEVICE: self._read_device,
            BLOCK_ROOMS: self._read_rooms,
            BLOCK_PTC: self._read_ptc,
            BLOCK_FUNCTION: self._read_function,
            BLOCK_MESSAGES: self._read_messages,
            BLOCK_CO2: self._read_co2,
            BLOCK_HUMIDITY: self._read_humidity,
        }
        first_error: ProxonModbusError | None = None
        for name, reader in blocks.items():
            try:
                await reader(data)
            except ProxonModbusError as err:
                _LOGGER.debug("Register block %s failed to read: %s", name, err)
                data.failed.add(name)
                first_error = first_error or err
        if first_error is not None and len(data.failed) == len(blocks):
            raise first_error
        return data

    async def _read_device(self, data: ProxonData) -> None:
        # Device / system data (100..115)
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


    async def _read_rooms(self, data: ProxonData) -> None:
        # Room actual temperature (150..)
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

        for i in range(self.num_rooms):
            room = data.rooms[i]
            room.temperature = decode_int16(room_temp_regs[i]) / 10
            room.setpoint = decode_int16(room_setpoint_regs[i]) / 10
            if i > 0:
                room.mid_temperature = decode_int16(mid_temp_regs[i - 1]) / 10

    async def _read_ptc(self, data: ProxonData) -> None:
        ptc_state_reg = (
            await self.hub.async_read_holding_registers(REG_PTC_STATE, 1)
        )[0]
        ptc_enable_reg = (
            await self.hub.async_read_holding_registers(REG_PTC_ENABLE_READ, 1)
        )[0]
        data.ptc_enable_mask = ptc_enable_reg
        for i in range(self.num_rooms):
            data.rooms[i].ptc_active = bit(ptc_state_reg, i)
            data.rooms[i].ptc_enabled = bit(ptc_enable_reg, i)

    async def _read_function(self, data: ProxonData) -> None:
        # Functional parameter block (305..315)
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


    async def _read_messages(self, data: ProxonData) -> None:
        # Messages (380)
        messages_reg = (await self.hub.async_read_holding_registers(REG_MESSAGES, 1))[0]
        data.messages = {
            key: bit(messages_reg, idx) for idx, key in MESSAGE_FLAGS.items()
        }


    async def _read_co2(self, data: ProxonData) -> None:
        if self.num_co2_sensors:
            co2_regs = await self.hub.async_read_holding_registers(
                REG_CO2_BASE, self.num_co2_sensors
            )
            data.co2 = {i: co2_regs[i] for i in range(self.num_co2_sensors)}

    async def _read_humidity(self, data: ProxonData) -> None:
        if self.num_rf_sensors:
            rf_regs = await self.hub.async_read_holding_registers(
                REG_RF_BASE, self.num_rf_sensors
            )
            data.humidity = {i: rf_regs[i] for i in range(self.num_rf_sensors)}

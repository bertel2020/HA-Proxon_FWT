"""Climate entities for the Proxon FWT integration — one per room.

Each room exposes its actual temperature (register 150+n) and its confirmed
setpoint (register 180+n) as read-only state, and accepts a new setpoint via
`set_temperature`, which writes the *separate* write-only setpoint register
(200+n). The device applies the new setpoint asynchronously; register 180+n
is expected to reflect it on the next poll.
"""
from __future__ import annotations

import math
from typing import Any

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .const import (
    CONF_COOLING_AVAILABLE,
    CONF_ROOM_NAMES,
    DEFAULT_COOLING_AVAILABLE,
    REG_ROOM_SETPOINT_WRITE_BASE,
    ROOM_SETPOINT_MAX,
    ROOM_SETPOINT_MID_SPAN,
    ROOM_SETPOINT_MIN,
)
from .coordinator import BLOCK_ROOMS, ProxonModbusCoordinator
from .entity import ProxonRoomEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up one climate entity per configured room."""
    coordinator = entry.runtime_data
    room_names = entry.options.get(CONF_ROOM_NAMES, [])

    async_add_entities(
        ProxonRoomClimate(coordinator, entry.entry_id, i, room_name)
        for i, room_name in enumerate(room_names)
        if room_name  # an empty name means this room slot is not installed
    )


class ProxonRoomClimate(ProxonRoomEntity, ClimateEntity):
    """A single room of the Proxon FWT, controlled via its setpoint registers.

    This is the room device's main entity, so it takes no name of its own
    (`_attr_has_entity_name` on the base entity makes it show up as just the
    room's device name, e.g. "Wohnen" rather than "Wohnen Wohnen").

    The settable range follows the device: room 1 takes 18-30 degC directly,
    every other room its mid temperature +/- 3 degC. The mode is HEAT, or
    HEAT_COOL while cooling is available and enabled on the unit.
    """

    _blocks = frozenset({BLOCK_ROOMS})
    _attr_name = None
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE
    _attr_target_temperature_step = 1

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        room_index: int,
        room_name: str,
    ) -> None:
        super().__init__(coordinator, entry_id, room_index, room_name, f"room_{room_index}_climate")

    @property
    def hvac_mode(self) -> HVACMode:
        """HEAT_COOL only if the unit has cooling and it is enabled, else HEAT."""
        options = self.coordinator.config_entry.options
        if not options.get(CONF_COOLING_AVAILABLE, DEFAULT_COOLING_AVAILABLE):
            return HVACMode.HEAT
        data = self.coordinator.data
        if data.capabilities.get("cooling_enable_possible") and data.function_block.get(
            "cooling_enable_read"
        ):
            return HVACMode.HEAT_COOL
        return HVACMode.HEAT

    @property
    def hvac_modes(self) -> list[HVACMode]:
        return [self.hvac_mode]

    def _setpoint_limits(self) -> tuple[int, int]:
        """Settable range: 18-30 degC for room 1, otherwise the room's mid
        temperature +/- 3 degC (clamped to 18-30, whole degrees)."""
        if self._room_index == 0:
            return ROOM_SETPOINT_MIN, ROOM_SETPOINT_MAX
        room = self.coordinator.data.rooms.get(self._room_index)
        mid = room.mid_temperature if room else None
        # An implausible mid temperature (not reported by the panel) falls
        # back to the full device range.
        if mid is None or not ROOM_SETPOINT_MIN - 8 <= mid <= ROOM_SETPOINT_MAX + 5:
            return ROOM_SETPOINT_MIN, ROOM_SETPOINT_MAX
        low = max(ROOM_SETPOINT_MIN, math.ceil(mid - ROOM_SETPOINT_MID_SPAN))
        high = min(ROOM_SETPOINT_MAX, math.floor(mid + ROOM_SETPOINT_MID_SPAN))
        return (low, high) if low <= high else (ROOM_SETPOINT_MIN, ROOM_SETPOINT_MAX)

    @property
    def min_temp(self) -> float:
        return self._setpoint_limits()[0]

    @property
    def max_temp(self) -> float:
        return self._setpoint_limits()[1]

    @property
    def current_temperature(self) -> float | None:
        room = self.coordinator.data.rooms.get(self._room_index)
        return room.temperature if room else None

    @property
    def target_temperature(self) -> float | None:
        room = self.coordinator.data.rooms.get(self._room_index)
        return room.setpoint if room else None

    async def async_set_temperature(self, **kwargs: Any) -> None:
        temperature = kwargs.get(ATTR_TEMPERATURE)
        if temperature is None:
            return
        register = REG_ROOM_SETPOINT_WRITE_BASE + self._room_index
        await self.coordinator.async_write_register(register, round(temperature))

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        """The FWT has no per-room on/off; only HEAT_COOL is supported."""
        return

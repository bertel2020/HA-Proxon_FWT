"""Climate entities for the Proxon FWT integration — one per room.

Each room exposes its actual temperature (register 150+n) and its confirmed
setpoint (register 180+n) as read-only state, and accepts a new setpoint via
`set_temperature`, which writes the *separate* write-only setpoint register
(200+n). The device applies the new setpoint asynchronously; register 180+n
is expected to reflect it on the next poll.
"""
from __future__ import annotations

from typing import Any

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.const import ATTR_TEMPERATURE, CONF_NAME, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .const import (
    CONF_ROOM_NAMES,
    REG_ROOM_SETPOINT_WRITE_BASE,
    ROOM_SETPOINT_MAX,
    ROOM_SETPOINT_MIN,
)
from .coordinator import ProxonModbusCoordinator
from .entity import ProxonEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up one climate entity per configured room."""
    coordinator = entry.runtime_data
    device_name = entry.data[CONF_NAME]
    room_names = entry.options.get(CONF_ROOM_NAMES, [])

    async_add_entities(
        ProxonRoomClimate(coordinator, entry.entry_id, device_name, i, room_name)
        for i, room_name in enumerate(room_names)
    )


class ProxonRoomClimate(ProxonEntity, ClimateEntity):
    """A single room of the Proxon FWT, controlled via its setpoint registers."""

    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE
    _attr_hvac_modes = [HVACMode.HEAT_COOL]
    _attr_hvac_mode = HVACMode.HEAT_COOL
    _attr_min_temp = ROOM_SETPOINT_MIN
    _attr_max_temp = ROOM_SETPOINT_MAX
    _attr_target_temperature_step = 1

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        room_index: int,
        room_name: str,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, f"room_{room_index}_climate")
        self._room_index = room_index
        self._attr_name = room_name

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

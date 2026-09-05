"""Switch entities for the Proxon FWT integration."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.switch import SwitchEntity, SwitchEntityDescription
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .const import (
    CONF_COOLING_AVAILABLE,
    CONF_ROOM_NAMES,
    DEFAULT_COOLING_AVAILABLE,
    ECO_MODE_VALUES,
    INTENSIVE_VENTILATION_MODE_VALUES,
    REG_COOLING_ENABLE_WRITE,
    REG_FAN_AUTO_WRITE,
    REG_FAN_INTENSIVE_WRITE,
    REG_PTC_ENABLE_WRITE,
)
from .coordinator import ProxonData, ProxonModbusCoordinator
from .entity import ProxonCentralEntity, ProxonRoomEntity
from .hub import set_bit


def _always_available(data: ProxonData) -> bool:
    return True


def _available_in_eco_mode(data: ProxonData) -> bool:
    return data.function_block.get("operating_mode_read") in ECO_MODE_VALUES


def _available_in_comfort_mode(data: ProxonData) -> bool:
    return data.function_block.get("operating_mode_read") in INTENSIVE_VENTILATION_MODE_VALUES


def _available_when_cooling_possible(data: ProxonData) -> bool:
    # Live register 315 capability bit. Only consulted at all when
    # CONF_COOLING_AVAILABLE hasn't ruled cooling out entirely for this
    # unit - see async_setup_entry, which skips creating this switch
    # altogether in that case.
    return bool(data.capabilities.get("cooling_enable_possible"))


@dataclass(frozen=True, kw_only=True)
class ProxonSwitchDescription(SwitchEntityDescription):
    is_on_fn: Callable[[ProxonData], bool | None]
    write_register: int
    available_fn: Callable[[ProxonData], bool] = _always_available


FUNCTION_SWITCHES: tuple[ProxonSwitchDescription, ...] = (
    ProxonSwitchDescription(
        key="cooling_enable",
        translation_key="cooling_enable",
        icon="mdi:snowflake",
        is_on_fn=lambda d: bool(d.function_block.get("cooling_enable_read")),
        write_register=REG_COOLING_ENABLE_WRITE,
        # Goes unavailable when the device's own capability bit (register
        # 315, bit 8) reports cooling as not currently possible. This
        # switch isn't created at all if CONF_COOLING_AVAILABLE says the
        # unit has no cooling support - see async_setup_entry.
        available_fn=_available_when_cooling_possible,
    ),
    ProxonSwitchDescription(
        key="fan_auto",
        translation_key="fan_auto",
        icon="mdi:fan-auto",
        is_on_fn=lambda d: bool(d.function_block.get("fan_auto_read")),
        write_register=REG_FAN_AUTO_WRITE,
        # Only meaningful in Eco summer/winter - matches both the Symcon
        # export and the live automation this integration replaces.
        available_fn=_available_in_eco_mode,
    ),
    ProxonSwitchDescription(
        key="fan_intensive",
        translation_key="fan_intensive",
        icon="mdi:fan-alert",
        is_on_fn=lambda d: bool(d.function_block.get("fan_intensive_read")),
        write_register=REG_FAN_INTENSIVE_WRITE,
        # Only available in Komfort mode - same source as above.
        available_fn=_available_in_comfort_mode,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Proxon FWT switches from a config entry."""
    coordinator = entry.runtime_data
    device_name = entry.data[CONF_NAME]
    cooling_available = entry.options.get(CONF_COOLING_AVAILABLE, DEFAULT_COOLING_AVAILABLE)

    switch_descriptions = (
        FUNCTION_SWITCHES
        if cooling_available
        else tuple(d for d in FUNCTION_SWITCHES if d.key != "cooling_enable")
    )
    entities: list[SwitchEntity] = [
        ProxonFunctionSwitch(coordinator, entry.entry_id, device_name, description)
        for description in switch_descriptions
    ]

    room_names = entry.options.get(CONF_ROOM_NAMES, [])
    for i, room_name in enumerate(room_names):
        entities.append(
            ProxonRoomPtcEnableSwitch(coordinator, entry.entry_id, i, room_name)
        )

    async_add_entities(entities)


class ProxonFunctionSwitch(ProxonCentralEntity, SwitchEntity):
    """A simple write-register / read-back-register switch."""

    entity_description: ProxonSwitchDescription

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        description: ProxonSwitchDescription,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, description.key)
        self.entity_description = description

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        return self.entity_description.available_fn(self.coordinator.data)

    @property
    def is_on(self) -> bool | None:
        return self.entity_description.is_on_fn(self.coordinator.data)

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.coordinator.async_write_register(self.entity_description.write_register, 1)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.coordinator.async_write_register(self.entity_description.write_register, 0)


class ProxonRoomPtcEnableSwitch(ProxonRoomEntity, SwitchEntity):
    """Enable/disable the PTC element for one room.

    Registers 301 (write) and 302 (readback) are single 16-bit bitfields
    covering all 16 rooms, so toggling one room means flipping a single bit
    while preserving every other room's currently-known state (register 302).
    """

    _attr_translation_key = "ptc_enable"
    _attr_icon = "mdi:radiator"

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        room_index: int,
        room_name: str,
    ) -> None:
        super().__init__(coordinator, entry_id, room_index, room_name, f"room_{room_index}_ptc_enable")

    @property
    def is_on(self) -> bool | None:
        room = self.coordinator.data.rooms.get(self._room_index)
        return room.ptc_enabled if room else None

    async def _async_set(self, on: bool) -> None:
        current_mask = self.coordinator.data.ptc_enable_mask
        new_mask = set_bit(current_mask, self._room_index, on)
        await self.coordinator.async_write_register(REG_PTC_ENABLE_WRITE, new_mask)

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._async_set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._async_set(False)

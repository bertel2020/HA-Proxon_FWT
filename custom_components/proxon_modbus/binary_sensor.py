"""Binary sensor entities for the Proxon FWT integration."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .const import CAPABILITY_FLAGS, CONF_ROOM_NAMES, MESSAGE_FLAGS
from .coordinator import ProxonData, ProxonModbusCoordinator
from .entity import ProxonCentralEntity, ProxonRoomEntity

# Surfaced separately (always visible, not a diagnostic-disabled flag) so it's
# easy to spot in the central device whether cooling is even a possibility on
# this unit - other controls/sensors gate on it too, see
# _available_when_cooling_possible / MESSAGE_AVAILABILITY below.
_COOLING_CAPABILITY_KEY = "cooling_enable_possible"


@dataclass(frozen=True, kw_only=True)
class ProxonBinarySensorDescription(BinarySensorEntityDescription):
    value_fn: Callable[[ProxonData], bool | None]


DEVICE_BINARY_SENSORS: tuple[ProxonBinarySensorDescription, ...] = (
    ProxonBinarySensorDescription(
        key="bypass_active",
        translation_key="bypass_active",
        icon="mdi:valve",
        value_fn=lambda d: d.device.get("bypass_active"),
    ),
    ProxonBinarySensorDescription(
        key="cooling_available",
        translation_key="cooling_available",
        icon="mdi:snowflake-check",
        value_fn=lambda d: d.capabilities.get(_COOLING_CAPABILITY_KEY),
    ),
)

MESSAGE_DEVICE_CLASSES: dict[str, BinarySensorDeviceClass | None] = {
    "error_system": BinarySensorDeviceClass.PROBLEM,
    "filter_device": BinarySensorDeviceClass.PROBLEM,
    "filter_recirculation": BinarySensorDeviceClass.PROBLEM,
    "heat_pump_heating": BinarySensorDeviceClass.RUNNING,
    "heat_pump_cooling": BinarySensorDeviceClass.RUNNING,
    "heat_pump_continuous": BinarySensorDeviceClass.RUNNING,
}

# Hide message flags that can't possibly occur when the underlying function
# isn't available on this unit at all.
MESSAGE_AVAILABILITY: dict[str, Callable[[ProxonData], bool]] = {
    "heat_pump_cooling": lambda d: bool(d.capabilities.get(_COOLING_CAPABILITY_KEY)),
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Proxon FWT binary sensors from a config entry."""
    coordinator = entry.runtime_data
    device_name = entry.data[CONF_NAME]

    entities: list[BinarySensorEntity] = [
        ProxonBinarySensor(coordinator, entry.entry_id, device_name, description)
        for description in DEVICE_BINARY_SENSORS
    ]

    for key in MESSAGE_FLAGS.values():
        entities.append(
            ProxonMessageBinarySensor(coordinator, entry.entry_id, device_name, key)
        )

    for key in CAPABILITY_FLAGS.values():
        if key == _COOLING_CAPABILITY_KEY:
            continue  # already surfaced as the always-visible "cooling_available" sensor above
        entities.append(
            ProxonCapabilityBinarySensor(coordinator, entry.entry_id, device_name, key)
        )

    room_names = entry.options.get(CONF_ROOM_NAMES, [])
    for i, room_name in enumerate(room_names):
        entities.append(
            ProxonRoomPtcActiveSensor(coordinator, entry.entry_id, i, room_name)
        )

    async_add_entities(entities)


class ProxonBinarySensor(ProxonCentralEntity, BinarySensorEntity):
    """A device-level Proxon FWT binary sensor."""

    entity_description: ProxonBinarySensorDescription

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        description: ProxonBinarySensorDescription,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, description.key)
        self.entity_description = description

    @property
    def is_on(self) -> bool | None:
        return self.entity_description.value_fn(self.coordinator.data)


class ProxonMessageBinarySensor(ProxonCentralEntity, BinarySensorEntity):
    """A message/status flag decoded from register 380."""

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        key: str,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, f"message_{key}")
        self._key = key
        self._attr_translation_key = key
        self._attr_device_class = MESSAGE_DEVICE_CLASSES.get(key)

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        predicate = MESSAGE_AVAILABILITY.get(self._key)
        return predicate(self.coordinator.data) if predicate else True

    @property
    def is_on(self) -> bool | None:
        return self.coordinator.data.messages.get(self._key)


class ProxonCapabilityBinarySensor(ProxonCentralEntity, BinarySensorEntity):
    """A 'this option is currently selectable' diagnostic flag (register 315)."""

    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_entity_registry_enabled_default = False

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        key: str,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, f"capability_{key}")
        self._key = key
        self._attr_translation_key = key

    @property
    def is_on(self) -> bool | None:
        return self.coordinator.data.capabilities.get(self._key)


class ProxonRoomPtcActiveSensor(ProxonRoomEntity, BinarySensorEntity):
    """Whether the room's PTC element is currently active."""

    _attr_device_class = BinarySensorDeviceClass.HEAT
    _attr_translation_key = "ptc_active"

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        room_index: int,
        room_name: str,
    ) -> None:
        super().__init__(coordinator, entry_id, room_index, room_name, f"room_{room_index}_ptc_active")

    @property
    def is_on(self) -> bool | None:
        room = self.coordinator.data.rooms.get(self._room_index)
        return room.ptc_active if room else None

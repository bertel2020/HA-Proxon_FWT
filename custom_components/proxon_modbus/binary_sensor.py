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
from .const import (
    CAPABILITY_FLAGS,
    CONF_COOLING_AVAILABLE,
    CONF_ROOM_NAMES,
    DEFAULT_COOLING_AVAILABLE,
    MESSAGE_FLAGS,
)
from .coordinator import ProxonData, ProxonModbusCoordinator
from .entity import ProxonCentralEntity, ProxonRoomEntity

# Surfaced separately (always visible, not a diagnostic-disabled flag) so
# it's easy to spot what the device itself reports for cooling support -
# read from the live register 315 bit 8. Not created at all if
# CONF_COOLING_AVAILABLE says this unit has no cooling support in the
# first place - see async_setup_entry.
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
    # Deliberately no device_class for the three heat-pump flags:
    # BinarySensorDeviceClass.RUNNING renders as "In Betrieb"/"Außer
    # Betrieb", which reads as an availability judgement rather than a
    # plain on/off state - see the same reasoning for ptc_active.
}

# Hide message flags that can't possibly occur right now per the live
# capability bit. This entity isn't created at all if CONF_COOLING_AVAILABLE
# rules out cooling support entirely - see async_setup_entry.
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
    cooling_available = entry.options.get(CONF_COOLING_AVAILABLE, DEFAULT_COOLING_AVAILABLE)

    device_sensor_descriptions = (
        DEVICE_BINARY_SENSORS
        if cooling_available
        else tuple(d for d in DEVICE_BINARY_SENSORS if d.key != "cooling_available")
    )
    entities: list[BinarySensorEntity] = [
        ProxonBinarySensor(coordinator, entry.entry_id, device_name, description)
        for description in device_sensor_descriptions
    ]

    for key in MESSAGE_FLAGS.values():
        if key == "heat_pump_cooling" and not cooling_available:
            continue  # unit has no cooling support at all - see CONF_COOLING_AVAILABLE
        entities.append(
            ProxonMessageBinarySensor(coordinator, entry.entry_id, device_name, key)
        )

    for key in CAPABILITY_FLAGS.values():
        if key == _COOLING_CAPABILITY_KEY:
            continue  # handled above instead, as the always-visible "cooling_available" sensor (or dropped entirely, see cooling_available)
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
    """Whether the room's PTC element is currently active.

    Deliberately no device_class: BinarySensorDeviceClass.HEAT renders as
    "Normal"/"Hot" instead of a plain on/off, which reads as a temperature
    judgement rather than "is the heater element currently switched on".
    """

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

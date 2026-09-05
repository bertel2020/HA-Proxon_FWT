"""Common base entities for the Proxon FWT integration.

Entities attach to one of two Home Assistant devices: a single central
device for the FWT unit itself (device-level sensors, switches, selects),
and one device per configured room (climate, PTC state/enable, mid-room
temperature), linked to the central device via `via_device` so they show
up grouped underneath it.
"""
from __future__ import annotations

from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, MANUFACTURER, MODEL
from .coordinator import ProxonModbusCoordinator


def central_device_info(entry_id: str, device_name: str) -> DeviceInfo:
    """DeviceInfo for the FWT's single central device."""
    return DeviceInfo(
        identifiers={(DOMAIN, entry_id)},
        name=device_name,
        manufacturer=MANUFACTURER,
        model=MODEL,
    )


def room_device_info(entry_id: str, room_index: int, room_name: str) -> DeviceInfo:
    """DeviceInfo for a single room's own device, linked to the central one."""
    return DeviceInfo(
        identifiers={(DOMAIN, f"{entry_id}_room_{room_index}")},
        name=room_name,
        manufacturer=MANUFACTURER,
        model=MODEL,
        via_device=(DOMAIN, entry_id),
    )


class ProxonEntity(CoordinatorEntity[ProxonModbusCoordinator]):
    """Base entity shared by the central and room entity variants."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        unique_id_suffix: str,
        device_info: DeviceInfo,
    ) -> None:
        super().__init__(coordinator)
        self._entry_id = entry_id
        self._attr_unique_id = f"{entry_id}_{unique_id_suffix}"
        self._attr_device_info = device_info


class ProxonCentralEntity(ProxonEntity):
    """An entity tied to the FWT's central device (device-level functions)."""

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        unique_id_suffix: str,
    ) -> None:
        super().__init__(
            coordinator,
            entry_id,
            unique_id_suffix,
            central_device_info(entry_id, device_name),
        )


class ProxonRoomEntity(ProxonEntity):
    """An entity tied to a single room's own device.

    Each room gets its own Home Assistant device (named after the room) so
    its entities are grouped separately from the FWT's central functions,
    linked back to the central device via `via_device`.
    """

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        room_index: int,
        room_name: str,
        unique_id_suffix: str,
    ) -> None:
        super().__init__(
            coordinator,
            entry_id,
            unique_id_suffix,
            room_device_info(entry_id, room_index, room_name),
        )
        self._room_index = room_index

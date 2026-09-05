"""Common base entity for the Proxon FWT integration."""
from __future__ import annotations

from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, MANUFACTURER, MODEL
from .coordinator import ProxonModbusCoordinator


class ProxonEntity(CoordinatorEntity[ProxonModbusCoordinator]):
    """Base entity tying every Proxon entity to the single FWT device."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        unique_id_suffix: str,
    ) -> None:
        super().__init__(coordinator)
        self._entry_id = entry_id
        self._attr_unique_id = f"{entry_id}_{unique_id_suffix}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name=device_name,
            manufacturer=MANUFACTURER,
            model=MODEL,
        )

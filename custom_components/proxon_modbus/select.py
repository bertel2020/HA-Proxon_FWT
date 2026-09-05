"""Select entities for the Proxon FWT integration (fan stage, operating mode)."""
from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .const import (
    ECO_MODE_VALUES,
    FAN_STAGE_OPTIONS,
    OPERATING_MODE_WRITE_OPTIONS,
    REG_FAN_STAGE_WRITE,
    REG_OPERATING_MODE_WRITE,
)
from .coordinator import ProxonModbusCoordinator
from .entity import ProxonEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Proxon FWT select entities from a config entry."""
    coordinator = entry.runtime_data
    device_name = entry.data[CONF_NAME]

    async_add_entities(
        [
            ProxonFanStageSelect(coordinator, entry.entry_id, device_name),
            ProxonOperatingModeSelect(coordinator, entry.entry_id, device_name),
        ]
    )


class ProxonFanStageSelect(ProxonEntity, SelectEntity):
    """Select the ventilation (ECO) fan stage (register 307, read back 308).

    Only meaningful in Eco summer/winter — the manufacturer's own Symcon
    dashboard hides this control in every other operating mode, and the
    equivalent Home Assistant automation it was migrated from does the same.
    """

    _attr_translation_key = "fan_stage"
    _attr_icon = "mdi:fan"
    _attr_options = list(FAN_STAGE_OPTIONS.values())

    def __init__(
        self, coordinator: ProxonModbusCoordinator, entry_id: str, device_name: str
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, "fan_stage")

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        mode = self.coordinator.data.function_block.get("operating_mode_read")
        return mode in ECO_MODE_VALUES

    @property
    def current_option(self) -> str | None:
        value = self.coordinator.data.function_block.get("fan_stage_read")
        return FAN_STAGE_OPTIONS.get(value)

    async def async_select_option(self, option: str) -> None:
        value = next(k for k, v in FAN_STAGE_OPTIONS.items() if v == option)
        await self.coordinator.async_write_register(REG_FAN_STAGE_WRITE, value)


class ProxonOperatingModeSelect(ProxonEntity, SelectEntity):
    """Select the operating mode (register 313, read back 314).

    Register 314 can also report states (Notbetrieb, Einfrierschutz,
    Einregulierung) that cannot be selected directly; when the device is in
    one of those, `current_option` is None (see the `operating_mode_state`
    diagnostic sensor for the full picture).
    """

    _attr_translation_key = "operating_mode"
    _attr_icon = "mdi:heat-pump-outline"
    _attr_options = list(OPERATING_MODE_WRITE_OPTIONS.values())

    def __init__(
        self, coordinator: ProxonModbusCoordinator, entry_id: str, device_name: str
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, "operating_mode")

    @property
    def current_option(self) -> str | None:
        value = self.coordinator.data.function_block.get("operating_mode_read")
        return OPERATING_MODE_WRITE_OPTIONS.get(value)

    async def async_select_option(self, option: str) -> None:
        value = next(k for k, v in OPERATING_MODE_WRITE_OPTIONS.items() if v == option)
        await self.coordinator.async_write_register(REG_OPERATING_MODE_WRITE, value)

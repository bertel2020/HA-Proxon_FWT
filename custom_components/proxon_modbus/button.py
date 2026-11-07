"""Buttons of the Proxon FWT."""
from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .entity import ProxonCentralEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Proxon FWT buttons from a config entry."""
    async_add_entities(
        [ProxonFilterChangedButton(entry.runtime_data, entry.entry_id, entry.data[CONF_NAME])]
    )


class ProxonFilterChangedButton(ProxonCentralEntity, ButtonEntity):
    """Tell the integration the device filter has been replaced.

    The age bar and the forced-shutdown countdown restart from today. The
    integration also notices a replacement by itself when the unit clears its
    "change filter" message; the button covers the first start and units that
    clear the message late.
    """

    _attr_translation_key = "filter_changed"
    _attr_icon = "mdi:air-filter"

    def __init__(self, coordinator, entry_id: str, device_name: str) -> None:
        super().__init__(coordinator, entry_id, device_name, "filter_changed")

    @property
    def available(self) -> bool:
        return True

    async def async_press(self) -> None:
        self.coordinator.async_mark_filter_changed()

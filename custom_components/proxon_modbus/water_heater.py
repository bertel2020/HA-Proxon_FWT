"""Water heater platform: the hot water heat pump (TWWP)."""
from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .twwp_entity import TwwpWaterHeater, twwp_subentries


async def async_setup_entry(
    hass: HomeAssistant, entry: ProxonConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    for subentry, controller in twwp_subentries(entry):
        async_add_entities(
            [TwwpWaterHeater(entry, subentry, controller)],
            config_subentry_id=subentry.subentry_id,
        )

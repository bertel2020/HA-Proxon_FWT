"""Number platform: the target temperatures of the hot water heat pump (TWWP)."""
from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .twwp_entity import HYSTERESES, TARGETS, TwwpHysteresisNumber, TwwpTargetNumber, twwp_subentries


async def async_setup_entry(
    hass: HomeAssistant, entry: ProxonConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    for subentry, controller in twwp_subentries(entry):
        async_add_entities(
            [TwwpTargetNumber(entry, subentry, controller, target) for target in TARGETS]
            + [TwwpHysteresisNumber(entry, subentry, controller, key) for key in HYSTERESES],
            config_subentry_id=subentry.subentry_id,
        )

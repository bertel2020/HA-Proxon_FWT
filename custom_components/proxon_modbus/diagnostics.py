"""Diagnostics support for the Proxon FWT Modbus integration."""
from __future__ import annotations

from dataclasses import asdict
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.const import CONF_HOST
from homeassistant.core import HomeAssistant

from . import ProxonConfigEntry
from .const import CONF_SERIAL_PORT

TO_REDACT = {CONF_HOST, CONF_SERIAL_PORT}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ProxonConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    coordinator = entry.runtime_data
    data = coordinator.data
    return {
        "entry_data": async_redact_data(dict(entry.data), TO_REDACT),
        "options": dict(entry.options),
        "last_update_success": coordinator.last_update_success,
        "failed_blocks": sorted(data.failed) if data else [],
        "data": (
            {k: v for k, v in asdict(data).items() if k != "failed"} if data else None
        ),
    }

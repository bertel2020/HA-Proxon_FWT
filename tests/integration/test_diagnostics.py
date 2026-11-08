"""Diagnostics download: serializable, and the connection address is redacted."""
from __future__ import annotations

from pytest_homeassistant_custom_component.components.diagnostics import get_diagnostics_for_config_entry

from custom_components.proxon_modbus.const import DOMAIN


async def test_diagnostics_are_complete_and_redacted(hass, hass_client, setup_integration):
    entry = await setup_integration()
    result = await get_diagnostics_for_config_entry(hass, hass_client, entry)

    assert result["entry_data"]["host"] == "**REDACTED**"
    assert result["entry_data"]["unit_id"] == 10
    assert result["last_update_success"] is True
    assert result["failed_blocks"] == []
    assert result["data"]["device"]["temp_supply_air"] == 19.4
    assert result["statistics"] is not None
    assert "192.0.2.10" not in str(result)
    assert entry.domain == DOMAIN

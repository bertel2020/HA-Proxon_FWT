# Changelog

*[🇩🇪 Deutsche Version](CHANGELOG.md)*

All notable changes to this project are documented here. Versions follow the
`version` field in `custom_components/proxon_modbus/manifest.json`.

## 2.1.0 – 2026-11-02

**New**
- **Dashboard card `custom:proxon-fwt-card`:** the integration ships its own card (operating mode, air paths as a cross-flow heat exchanger, ventilation, heat pump, refrigerant circuit, status, rooms). It is loaded automatically and finds the entities by itself; power consumption and outdoor temperature are optional and can be replaced by your own entities. See the README for details.
- **Side panel "Proxon FWT":** its own sidebar entry with an animated system diagram (including all temperature probes), key figures with a calculated heat recovery rate, room heat map, notice banners and a 24-hour history. The card `custom:proxon-fwt-card` gained the optional sections `schema`, `kpi`, `alerts` and `history`; operating-mode, fan and room controls now have icons and colours.
- **Dashboard settings in the integration options:** outdoor side of the heat exchanger, own power sensor and own outdoor temperature sensor can be set centrally and apply to the card and side panel in every browser (read through the new websocket command `proxon_modbus/settings`). Values in the card take precedence.
- **Cooling mode in the system diagram:** in cooling mode the diagram reverses the refrigerant circuit (evaporator and condenser swap sides).
- **Restore fan stage after the heat pump has run:** The unit raises the fan stage when the heat pump starts and never lowers it again. The new switch "Restore fan stage after heat pump" (off by default) remembers the stage you chose while the heat pump was idle (Eco summer/winter only, fan auto off) and sets it back after the run. The card and side panel show the preferred stage.
- **Heat pump and filter statistics:** New sensors for heat pump runtime and starts (today and total) and operating hours of the device and recirculation filters. The integration counts them itself and they survive restarts. Filter hours start over when the unit clears "change filter". They only count while the unit is not off.
- **Graphical card editor** for `custom:proxon-fwt-card`.
- **Blueprints:** "CO₂-controlled intensive ventilation" and "Report maintenance and faults" in `blueprints/automation/proxon_modbus`.
- **Room → Home Assistant area:** the names step of the options lets you optionally assign each room to an area. The room's device is then placed in that area. Rooms without an area stay untouched (areas set by hand are never overwritten).
- **Skip rooms that are not installed:** an empty room name in the names step of the options leaves that room out — no device, no entities. This covers gaps in the room numbering (e.g. rooms 1–3 and 5 but no room 4); the registers are still read because the order determines the register address.
- **Orphaned room devices are removed:** when the room count is reduced in the options, the devices of rooms that are no longer configured disappear from Home Assistant on reload (only this integration's devices).
- **Change the connection later:** new reconfigure step (Settings → Devices & Services → Proxon FWT → ⋮ → **Reconfigure**): host, port, serial parameters, unit ID and even switching between TCP and RTU can be changed without deleting the integration. The form is prefilled with the current values and the connection is tested before saving. Entities and history are kept.
- **Diagnostics download:** Settings → Devices & Services → Proxon FWT → Download diagnostics (host/serial port redacted), including the blocks that failed in the last poll and the decoded data.
- **New diagnostic sensor "Last write error":** shows the most recent failed write (register, value, reason). Attributes: time and number of errors since startup. A command the device rejected is visible without reading the log.

**Improved**
- **Failures per register block:** if reading one register block fails (device briefly busy, block not present), only the entities depending on it become unavailable. The whole poll now only fails when no block answers at all (typically a lost connection). Previously a single read error made *all* entities unavailable.
- **Device page grouped better:** the technical refrigerant-circuit values (temperature before evaporator, evaporator, after preheater, before condenser, condenser, compressor, compressor speed) and the heat pump operating states (heating, cooling, continuous) are now under "Diagnostic". The entities stay enabled; error and filter messages and the normal temperatures stay under "Sensors". Note: diagnostic entities don't appear in auto-generated dashboards and area cards.
- **Icons added:** PTC element active (radiator, crossed out when off), heat pump heating (`mdi:heat-pump`), cooling (`mdi:snowflake`), continuous operation (`mdi:autorenew`), operating mode (full state) and the unlock flags ("… selectable") previously only had the default icon.
- **Switch renamed:** "Lüfter-Automatik (Eco Sommer/Winter)" is now just "Lüfter-Automatik" (English "Fan auto mode"). The restriction to Eco summer/winter is still documented in the README. Existing entity IDs are unchanged; new setups get `switch.<name>_fan_auto_mode`.

**Fixed**
- **Thermostat mode:** the `climate` entity always showed "Heat/Cool". It is now "Heat", and "Heat/Cool" only when "Cooling available on this unit" is on, the device has unlocked cooling (register 315, bit 8) and the cooling release (register 306) is on.
- **Settable temperature range:** instead of a fixed 18–24 °C the range follows the register list: room 1 (Wohnen) 18–30 °C directly, every other room its mid temperature (register 220+) ±3 °C in whole degrees, clamped to 18–30 °C. Without a plausible mid temperature 18–30 °C applies.
- **Minimum version:** Home Assistant **2026.9.0** instead of 2026.8.0 (the `modbus` unit API is available from that version). `modbus-connection[tmodbus]>=4.12.1` is now listed explicitly under `requirements` in `manifest.json`.

## 2.0.0 – 2026-10-14

- **Migrated to Home Assistant's new Modbus model:** the integration no longer opens its own pymodbus connection; it requests a unit on a shared connection via `homeassistant.components.modbus.async_get_unit` (dependency `modbus`, library `modbus-connection`). Requests are serialized centrally, the connection opens on the first read and reopens automatically after a drop, and it closes when the last holder unloads.
- The config-flow connection test uses `async_get_temporary_unit`.
- Configuration, unique IDs, entities and registers are unchanged — existing setups keep working.
- The own `pymodbus` requirement, the `slave`/`device_id` keyword detection and the custom locking were removed.
- **Requirement:** a Home Assistant version that ships the new `modbus` unit API.

## 1.2.1 – 2026-09-05

- **New "Cooling available on this unit" option** (initial setup and options flow, default: Yes) acting as a master switch for all cooling-related entities:
  - **Yes (default):** `switch.cooling_enable` and `binary_sensor.heat_pump_cooling` are created as before; their availability still follows the live cooling-capability bit from register 315 (bit 8) - unchanged from previous behavior.
  - **No:** `switch.cooling_enable`, `binary_sensor.heat_pump_cooling`, and `binary_sensor.cooling_available` aren't created at all, instead of just going "unavailable" - for units where that bit has proven unreliable.
- "Compressor speed" German label reworded for consistency with the fan-speed sensors; "Temperature after preheater" German label shortened; "Heat pump heating/cooling" German labels dropped the filler "im".
- Default CO₂/humidity sensor names "CO2 1"/"Luftfeuchte 1" → "CO2-Sensor 1"/"Luftfeuchte-Sensor 1".
- Removed the dead `cooling_enable_possible` translation entry (no entity has used it since `binary_sensor.cooling_available` was introduced).
- READMEs: added a full entity list with friendly name, entity ID, and description, including an explanation of how entity IDs derive from device name and interface language.

## 1.2.0 – 2026-09-05

- **CO₂/humidity sensors can now optionally be assigned to a room.** The integration options (names step) now show a dropdown per sensor - "Central (no room)" or one of the configured rooms - and assigning one moves that sensor to the room's own device instead of the central device. Leaving it unassigned changes nothing.
- Default sensor names "CO2 1" / "Luftfeuchte 1" are now "CO2-Sensor 1" / "Luftfeuchte-Sensor 1".
- Central device temperature sensors renamed to a consistent "Temperatur *location*" scheme in German (e.g. "Temperatur Zuluft" instead of "Zuluft-Temperatur"); English names were already idiomatic and are unchanged.
- The heat-pump heating/cooling/continuous-operation `binary_sensor` entities now show "On"/"Off" instead of "Running"/"Not running" (same reasoning as the `ptc_active` fix in 1.1.1: the `running` device class reads as an availability judgement rather than a plain on/off state).
- Every entity that used to be disabled by default is now enabled from the start (refrigerant-circuit temperatures, the register-315 capability diagnostic sensors).

## 1.1.1 – 2026-09-05

- Bugfix: `binary_sensor.ptc_active` showed "Normal"/"Hot" instead of "On"/"Off", because the entity incorrectly used Home Assistant's `heat` device class (meant for temperature-threshold warnings, not a plain on/off state). Now correctly shows "On"/"Off".

## 1.1.0 – 2026-09-05

- **Rooms and central functions are now separate devices.** There's still one central device (supply/extract/exhaust sensors, cooling/fan switches, fan stage/operating mode), but every room now also gets its own device linked to the central one (climate, PTC element state and enable, mid-room temperature). This makes a room's entities (e.g. its PTC state) much easier to find.
- **New sensor `binary_sensor.cooling_available`** (central device, enabled by default): shows directly whether the unit reports supporting cooling at all (register 315, bit 8).
- When that bit says cooling isn't possible, `switch.cooling_enable` now goes **unavailable** (like the existing fan-stage/auto controls outside their operating mode), and so does `binary_sensor.heat_pump_cooling`, since the unit can then never report that state.
- Terminology: "electric reheater" is now consistently called "PTC element".
- Removed an internal comment in `const.py` that still named the gateway manufacturer.

## 1.0.4 – 2026-09-05

- Terminology fix: "Proxon FWT" is a fresh-air heat-exchange unit
  ("Frischluftwärmetechnik"), not a "heat-recovery/heat-pump ventilation
  unit", and the gateway is now called the "FWT Modbus gateway" rather
  than "BusBridge Zimmermann". The trademark notice now only names
  "Proxon".

## 1.0.3 – 2026-09-05

- Bugfix: every register access (the config flow's connection test **and**
  normal operation) failed with `'float' object has no attribute
  'to_bytes'`. Root cause: Home Assistant's `NumberSelector` returns a
  `float` (e.g. `10.0`) for the "Port" and "Modbus unit ID" fields instead
  of an `int`, and that value was never explicitly cast before reaching
  pymodbus's PDU encoding. The config flow now casts port and unit ID to
  `int`, and `hub.py` additionally casts port, unit ID, baudrate, byte
  size, and stop bits defensively.

## 1.0.2 – 2026-09-05

- The config flow now logs the actual reason a connection test failed
  (previously only logged for genuinely unexpected errors, not the regular
  "cannot_connect" case) — visible under Settings → System → Logs as
  "Proxon FWT connection test failed: ...".

## 1.0.1 – 2026-09-05

- Bugfix: a failed connection attempt showed a generic "Unexpected error" in
  the config flow instead of a clear message, because some pymodbus/pyserial
  versions raise an exception from `connect()` instead of cleanly returning
  `False` — nothing caught that. Also affected a mid-operation reconnect
  attempt during reads/writes.

## 1.0.0 – 2026-09-05

Initial release.

- Config flow: Modbus TCP or Modbus RTU (USB-to-serial) setup, no YAML required.
- Options flow: rename rooms/external sensors, change room count (up to 16) and
  polling interval without re-adding the integration.
- `climate` entity per room (actual + target temperature).
- `sensor` entities for all device-level measurements (air/refrigerant-circuit
  temperatures, compressor/fan speeds, power consumption), per-room mid-room
  temperature, CO₂ and humidity sensors, and a diagnostic full-state operating
  mode sensor.
- `binary_sensor` entities for bypass state, per-room electric reheater (PTC)
  activity, system/filter messages, and heat-pump run states.
- `switch` entities for global cooling enable, fan auto mode, intensive
  ventilation, and per-room PTC enable.
- `select` entities for fan stage and operating mode.
- German and English translations.
- Room climate entities limit their setpoint slider to 18–24 °C.
- `select.fan_stage` and `switch.fan_auto` go unavailable outside Eco
  summer/winter, and `switch.fan_intensive` outside Comfort mode — verified
  against both the original Symcon dashboard and the live Home Assistant
  automations this integration replaces.
- Every write now waits `WRITE_SETTLE_DELAY` (2 s, `const.py`) before polling
  for confirmation, giving the device a moment to actually apply the new
  value instead of reading back the pre-write state.
- Original-design integration icon (`brands/`), ready to submit to the
  `home-assistant/brands` repository so it shows up in the Home Assistant UI.
- README available in German (default, `README.md`) and English
  (`README.en.md`), with a disclaimer and copyright/license note.
- The config flow now actually tests the connection (connect and read a
  known register) before creating the entry, instead of silently failing
  afterwards; also fixed a bug where baudrate/bytesize/stopbits were stored
  as text instead of numbers during RTU setup.
- If the connection can't be established at Home Assistant startup (device
  temporarily unreachable), the integration now raises `ConfigEntryNotReady`
  so Home Assistant retries automatically with backoff, instead of marking
  the entry permanently failed.

# Changelog

*[🇩🇪 Deutsche Version](CHANGELOG.md)*

All notable changes to this project are documented here. Versions follow the
`version` field in `custom_components/proxon_modbus/manifest.json`.

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
- Every entity that used to be disabled by default is now enabled from the start (refrigerant-circuit temperatures, the register-315 capability diagnostic sensors) - except the per-room mid-room temperature, which stays disabled by default.

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

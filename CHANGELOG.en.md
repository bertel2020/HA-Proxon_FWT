# Changelog

*[🇩🇪 Deutsche Version](CHANGELOG.md)*

All notable changes to this project are documented here. Versions follow the
`version` field in `custom_components/proxon_modbus/manifest.json`.

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

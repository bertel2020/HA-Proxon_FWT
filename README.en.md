# Proxon FWT (Modbus) – Home Assistant Integration

*[🇩🇪 Deutsche Version](README.md)*

<img src="https://raw.githubusercontent.com/bertel2020/HA-Proxon_FWT/main/brands/icon.png" alt="" width="64" height="64" align="left" style="margin-right: 12px">

A UI-configurable Home Assistant custom integration for the **Proxon FWT - Frischluftwärmetechnik** ventilation unit, talking Modbus to its **FWT Modbus gateway**. It uses a proper config-entry integration: a config flow, a shared `DataUpdateCoordinator`, and typed entities (`climate`, `sensor`, `binary_sensor`, `switch`, `select`) — in the spirit of the [modernized Modbus architecture](https://developers.home-assistant.io/blog/2026/07/05/modernizing-modbus/) (config-entry setup instead of hand-written YAML register maps, one shared connection per device, entity-description-driven platforms).

Both transports are supported:
- **Modbus TCP** — the gateway reachable over the network (e.g. `192.168.x.x:502`).
- **Modbus RTU** — a direct USB-to-serial (RS-485) connection, e.g. `/dev/ttyUSB0`.

## Installation

### Via HACS (recommended)

[![Open the HACS repository in My Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=bertel2020&repository=HA-Proxon_FWT&category=integration)
[![Add Proxon FWT (Modbus) via My Home Assistant](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=proxon_modbus)

1. Use the first button to open the Proxon FWT repository in HACS.
2. Download **Proxon FWT (Modbus)** and restart Home Assistant.
3. Use the second button to add the integration. Alternatively, in Home
   Assistant open **Settings → Devices & Services → Add Integration →
   Proxon FWT (Modbus)**.

If the first button doesn't work, add `https://github.com/bertel2020/HA-Proxon_FWT`
under HACS → **Integrations → Custom repositories** with category
**Integration**.

### Manual

Copy the `custom_components/proxon_modbus` directory to
`/config/custom_components/proxon_modbus` and restart Home Assistant.

## Setup

Settings → Devices & Services → Add Integration → **Proxon FWT (Modbus)**.

1. Choose **Network (Modbus TCP)** or **USB / RS-485 (Modbus RTU)**.
   - TCP: host/IP, port (default `502`), Modbus unit ID (default `10`).
   - RTU: serial device path, baud rate (default `9600`), data bits (`8`), parity (default `E`/Even), stop bits (`1`), Modbus unit ID.
2. Choose how many rooms (1–16) and external CO₂/humidity sensors (0–5) to create entities for, and whether the unit supports **cooling at all** (see below).
3. Afterwards, use the integration's **Configure** button (Options) to rename rooms/sensors, optionally assign each CO₂/humidity sensor to a room, or change the room/sensor count, polling interval, or cooling availability without re-adding the integration.

## Entities

Two kinds of devices are created: a **central device** ("Proxon FWT" by default) for whole-unit functions, and **one device per configured room** (named after the room), linked to the central device.

**Central device (central functions):**

- **`sensor.*`** — supply/extract/exhaust/fresh air temperatures, refrigerant-circuit temperatures, outside temperature, compressor speed, power consumption, fan speeds, plus a diagnostic "operating mode (full state)" sensor and any configured CO₂/humidity sensors not assigned to a room (see below).
- **`binary_sensor.*`** — bypass state, **cooling available** (see below), system/filter messages, heat-pump heating/cooling/continuous-operation flags, and (diagnostic) the remaining "is X currently selectable" capability flags from register 315.
- **`switch.*`** — global cooling enable, fan auto mode (Eco summer/winter), intensive ventilation.
- **`select.*`** — fan stage (Off/1–4) and operating mode (Off/Eco summer/Eco winter/Comfort/Furnace).

**Per room:**

- **`climate.<room>`** — current temperature (register `150+n`), target temperature (read from `180+n`, written to the separate write-only register `200+n`). Home Assistant's slider is limited to 18–24 °C.
- **`binary_sensor.*`** — PTC element active (current **state**, register 300).
- **`switch.*`** — PTC element enabled (**enable**, registers 301/302).
- **`sensor.*`** — mid-room temperature (rooms 2–N, control-panel readback, disabled by default).
- Optionally, one or more **CO₂/humidity sensors**, if assigned to this room from the options flow's names step.

A full table of every entity with a description is further down under [All entities in detail](#all-entities-in-detail).

### Cooling available — a manual setting as the master switch

Register 315 bit 8 is documented as reporting whether the unit supports cooling at all - in practice, that bit has proven unreliable on some units. So there's also a **manual setting** for this ("Cooling available on this unit", initial setup and options flow, default: Yes), acting as a coarse master switch:

- **Yes (default):** the cooling entities are created as normal, and their availability still follows the **live bit** - just like any other mode-dependent control. If the unit's bit reports "no cooling possible" right now, `switch.proxon_fwt_cooling_enabled` and `binary_sensor.proxon_fwt_heat_pump_cooling` go unavailable accordingly - even though the setting itself is Yes.
- **No:** you've decided, independent of the bit, that this unit has no cooling support at all. In that case `switch.proxon_fwt_cooling_enabled`, `binary_sensor.proxon_fwt_heat_pump_cooling`, and `binary_sensor.proxon_fwt_cooling_available` aren't created in the first place (not just "unavailable" - they don't exist).

`binary_sensor.proxon_fwt_cooling_available` (when created) shows the **raw bit value** from register 315 - handy for observing just how reliable that bit actually is on your unit.

Three further controls only make sense in specific operating modes and go **unavailable** outside them too:

| Entity (default name "Proxon FWT") | Available only in |
|---|---|
| `select.proxon_fwt_fan_stage` | Eco summer / Eco winter |
| `switch.proxon_fwt_fan_auto_mode_eco_summer_winter` | Eco summer / Eco winter |
| `switch.proxon_fwt_intensive_ventilation` | Comfort |

An "unavailable" entity still exists (so automations referencing it don't break when you switch modes) but won't accept commands and typically renders greyed-out on a dashboard.

### All entities in detail

The entity ID is derived from the device name plus the entity name (Home Assistant's standard scheme for `has_entity_name` entities). Home Assistant assigns it **once, the first time** each device (central or per room) is set up, and keeps it afterwards - even if you later rename the device or switch the UI language.

The names (and therefore the entity IDs) also depend on **whichever language your Home Assistant interface was running in at setup time**: with HA set to German, you get German-based entity IDs like those in the [German README](README.md#alle-entities-im-detail) (e.g. `sensor.proxon_fwt_temperatur_zuluft`); with HA set to English, or any other language without its own translation (falls back to English), you get English-based ones like those below (e.g. `sensor.proxon_fwt_supply_air_temperature`). Within one installation this is always consistent, never mixed.

The tables below assume the default device name **"Proxon FWT"** (→ `proxon_fwt`) and an example room **"Wohnen"**. If you picked a different name during setup, your actual entity IDs will look different accordingly - renaming a device in Home Assistant afterwards only changes its display name, not the entity ID it was already assigned.

**Central device — `sensor`**

| Friendly Name | Entity ID | Description |
|---|---|---|
| Supply air temperature | `sensor.proxon_fwt_supply_air_temperature` | Register 100 |
| Extract air temperature | `sensor.proxon_fwt_extract_air_temperature` | Register 101 |
| Exhaust air temperature | `sensor.proxon_fwt_exhaust_air_temperature` | Register 102 |
| Fresh air temperature | `sensor.proxon_fwt_fresh_air_temperature` | Register 103 |
| Temperature before evaporator | `sensor.proxon_fwt_temperature_before_evaporator` | Refrigerant temperature before the evaporator (register 104) |
| Evaporator temperature | `sensor.proxon_fwt_evaporator_temperature` | Refrigerant temperature at the evaporator (register 105) |
| Temperature after preheater | `sensor.proxon_fwt_temperature_after_preheater` | Register 106 |
| Temperature before condenser | `sensor.proxon_fwt_temperature_before_condenser` | Refrigerant temperature before the condenser (register 107) |
| Condenser temperature | `sensor.proxon_fwt_condenser_temperature` | Refrigerant temperature at the condenser (register 108) |
| Compressor temperature | `sensor.proxon_fwt_compressor_temperature` | Register 109 |
| Outside temperature | `sensor.proxon_fwt_outside_temperature` | Register 110 |
| Compressor speed | `sensor.proxon_fwt_compressor_speed` | RPM (register 111) |
| Power consumption | `sensor.proxon_fwt_power_consumption` | Current power draw of the unit in watts (register 113) |
| Supply fan speed | `sensor.proxon_fwt_supply_fan_speed` | RPM (register 114) |
| Extract fan speed | `sensor.proxon_fwt_extract_fan_speed` | RPM (register 115) |
| Operating mode (full state) | `sensor.proxon_fwt_operating_mode_full_state` | Diagnostic enum sensor covering every state register 314 can report, including the three that can't be selected directly (emergency operation, frost protection, commissioning) |
| *(custom name)* | `sensor.proxon_fwt_<name>` | CO₂ sensor(s), in ppm, if configured and not assigned to a room (register 350+n) |
| *(custom name)* | `sensor.proxon_fwt_<name>` | Humidity sensor(s), in % RH, if configured and not assigned to a room (register 360+n) |

**Central device — `binary_sensor`**

| Friendly Name | Entity ID | Description |
|---|---|---|
| Bypass active | `binary_sensor.proxon_fwt_bypass_active` | Whether the bypass damper is currently open (register 112) |
| Cooling available | `binary_sensor.proxon_fwt_cooling_available` | Raw diagnostic bit from register 315 (bit 8) - see [Cooling available](#cooling-available--a-manual-setting-as-the-master-switch) above; only present when "Cooling available on this unit" = Yes |
| System error | `binary_sensor.proxon_fwt_system_error` | Aggregate error flag (register 380, bit 0) |
| Device filter | `binary_sensor.proxon_fwt_device_filter` | Device filter change due (register 380, bit 2) |
| Recirculation filter | `binary_sensor.proxon_fwt_recirculation_filter` | Recirculation filter change due (register 380, bit 3) |
| Heat pump heating | `binary_sensor.proxon_fwt_heat_pump_heating` | Heat pump is currently in heating mode (register 380, bit 4) |
| Heat pump cooling | `binary_sensor.proxon_fwt_heat_pump_cooling` | Heat pump is currently in cooling mode (register 380, bit 5); only present when "Cooling available on this unit" = Yes, and even then unavailable whenever the unit itself (register 315, bit 8) currently reports no cooling |
| Heat pump continuous operation | `binary_sensor.proxon_fwt_heat_pump_continuous_operation` | Heat pump running continuously (register 380, bit 6) |
| Mode change possible | `binary_sensor.proxon_fwt_mode_change_possible` | Diagnostic "is X currently selectable" flag, live from register 315, bit 0 |
| Fan stage off selectable | `binary_sensor.proxon_fwt_fan_stage_off_selectable` | Register 315, bit 1 |
| Fan stage 1 selectable | `binary_sensor.proxon_fwt_fan_stage_1_selectable` | Register 315, bit 2 |
| Fan stage 2 selectable | `binary_sensor.proxon_fwt_fan_stage_2_selectable` | Register 315, bit 3 |
| Fan stage 3 selectable | `binary_sensor.proxon_fwt_fan_stage_3_selectable` | Register 315, bit 4 |
| Fan stage 4 selectable | `binary_sensor.proxon_fwt_fan_stage_4_selectable` | Register 315, bit 5 |
| Fan auto mode selectable | `binary_sensor.proxon_fwt_fan_auto_mode_selectable` | Register 315, bit 6 |
| Intensive ventilation selectable | `binary_sensor.proxon_fwt_intensive_ventilation_selectable` | Register 315, bit 7 |

**Central device — `switch`**

| Friendly Name | Entity ID | Description |
|---|---|---|
| Cooling enabled | `switch.proxon_fwt_cooling_enabled` | Toggles the global cooling enable (register 305 write / 306 read); only present when "Cooling available on this unit" = Yes, and even then unavailable whenever the unit itself (register 315, bit 8) currently reports no cooling |
| Fan auto mode (Eco summer/winter) | `switch.proxon_fwt_fan_auto_mode_eco_summer_winter` | Toggles automatic fan-stage control (registers 309/310); available only in Eco summer/winter |
| Intensive ventilation | `switch.proxon_fwt_intensive_ventilation` | Toggles intensive ventilation (registers 311/312); available only in Comfort mode |

**Central device — `select`**

| Friendly Name | Entity ID | Description |
|---|---|---|
| Fan stage | `select.proxon_fwt_fan_stage` | Selects fan stage Off/1-4 (register 307 write / 308 read); available only in Eco summer/winter |
| Operating mode | `select.proxon_fwt_operating_mode` | Selects operating mode Off/Eco summer/Eco winter/Comfort/Furnace (register 313 write / 314 read) |

**Per room device** (example room "Wohnen")

| Friendly Name | Entity ID | Description |
|---|---|---|
| Wohnen (room name, `climate`) | `climate.wohnen` | Actual temperature (register 150+n) and target temperature (read from 180+n, written to 200+n), 18-24 °C slider |
| PTC element active | `binary_sensor.wohnen_ptc_element_active` | Current **state** of this room's electric reheater element (register 300, bit n) |
| PTC element enabled | `switch.wohnen_ptc_element_enabled` | **Enable** for this room's electric reheater element (register 301 write / 302 read, bit n) |
| Mid-room temperature | `sensor.wohnen_mid_room_temperature` | Readback from the room's control panel (register 220+n, rooms 2-N only); disabled by default |
| *(custom name)* | `sensor.wohnen_<name>` | CO₂ or humidity sensor, if assigned to this room from the options flow |

## Register map

See [`custom_components/proxon_modbus/const.py`](custom_components/proxon_modbus/const.py) for the full, commented address list. Worth knowing:

- **PTC element state, per-room enable, and enable-readback (registers 300/301/302) are single 16-bit bitfields**, one bit per room (bit *N* = room *N+1*), not per-room registers. Because register 301 is write-only (no independent readback), toggling one room's PTC switch reads the current state from register 302, flips just that room's bit, and writes the whole mask back. This reconstructed mask is a snapshot from the last poll: two rooms toggled faster than one poll cycle apart could theoretically race and clobber each other's bit — not a concern for manual dashboard use, but worth knowing if you automate several rooms' PTC at once.
- **Mid-room temperature (register `220+n`, rooms 2–16 only)** has no documented scale and is treated the same as every other temperature register (signed, ×0.1 °C) by analogy; disabled by default since it doesn't appear to be relied on in practice.
- **Room setpoints (`200+n`) take a plain absolute integer degree value for every room**, not an offset relative to a room's physical control-panel dial.
- **Four controls are gated by operating mode or the cooling-capability bit** — see the availability table above. Register 315 ("Freischaltungen") reports the same information live from the device; bit 8 (cooling possible) is available as `binary_sensor.proxon_fwt_cooling_available` (when "Cooling available on this unit" = Yes), and the remaining bits as diagnostic capability `binary_sensor`s, if you want to build on the live signal instead of the mode number.

## How target (Soll) vs. actual (Ist) works

Almost every controllable value on the device has **two separate registers**: a write-only "Soll" one and a read-only "Ist" one that reports what the device actually applied (room setpoint 200+n / 180+n, fan stage 307/308, fan auto 309/310, intensive 311/312, cooling 305/306, mode 313/314; the PTC element is the bitfield exception described above). This integration always follows the same pattern for all of them:

1. **Every entity displays the "Ist" register**, never the value you just requested. The climate entity's target temperature (`target_temperature`) reads register `180+n`, the currently selected fan stage (`current_option`) reads `308`, the cooling-enable switch state (`is_on`) reads `306`, and so on — `target_temperature`, `current_option`, and `is_on` are internal properties of Home Assistant's own entity base classes (`ClimateEntity`/`SelectEntity`/`SwitchEntity`), not entity IDs.
2. **A command (`set_temperature`, `select_option`, `turn_on`/`turn_off`) writes only the "Soll" register**, then immediately calls the coordinator's `async_request_refresh()` — an out-of-cycle poll of every register, including the "Ist" one, rather than waiting for the next scheduled interval.
3. **There is no optimistic local state.** The entity keeps showing the previous value until that refresh confirms the device actually applied the change (typically well under a second, but real). If the write fails (lost connection, device rejects the value) the entity simply keeps showing the true, unconfirmed state instead of a value the device never reached.

Worked example — dragging a room's thermostat to 21 °C: `climate.set_temperature(21)` → round to `21` → write register `200+room_index` → request refresh → the coordinator re-reads all registers including `180+room_index` → once the device confirms, `target_temperature` shows `21`. `current_temperature` is unrelated — it comes from the room's own sensor register (`150+room_index`) and only changes as the room physically warms or cools.

## Migrating from the old YAML setup

The previous `configuration.yaml` `modbus:` platform block is no longer needed once this integration is running — remove it to avoid duplicate polling of the same unit. Entity IDs will differ (per-room setpoints are now `climate` entities, and other entities are scoped to a single device), so dashboards and automations referencing old entity IDs will need updating.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.en.md](CHANGELOG.en.md).

## Disclaimer

This is an independent, community-built integration. It is not affiliated with, endorsed by, or supported by Proxon or any other manufacturer of the hardware it talks to. The register map it relies on was arrived at independently and may be incomplete or imprecise for your specific unit or firmware version.

This integration can write values to real heating and ventilation hardware. It is provided **"as is", without warranty of any kind** (see [LICENSE](LICENSE)) — use it at your own risk, verify its behavior against your own installation before relying on it, and do not use it in any safety-critical capacity.

## Trademark Notice

"Proxon" and any other product or company names mentioned in this repository are trademarks or registered trademarks of their respective owners. Their use here is solely to describe what hardware this integration is compatible with, and does not imply any affiliation, endorsement, or sponsorship by the respective trademark holders. "Home Assistant" is a trademark of the Open Home Foundation.

## Copyright & License

Copyright © 2026 bertel2020. Licensed under the [MIT License](LICENSE).

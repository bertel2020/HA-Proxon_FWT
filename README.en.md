# Proxon FWT (Modbus) – Home Assistant Integration

*[🇩🇪 Deutsche Version](README.md)*

<img src="https://raw.githubusercontent.com/bertel2020/HA-Proxon_FWT/main/brands/icon.png" alt="" width="64" height="64" align="left" style="margin-right: 12px">

A UI-configurable Home Assistant custom integration for the **Proxon FWT** heat-recovery/heat-pump ventilation unit, talking Modbus to its **BusBridge Zimmermann** gateway. It uses a proper config-entry integration: a config flow, a shared `DataUpdateCoordinator`, and typed entities (`climate`, `sensor`, `binary_sensor`, `switch`, `select`) — in the spirit of the [modernized Modbus architecture](https://developers.home-assistant.io/blog/2026/07/05/modernizing-modbus/) (config-entry setup instead of hand-written YAML register maps, one shared connection per device, entity-description-driven platforms).

Both transports are supported:
- **Modbus TCP** — the gateway reachable over the network (e.g. `192.168.x.x:502`).
- **Modbus RTU** — a direct USB-to-serial (RS-485) connection, e.g. `/dev/ttyUSB0`.

## Installation

### Option A: HACS (custom repository)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=bertel2020&repository=HA-Proxon_FWT&category=integration)

1. Open HACS with the repository pre-filled (button above) — or manually: HACS → Integrations → ⋮ → *Custom repositories* → add `https://github.com/bertel2020/HA-Proxon_FWT` with category *Integration*.
2. Install "Proxon FWT (Modbus)", then restart Home Assistant.
3. Then jump straight into setup:

   [![Open your Home Assistant instance and start setting up a new integration.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=proxon_modbus)

### Option B: Manual copy
Copy the `custom_components/proxon_modbus` folder into your Home Assistant `config/custom_components/` directory, then restart Home Assistant.

## Setup

Settings → Devices & Services → Add Integration → **Proxon FWT (Modbus)**.

1. Choose **Network (Modbus TCP)** or **USB / RS-485 (Modbus RTU)**.
   - TCP: host/IP, port (default `502`), Modbus unit ID (default `10`).
   - RTU: serial device path, baud rate (default `9600`), data bits (`8`), parity (default `E`/Even), stop bits (`1`), Modbus unit ID.
2. Choose how many rooms (1–16) and external CO₂/humidity sensors (0–5) to create entities for.
3. Afterwards, use the integration's **Configure** button (Options) to rename rooms/sensors or change the room/sensor count and polling interval without re-adding the integration.

## Entities

One device is created ("Proxon FWT" by default) with:

- **`climate.<room>`** — one per room: current temperature (register `150+n`), target temperature (read from `180+n`, written to the separate write-only register `200+n`). Home Assistant's slider is limited to 18–24 °C.
- **`sensor.*`** — supply/extract/exhaust/fresh air temperatures, refrigerant-circuit temperatures, outside temperature, compressor speed, power consumption, fan speeds, plus a diagnostic "operating mode (full state)" sensor and per-room mid-temperature sensors (rooms 2–N, control-panel readback), and any configured CO₂/humidity sensors.
- **`binary_sensor.*`** — bypass state, per-room electric-reheater (PTC) active state, system/filter messages, heat-pump heating/cooling/continuous-operation flags, and (disabled by default, diagnostic) the "is X currently selectable" capability flags from register 315.
- **`switch.*`** — global cooling enable, fan auto mode (Eco summer/winter), intensive ventilation, and per-room PTC (electric reheater) enable.
- **`select.*`** — fan stage (Off/1–4) and operating mode (Off/Eco summer/Eco winter/Comfort/Furnace).

Three controls only make sense in specific operating modes and go **unavailable** outside them:

| Entity | Available only in |
|---|---|
| `select.fan_stage` | Eco summer / Eco winter |
| `switch.fan_auto` | Eco summer / Eco winter |
| `switch.fan_intensive` | Comfort |

An "unavailable" entity still exists (so automations referencing it don't break when you switch modes) but won't accept commands and typically renders greyed-out on a dashboard.

## Register map

See [`custom_components/proxon_modbus/const.py`](custom_components/proxon_modbus/const.py) for the full, commented address list. Worth knowing:

- **PTC (electric reheater) state, per-room enable, and enable-readback (registers 300/301/302) are single 16-bit bitfields**, one bit per room (bit *N* = room *N+1*), not per-room registers. Because register 301 is write-only (no independent readback), toggling one room's PTC switch reads the current state from register 302, flips just that room's bit, and writes the whole mask back. This reconstructed mask is a snapshot from the last poll: two rooms toggled faster than one poll cycle apart could theoretically race and clobber each other's bit — not a concern for manual dashboard use, but worth knowing if you automate several rooms' PTC at once.
- **Mid-room temperature (register `220+n`, rooms 2–16 only)** has no documented scale and is treated the same as every other temperature register (signed, ×0.1 °C) by analogy; disabled by default since it doesn't appear to be relied on in practice.
- **Room setpoints (`200+n`) take a plain absolute integer degree value for every room**, not an offset relative to a room's physical control-panel dial.
- **Three controls are gated by operating mode** — see the availability table above. Register 315 ("Freischaltungen") reports the same information live from the device and is exposed as diagnostic capability `binary_sensor`s, disabled by default, if you want to build on the live signal instead of the mode number.

## How target (Soll) vs. actual (Ist) works

Almost every controllable value on the device has **two separate registers**: a write-only "Soll" one and a read-only "Ist" one that reports what the device actually applied (room setpoint 200+n / 180+n, fan stage 307/308, fan auto 309/310, intensive 311/312, cooling 305/306, mode 313/314; PTC is the bitfield exception described above). This integration always follows the same pattern for all of them:

1. **Every entity displays the "Ist" register**, never the value you just requested. `climate.target_temperature` reads register `180+n`, `select.fan_stage.current_option` reads `308`, `switch.cooling_enable.is_on` reads `306`, and so on.
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

This is an independent, community-built integration. It is not affiliated with, endorsed by, or supported by Proxon, Zimmermann, or any other manufacturer of the hardware it talks to. The register map it relies on was arrived at independently and may be incomplete or imprecise for your specific unit or firmware version.

This integration can write values to real heating and ventilation hardware. It is provided **"as is", without warranty of any kind** (see [LICENSE](LICENSE)) — use it at your own risk, verify its behavior against your own installation before relying on it, and do not use it in any safety-critical capacity.

## Trademark Notice

"Proxon", "BusBridge Zimmermann", and any other product or company names mentioned in this repository are trademarks or registered trademarks of their respective owners. Their use here is solely to describe what hardware this integration is compatible with, and does not imply any affiliation, endorsement, or sponsorship by the respective trademark holders. "Home Assistant" is a trademark of the Open Home Foundation.

## Copyright & License

Copyright © 2026 bertel2020. Licensed under the [MIT License](LICENSE).

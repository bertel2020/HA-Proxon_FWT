# Changelog

*[🇩🇪 Deutsche Version](CHANGELOG.md)*

## 2.5.0 – 2026-11-22

**New**
- History "all in one": phases with the PTC auxiliary heater running are shaded as a coloured band (legend "PTC running").
- History: power curves (power, PTC power) are drawn as a staircase. A sensor that only reports changes used to give a sloped ramp instead of the held 0 W line.
- Mobile polish: chart reference labels and time axis no longer overlap, larger touch targets on touch devices, tab bar stays at the top in landscape, "OK" in the status list right-aligned, legends with tighter line spacing, measuring-point label in the device picture kept off the edge.
- Mobile view reworked: chart value table with a separate name row, room cards/list/comparison without overflow at 320 px, system schema and air paths swipeable instead of tiny, hot water set points as large row steppers, two-column KPI tiles, room header and view switch adjusted.
- **Panel – hot water, unit picture:** The unit looks more like a hot water heat pump: a fan unit with a ring and five blades, vent slots, feet and a shadow. The water has a colour gradient with a wave line at the surface and a sheen strip, and bubbles rise while it heats. The reading sits on a light field, so it stays legible on every water colour.
- **Panel – hot water, history:** The chart is taller (420 instead of 300 px), the same in "All" and for single measurements.
- **Panel – history, "All":** The lanes are taller (air and refrigerant circuit 150 px, drives 130, power 110, heat recovery and PTC 100) with larger gaps. The curves are calmer: a moving average over about 20 minutes smooths the sawtooth (the table below still shows the real values), the lines are thinner and the heat pump bands and grid lines are paler.
- **Panel – hot water, tank picture:** A small sun with an arrow sits left of the unit again (bright and flowing while there is PV power), a small moon without an arrow at night. The moon on top of the unit is gone and the target labels on the right are smaller.
- **Panel – hot water, "Tank" card:** The picture now shows only the unit with the target marks, larger and without the floating sun or moon and the arrow. The PV power is a tile of its own beside it (sun by day, moon at night). All tiles have an icon and the colour of their state, like the key figures. The outdoor temperature and the reading in the unit no longer touch the divider line.
- **Panel – key figures:** The 24 hour curve now runs across the full width of the tile (below the icon and value, at the bottom edge) and is thinner (1.2 instead of 1.6 px). The bar on top is a little slimmer.
- **Operating mode and fan stage:** The chosen mode is tinted and outlined in the colour of the mode (winter blue, comfort green, stove red), the chosen fan stage is filled solid. The buttons are a little larger with more spacing and a light tint on hover.
- **Wish stage:** The remembered stage is a small, neutral switch (digits only) on the right of one row. It is no longer blue and no longer as large as the operating stage, so the two are not mixed up.
- **Panel – diagnosis, measurements:** The three groups (air, refrigerant circuit, drives) are now tinted panels of their own with a coloured icon, a bar on top and the same height; the values are bolder and a row is highlighted on hover.
- **Panel – diagnosis, runtime and starts:** The values are now tiles like the key figures (icon, name, large value) instead of rows with divider lines side by side.
- **Panel – key figures:** The tiles now stand out in the panel too (a panel rule used to override the style): lightly tinted in the colour of the figure, with a coloured border, a bar on top and a coloured shadow.
- **Panel – hot water, tank picture:** At night the picture shows a moon instead of the sun and no PV arrow. The unit has more contrast: darker fan and housing, a stronger water fill, a larger outdoor temperature; the highlight strip behind the measuring point is gone.
- **Panel – key figures and diagnosis:** All key figure tiles are the same height and have a border, a shadow and a bar on top in the colour of the figure. In the diagnosis the bypass is a row of its own instead of an extra line under "System error".
- **Panel – hot water, new layout:** A status bar over the full width shows the controller's decision large and in colour (night indigo, normal orange, PV green) with a 24-hour bar of the program phases and a "now" mark. The history uses the full width, with the main picture and the control side by side above it. The tank picture is larger: thicker sun rays, bigger labels for the targets and a moon on the unit at night. The "Measurements" button is now a pill like the other buttons.
- **Panel – hot water, "Control" card:** The cards "Operation" and "Targets" are merged into one. On top the switch (automatic or dry run), below it in plain words what the controller decided and why (e.g. "Night rest · heat pump locked – heats again only when the water falls below 42°"), with the PV status and the time. The scale of the switching thresholds is now HTML with readable text, marks that do not overlap, "target reached" in green and a one-line legend. Minimum, normal and PV are set right below it (tiles with plus and minus), the switching band sits in a quiet line with "Change". In the wide layout the main picture and the history are on the left, the control on the right; no card is stretched any more.
- **Panel – room popup:** The temperature curve is thinner (a fixed 1.5 px instead of a line that grows with the width).
- **Dashboard card – room popup:** A room tile (or list row) now opens its details as a popup, on phones as a sheet you can swipe away, instead of showing them under the list. On closing (Escape, the cross, a tap outside) the focus returns to the tile.
- **Panel – room cards always the same size:** The cards keep their size whatever a filter leaves (a single card no longer stretches over the full width), and all rows are equally tall. The tiles of the dashboard card too. In narrow cards the "details" icon is dropped so the room name is not cut off.
- **Dashboard card – room tiles:** The tiles stand out clearly (strong border and shadow, thick coloured bar on top, tint and coloured temperature by state, hover effect, the selected tile with a frame). While the PTC element runs, the tile is coral; the duplicate PTC chip is gone. In the list view each row carries a coloured stripe.
- **Panel – room cards:** The whole card now opens the details popup (chips, the ring value, plus/minus and the knob keep their own action). The cards stand out: border and shadow, a coloured bar on top and a light tint by state (heating, on target, cooler, warmer), and a hover effect.
- **Dashboard card with tabs:** New option `layout: tabs` (in the editor "Layout"). One card with a head (state, operating mode, fan stage) and the tabs Overview, Rooms, Maintenance and History; the tabs follow from the chosen sections, and in narrow cards the bar shows icons only. New test page `tests/browser/card.html` for the card (`?cfg={...}&w=380`).
- **Dashboard card reorganised:** New section **overview** (state of the unit, operating mode, fan stage, supply, extract and fresh air, power, PTC) shares a card with the **controls** (operating mode, fan stage, boost, cooling enable). 15 sections become 9 in a fixed order; the old names (`heatpump`, `kpi`, `mode`, `fan`, `quick`, `air`) keep working and are mapped. New option `preset` (`compact`, `standard`, `all`); new cards start with "standard". Alerts always show on top. The system diagram falls back to the simple view in narrow cards, the rooms show a PTC line. The editor groups the sections (operate, unit, details), "Advanced" is folded.
- **Dashboard card tidied up:** The card shows its own status card again (filter age, deadline to the forced shutdown, "Filter changed" button) instead of the panel's. Dead jumps to panel tabs are gone. The refrigerant circuit is now "Refrigerant circuit and drives" and shows compressor and fan speeds instead of the outside temperature. The editor shows "Alerts" instead of the raw key `alerts`, the older sections `mode`, `fan`, `quick` and `air` only when a card uses them, and no sensor and speed fields any more: sensors come from the integration options (still overridable in YAML).
- **Panel – clickable values:** the CO₂, humidity and PTC chips of the room cards, the current temperature in the ring, the measurements in the diagnosis and the tiles of the rooms summary open the dialog of their entity (history, settings). So do the values in the overview diagram (temperatures, speeds, heat recovery), the fan speeds in the operation card, the status cards in overview and diagnosis, the hints and the values in the hot water picture (PV, power, water and outside temperature). The dashboard card links its values too (air diagram, heat pump, refrigerant circuit, status, key figures, room detail). In the list view the whole row still opens the details.
- **PTC elements: power and consumption.** The options let you pick one power sensor and one energy meter for all PTC elements together (your own sensors, e.g. from a Shelly). The panel shows them in the **overview** (PTC tile with curve and "x of y rooms heating"; it replaces the compressor tile while a PTC power sensor is set), in the **diagnosis** (PTC auxiliary heating row with one segment per room, plus PTC consumption today and total), in the **history** (PTC chip, a lane in "All" and a bar card for the PTC consumption) and as tiles in the rooms summary (Wh, kWh and MWh are accepted). The key figure tiles now come in pairs: supply and outside air, heat recovery and power, PTC and hot water. The unit itself provides no such values.
- **Panel – room popup on phones:** swipe the handle or header down to close it.
- **Panel – history:** New views **All** (air, heat recovery, refrigerant circuit, drives and power as lanes on one time axis, with running bands and bypass phases), **Refrigerant circuit** (the six temperatures, the compressor temperature starts hidden) and **Drives** (compressor, supply and extract fan in rpm). "All" is the default and replaces the "Compressor" chip.
- **Panel – table below the charts:** Now uniform with **Now**, min, max and mean (the now value comes from the live sensor). A click on a row hides the curve and the scale adjusts. The table can be folded; the curve names then stay as switches.
- **Panel – key figures:** New **Compressor** tile (speed with a 24 hour curve, opens the drives in the history). The grid is 3 × 2, and 2 × 3 on mobile.
- **Switch "Fan stage 4 while PTC heats":** When on (default: off) and a PTC element of a room heats, the ventilation runs at stage 4 (as intensive ventilation on units that offer it). Two polls without an active PTC later it returns to the previous stage and automatic. A boost you started yourself is left alone.

**Changed**
- **Panel – hot water:** The switching thresholds now sit in the Operation card, the targets below the tank. The tank is taller, its fill level follows the water temperature, and the three targets are drawn as marks at its edge.
- **Panel – charts:** All line charts have the same height (300 px), the bar charts are somewhat taller than before. The Σ (kWh) column below the charts is gone; the energy is in the Energy card.
- **Panel – status and maintenance:** The device filter now follows the system error directly.
- **Panel – hot water, status:** When the water is inside the switching band, the status bar now says "Keeps heating" (up to the upper limit) or "Paused" (with the temperature at which it starts again), depending on whether the heat pump runs, instead of "Nothing to do". The PV status "Too cold" is now "PV blocked: too cold outside".

**Fixed**
- Labels of reference lines (for example "Target 53°" and "PV target 60°") no longer overlap.
- A flat curve gets a readable axis instead of the same value three times.
- **Writing:** If the unit has not yet confirmed a written value (for example the room target temperature) after the 2 second wait, it is read again after 3, 6 and 10 seconds until confirmed. The value used to jump back to the old one briefly and was only right after the next poll (up to 30 s).

## 2.4.3 – 2026-11-20

**Fixed**
- The hot water heat pump "Heating" sensor used a state listener that ran outside the event loop and raised an error on every power change. It now updates immediately.

## 2.4.2 – 2026-11-18

**Changed**
- **Panel – key figures:** All tiles have a 24 hour curve (supply air, heat recovery, power, outside, hot water) and are top-aligned, so label and value sit at the same height everywhere. The hot water tile no longer shows the program, it is already shown above.
- **Panel – history:** Power and PV are drawn as a staircase (the last value holds until the next one) instead of sloping between two changes. The zero line is stronger and no longer hidden by the curve.

**Fixed**
- The sensor problem notice still said "enables switched off". Since 2.4.1 the heat pump then regulates itself, and the text now says so.

## 2.4.1 – 2026-11-18

**Changed**
- **TWWP on sensor problem:** If a temperature sensor or target fails, the normal enable stays on and the PV enable goes off. The heat pump then regulates itself instead of the hot water cooling down. Applies to the integration and the blueprint.

## 2.4.0 – 2026-11-18

**New**
- **Hot water heat pump (TWWP):** A new sub-integration, added with "Add hot water heat pump" on the integration. The controller switches the enable of a hot water heat pump (not a Modbus device; you choose the switches and sensors of your own setup) by tank temperature, PV surplus and time of day in the programs normal, PV, minimum and night shutdown. It decides every minute and starts in **dry-run mode**: it switches nothing and reports what it would switch. The "Control active" switch on the device lets it take over; active automations that use the same enable switches are reported. Minimum run time and minimum pause of the enable are adjustable (default 10 minutes, 0 = off).
- **TWWP entities:** A water heater with the program as its mode; the numbers "Target temperature", "Target temperature PV" and "Minimum temperature" (30-60 °C, whole degrees, default 50, 60 and 40 °C); "Hysteresis start" (1-10 K, default 3 K) and "Hysteresis stop" (0-5 K, default 1 K); the sensors "Program", "PV status", "Last decision" and "Planned switching"; the binary sensors "Heating" (from the heat pump's power when one is chosen, above 20 W) and "Sensor problem".
- **Panel – "Hot water" tab:** Shows per heat pump the tank with energy flow and status, a scale with the switching thresholds, the targets as sliders (the hysteresis is collapsed) and a history with programs, phase bands and reference lines; the "All" view is the default. The overview gets a "Hot water" tile among the key figures and notes on the control.
- **Blueprint "Hot water heat pump with PV surplus":** Controls the enable of a hot water heat pump (TWWP) through two switches by tank temperature, PV surplus and time of day (PV, normal, minimum mode, night shutdown). If a sensor fails the enables are switched off. Usable independently of Modbus and of the integration; hysteresis adjustable (inputs "Start/Stop hysteresis"). Optional minimum run time and minimum pause of the enable switch (inputs "Minimum run time" and "Minimum pause", default 10 minutes, 0 = off).
- **Room temperature as a sensor:** Every room gets a `sensor.<room>_room_temperature` with its actual temperature (register 150+n, same as on the thermostat), with long-term statistics. This includes room 1, which had no temperature sensor before.
- **Setpoint as a diagnostic sensor:** One `sensor.<room>_setpoint_confirmed` per room with the setpoint confirmed by the device (register 180+n), with long-term statistics.
- **Write check:** Every value written (setpoint, PTC enable, cooling, fan stage, fan automatic, intensive ventilation, operating mode) is remembered and compared with the value the unit reports back. If it does not confirm it within 30 seconds, a warning is logged and the "Last write error" sensor shows the attributes `last_not_applied`, `last_not_applied_at` and `not_applied_count`. Each room's setpoint sensor shows `last_sent`, `last_sent_at` and `write_status` (`pending`, `confirmed`, `not_applied`). The new diagnostic sensor `sensor.proxon_fwt_write_status` shows "OK", "Pending" or "Not applied". The unit may also set a value differently on purpose (for example a fan stage while the automatic is on); the warning then appears as well.

**Changed**
- **PTC enable icon:** The "PTC element enabled" switch shows a toggle (`mdi:toggle-switch-variant`) instead of the radiator that the "PTC element active" sensor already uses. An icon set by hand in the UI is kept.
- **Panel – history:** The traces each have their own scale and share the time axis. The range selector sits in the header of the history card and also works on mobile.
- **Panel – appearance:** The chips in the header are the same height, small type is 1 px larger everywhere.
- **Options:** The energy meter sits directly below the power sensor.

## 2.3.0 – 2026-11-17

**Changed**
- **Room thermostats (`climate`):** The mode now only reflects the room's PTC element: "Heat" while it is enabled, otherwise "Off". Changing it sets the room's PTC enable (like the switch). "Heat/Cool" is gone. The new action (`hvac_action`) shows "Heating" while the PTC element is running, otherwise "Idle" or "Off". **Automations** that test for the state `heat_cool` or a fixed state `heat` need adjusting.
- **Panel – history:** One shared range switch applies to history, heat pump runtime and energy (bars per hour, day or month; the running bar is marked and the legend shows when the data was loaded). The "yearly overview" card is gone, it is covered by the "1 year" range.
- **Panel – rooms:** The room ring can be dragged by its dot (also with the arrow keys), spans the room's settable range and no longer has an empty bottom. The room dialog is redesigned. Value chips are larger, the operating mode in the header is a chip, the key figures always show four tiles ("–" and the reason "no value" or "no source" when a value is missing), and the PTC row in the overview also names the enabled rooms.
- **Panel – updates:** New values only change the affected parts instead of rebuilding the whole page. The scroll position no longer jumps to the top.

**Fixed**
- **Panel – focus:** Restoring the focus after an update (for example after closing the room dialog) raised a JavaScript error (`CSS.escape`; the name `CSS` was the stylesheet text in the code), which aborted the update. Found by the new browser test.
- **Feedback after writing:** A second command shortly after the first (for example PTC on, then off) waited up to 10 seconds for the device's confirmation. The gap between two read-backs is now 1 second.

**Added**
- **Energy meter:** New optional setting `energy_entity` (integration options and dashboard editor). With a meter the energy card shows the measured consumption per hour, day or month from the long-term statistics (Wh, kWh and MWh) instead of an estimate from the mean power. Without a meter it stays an estimate.
- **Preferred stage can be set:** New select `select.…_preferred_fan_stage` (stage 1-4) and a stage selector in the panel. It sets the fan stage restored after the heat pump has run.
- New screenshots of the side panel (light and dark) in the README.
- `tests/browser/harness.html` and `tests/browser/smoke.py`: a test page for the panel with sample data and a browser test that also runs in CI.

## 2.2.2 – 2026-11-13

**Fixed**
- **Boost ventilation:** stage 4 is no longer learned as the "preferred stage". Before, the fan stage could jump back to 4 permanently after the heat pump stopped.
- **Boost end:** if the function block is unreadable when the boost expires, the end is retried every minute instead of skipping the restore. After an HA restart the timer waits for the first data instead of failing with an error.
- **Connection loss:** if the unit only answers with Modbus errors, the connection error and repair issue now also appear with 0 CO₂/humidity sensors. Replies with too few registers count as a read error of that block.
- **PTC enable:** if the mask could not be read, nothing is written with mask 0 any more (that would have cleared the other rooms' enables); a message is shown instead.
- **Restore fan stage:** the switch stays available during a connection outage, so the setting is no longer lost on an HA restart.
- **Statistics:** at shutdown at most a few seconds instead of up to 5 minutes of runtime, starts and filter hours are missing.
- **CO₂ intensive ventilation blueprint:** the restore only runs if intensive ventilation is on, and the scene is kept per automation. If it is missing after a restart, only intensive ventilation is turned off.
- **Panel:** focus selectors are escaped, a boost extended by a service shows the new end time, and with several units the settings of the first one are no longer used.

**Changed**
- **Rooms and areas:** the area chosen in the options is only applied if the room device has none yet. Areas changed by hand are kept.
- **Error messages** are translated (de/en).
- **Connection:** the host in the identifier of a TCP connection is used trimmed and lowercase. Existing entries are unchanged.
- Unused code removed from the panel.

## 2.2.1 – 2026-11-09

**Changed**
- **History:** min, max and average are shown as an aligned table with a header row below the chart (right-aligned figures, plus Σ in kWh for power). The legend no longer repeats the curves and only lists heat pump, bypass and previous period.
- **Operation card:** the "preferred stage" line is indented below the switch; boost ventilation is set apart by a divider and a stronger heading.

**Fixed**
- **System diagram:** no dot on top of the ring while the compressor is off, and the "Compressor" label has more space from the ring.

## 2.2.0 – 2026-11-08

**Changed**
- **Side panel header:** logo and title on the left, two quiet chips on the right: the heat pump state ("Heating", "Cooling", "Idle", with the duration next to it) and the operating mode. The chip turns red when the connection is lost. On phones the chips sit below the title.
- **Boost ventilation in the Operation card:** the quick actions card is gone from the panel. Boost ventilation now sits below operating mode and fan stage: three duration chips without text (the default from the options is outlined); while a boost runs it shows the end time and an "End" button. The card section `quick` stays valid and now shows boost ventilation only.
- **"All rooms ±1 °C" removed:** it was hardly needed and looked like a filter next to the filters.
- **Rooms as a dialog:** a room's details no longer expand inside the grid (which shifted everything) but open a dialog, a bottom sheet on phones, with Esc and focus handling.
- **Phone:** hint button below the text instead of beside it, room tiles without icon (with a colour stripe instead), history ranges as one equal-width row, the last key figure tile fills its row.
- **Hint badge** sits on the "Diagnostics" tab, where the hints are listed.
- **How the panel is served:** the files are modules below `/proxon_modbus/<version>/`, so the browser fetches them anew after every update. The card's old path stays as an alias; manually added resources keep working.
- **Capability flags (register 315)** are honoured on writes: fan stage, operating mode, fan auto mode and intensive ventilation are not written when the unit clearly refuses them. A clear message is shown.

**Fixed**
- **Panel:** room names and other texts are escaped; writes run one after the other, lock the controls and report failures as a Home Assistant notice; quick clicks on the setpoint stepper are no longer lost; the history cache is tied to the unit and data source (failures are retried after 15 s); integration options apply without a reload; power in kW/MW is converted; the CO₂ hint can be dismissed and does not come back after short gaps; the 7-day runtime has a tooltip; the room order follows the room number; the write error banner disappears after an hour.
- **Statistics:** runtime, starts and filter hours were practically never saved during operation. Now at most every 5 minutes and on unload.
- **PTC enable:** rooms switched in parallel overwrote each other (shared register). The writes are now serialised.
- **Boost ventilation:** no leftover timer after a failed setup; a partial failure at the start no longer leaves fan auto mode off; start and end lock each other; ending is retried at most five times; nothing is written back after an operating mode change; an intensive ventilation that was already on stays on. `start_boost` on another switch now explains that it only works for boost ventilation.
- **"Filter changed"** is no longer lost on restart.
- **Connection loss:** a poll on a dead connection took a multiple of the timeout; it now aborts after two connection errors.
- **Cleanup:** entities the integration no longer provides (fewer CO₂/humidity sensors, cooling or recirculation filter switched off) are removed from the registry, storage files are deleted when the integration is removed, the panel is no longer re-registered on option changes. Reconfigure keeps the title.
- **Home Assistant 2027.8:** the deprecations reported by HA 2026.10 are fixed (room devices via `via_device_id`, device lookup via `async_get_device_by_identifier`, `UnitOfRatio` for ppm).

**Internal**
- The frontend is split into ES modules under `www/lib/` (no build step).
- New tests: coordinator with small stubs, render tests for all panel tabs, and 26 integration tests against a real test Home Assistant (setup, entities, served files, control, boost after a restart, diagnostics, config, options and reconfigure flow). CI runs them in three jobs.

## 2.1.0 – 2026-11-02

**New**
- **Dismiss hints in the panel:** warnings and infos can be hidden for 24 hours with ✕ (errors cannot), stored in the Home Assistant user profile; the tab counters ignore hidden hints. The key figures now sit under the system diagram.
- **Dashboard card aligned with the panel:** new section `operation` (operating mode and fan stages in one card, now the default; `mode` and `fan` remain available separately), new section `quick` (boost ventilation with 15/30/60 minutes), rooms show "heating" only while the PTC element is active, and "Status and maintenance" shows the filter age, the deadline to the forced shutdown and the "Filter changed" button.
- **Yearly overview in the history tab:** heat pump runtime, energy and starts per month over 12 months, with the mean outdoor temperature and a marker for the last filter change. The values come from the long-term statistics and fill up over time; energy is estimated from the mean power.
- **Boost ventilation with timer:** New "Boost ventilation" switch in the integration. It switches to the highest level (intensive ventilation or stage 4) and automatically restores the previous state after the chosen duration (default 30 minutes, 15/30/60 minutes in the panel, freely selectable with the service `proxon_modbus.start_boost`), even without the panel open and across Home Assistant restarts. The panel uses it and shows the end time.
- **Dashboard card `custom:proxon-fwt-card`:** the integration ships its own card (operating mode, air paths as a cross-flow heat exchanger, ventilation, heat pump, refrigerant circuit, status, rooms). It is loaded automatically and finds the entities by itself; power consumption and outdoor temperature are optional and can be replaced by your own entities. See the README for details.
- **Side panel "Proxon FWT":** its own sidebar entry with an animated system diagram (including all temperature probes), key figures with a calculated heat recovery rate, room heat map, notice banners and a 24-hour history. The card `custom:proxon-fwt-card` gained the optional sections `schema`, `kpi`, `alerts` and `history`; operating-mode, fan and room controls now have icons and colours.
- **Dashboard settings in the integration options:** outdoor side of the heat exchanger, own power sensor and own outdoor temperature sensor can be set centrally and apply to the card and side panel in every browser (read through the new websocket command `proxon_modbus/settings`). Values in the card take precedence.
- **History and bypass:** phases with the summer bypass open are marked as a blue band in the history (1 day, 1 week) and are left out of the heat recovery rate.
- **History with key values:** below the chart, min, max and mean per curve are shown, for power also the energy (kWh) over the chosen period.
- **Compare with the previous period:** a switch in the history overlays the previous period (yesterday, last week, last month, last year) as a dashed curve.
- **New "Heat recovery rate" sensor:** the heat recovery rate is now calculated in the integration (empty while the bypass is open) and has real long-term statistics. Card and panel use it; the history for 1 month and 1 year uses its statistics once available.
- **Key figures with history:** the heat recovery tile shows a 24-hour curve; clicking a key figure (supply, heat recovery, power, outside) opens the matching history in the panel.
- **Diagnosis redesigned:** three status tiles on top (heat pump, device filter, system error), the measurements across the full width below, and a "Runtime and starts" card (today / total).
- **Own CO₂ and humidity sensors per room:** in the "Names and areas" step you can pick existing sensors from other devices for each room, in a collapsible "own sensors" section. They replace the unit's external inputs in the card and panel.
- **Cooling mode in the system diagram:** in cooling mode the diagram reverses the refrigerant circuit (evaporator and condenser swap sides).
- **Restore fan stage after the heat pump has run:** The unit raises the fan stage when the heat pump starts and never lowers it again. The new switch "Restore fan stage after heat pump" (off by default) remembers the stage you chose while the heat pump was idle (Eco summer/winter only, fan auto off) and sets it back after the run. The card and side panel show the preferred stage.
- **Heat pump and filter statistics:** New sensors for heat pump runtime and starts (today and total) and operating hours of the device and recirculation filters. The integration counts them itself and they survive restarts. Filter hours start over when the unit clears "change filter". They only count while the unit is not off.
- **Blueprint "Night fan stage setback":** a lower fan stage at night, the normal one in the morning (Eco summer/winter only, fan auto off).
- **Extended diagnostics download:** now includes the polling interval, the last write error, the state of the fan stage restore and the statistics. Host and serial port stay redacted.
- **Repair notices:** If the unit is unreachable for more than 10 minutes or three write commands fail in a row, a notice with hints appears under Repairs. It disappears by itself once everything works again.
- **Side panel rebuilt:** Four tabs (Overview, Rooms, History, Diagnostics; a bottom bar on phones). The header now shows only the title and one status line ("Heat pump heating · Eco winter · for 2 h 14 min"). New: hints card (filter due soon, frequent cycling, low heat recovery, high CO₂), quick actions (boost ventilation, all rooms ±1 °C), colour legend, measurements as a table, maintenance bars for the filters, clickable compressor in the diagram, tooltips, focus rings and loading placeholders.
- **Rooms page redesigned:** a ring gauge per room (actual temperature, target marker), target adjustable with − and + right on the card, key figures on top (avg. temperature, rooms heating, highest CO₂, avg. humidity), filters (heating, deviation, high CO₂) and the views Cards, Compare and List. Details with a 24-hour curve expand inside the card; the side drawer is gone.
- **30-day history:** Ranges 24 h / 7 days / 30 days (30 days from long-term statistics), selectable metrics (temperatures, power, compressor, heat recovery, CO₂, humidity) with crosshair and tooltip, runtime versus outdoor temperature and energy per day (estimated from mean power). The card has the optional sections `runtime` and `energy` for this.
- **Device filter in days with forced-shutdown warning:** The maintenance bar shows the days since the last change (default 180, option "Device filter change interval"). As soon as the unit reports "change filter", a 21-day countdown to the forced shutdown runs: new sensors "Device filter age" and "Days until forced shutdown", a repair issue (red from 7 days) and a hint in the panel. A change is detected when the unit clears the message, or by the "Filter changed" button. The recirculation filter is optional (option "Recirculation filter installed", off by default) and hidden otherwise.
- **Panel:** the integration's logo in the header, a better balanced overview (diagram on the left, key figures, ventilation and quick actions on the right), evenly distributed room cards, diagnostics in two columns. Heat recovery now uses the supply air after the heat exchanger, so it is no longer distorted while the heat pump runs.
- **Names and areas during setup:** after "Rooms and sensors" a new step "Names and areas" follows, with the usual room names as suggestions, assignment to Home Assistant areas (matching areas are suggested by name) and sensor assignment. The fields in the options now have readable labels instead of "room_1".
- **Outdoor-air side in the setup dialog:** fresh/exhaust air on the left or right is chosen during setup (and still in the options). The "Outdoor side right" button in the panel header is gone so the setting is the same in every browser.
- **Card and panel on phones:** on narrow screens the diagram, tiles and chips in the side panel no longer overflow. The card appears in the card picker with a link to the documentation.
- **History with heat pump runtime:** the side panel's 24-hour history now shades the periods the heat pump ran. A new "7 days" view shows runtime and starts per day (from the recorder history, no new sensors needed).
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

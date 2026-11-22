// Renders every tab/section of card and panel against a synthetic hass: no exception, no "undefined"/"NaN" in the output.
// Run with: node --test tests/panel-render.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const WWW = new URL("../custom_components/proxon_modbus/www/", import.meta.url);

class El {
  constructor() { this.attrs = new Set(); this.style = {}; this.clientWidth = 1000; }
  attachShadow() { this.shadowRoot = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }; return this.shadowRoot; }
  addEventListener() {} removeEventListener() {}
  toggleAttribute(n, on) { on ? this.attrs.add(n) : this.attrs.delete(n); }
  dispatchEvent() { return true; }
  appendChild() {}
}
const registry = {};
Object.assign(globalThis, {
  HTMLElement: El, CustomEvent: class {}, Event: class {},
  customElements: { get: (n) => registry[n], define: (n, c) => { registry[n] = c; } },
  window: { customCards: [] }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: { createElement: (tag) => ({ tag, textContent: "", addEventListener() {} }), addEventListener() {}, removeEventListener() {} },
  ResizeObserver: class { observe() {} disconnect() {} },
});
globalThis.window.window = globalThis.window;
const X = await import(new URL("proxon-fwt-card.js", WWW).href);

// ---- synthetic data ---------------------------------------------------------
const entities = {}, states = {}, devices = {};
const ent = (id, device, extra = {}, state = "1", attrs = {}) => {
  entities[id] = { entity_id: id, platform: "proxon_modbus", device_id: device, ...extra };
  states[id] = { state, attributes: attrs, last_updated: "2026-11-07T11:00:00Z" };
};
devices.central = { id: "central", name: "Proxon FWT" };
const num = { temp_supply_air: "19.4", temp_fresh_air: "4.1", temp_exhaust_air: "6.2", temp_extract_air: "21.3", temp_pre_evaporator: "3", temp_evaporator: "1", temp_post_preheat: "10", temp_pre_condenser: "40", temp_condenser: "45", temp_compressor: "70", compressor_speed: "2400", fan_speed_supply: "1500", fan_speed_extract: "1480", heat_recovery: "82", filter_age_days: "45", filter_shutdown_days: "30", hp_runtime_total: "1200", hp_starts_total: "300", hp_runtime_today: "3.5", hp_starts_today: "4", power_consumption: "450" };
for (const [k, v] of Object.entries(num)) ent(`sensor.${k}`, "central", { translation_key: k }, v, { unit_of_measurement: k === "power_consumption" ? "W" : "" });
ent("select.operating_mode", "central", { translation_key: "operating_mode" }, "eco_winter", { options: ["off", "eco_winter", "eco_summer", "comfort"] });
ent("select.fan_stage", "central", { translation_key: "fan_stage" }, "stage_2", { options: ["off", "stage_1", "stage_2", "stage_3", "stage_4"] });
for (const k of ["fan_auto", "fan_intensive", "fan_stage_restore", "cooling_enable", "boost"]) ent(`switch.${k}`, "central", { translation_key: k }, k === "fan_auto" ? "on" : "off");
for (const k of ["heat_pump_heating", "heat_pump_cooling", "heat_pump_continuous", "bypass_active", "filter_device", "filter_recirculation", "error_system", "mode_change_possible", "fan_stage_4_selectable", "intensive_ventilation_selectable", "cooling_available"]) ent(`binary_sensor.${k}`, "central", { translation_key: k }, k === "heat_pump_heating" || k === "mode_change_possible" || k === "fan_stage_4_selectable" ? "on" : "off");
ent("sensor.last_write_error", "central", { translation_key: "last_write_error" }, "none", {});
ent("button.filter_changed", "central", { translation_key: "filter_changed" }, "unknown");
["Wohnen", "Schlafen", "Bad & <WC>"].forEach((name, i) => {
  const id = `room${i}`;
  devices[id] = { id, name, via_device_id: "central", identifiers: [["proxon_modbus", `e1_room_${i}`]] };
  ent(`climate.${id}`, id, {}, "heat", { current_temperature: 20.5 + i, temperature: 21, min_temp: 18, max_temp: 26, target_temp_step: 0.5 });
  ent(`binary_sensor.${id}_ptc_active`, id, { translation_key: "ptc_active" }, i === 1 ? "on" : "off");
  ent(`switch.${id}_ptc_enable`, id, { translation_key: "ptc_enable" }, i === 1 ? "on" : "off");
  ent(`sensor.${id}_co2`, id, {}, String(600 + i * 400), { device_class: "carbon_dioxide" });
  ent(`sensor.${id}_rf`, id, {}, String(40 + i * 5), { device_class: "humidity" });
});

const hass = {
  language: "de", entities, states, devices,
  callWS: async (m) => (m.type === "proxon_modbus/settings" ? [] : m.type === "frontend/get_user_data" ? { value: null } : {}),
  callService: async () => {},
};


const tick = () => new Promise((r) => setTimeout(r, 5));

async function render(el, prep) {
  for (let pass = 0; pass < 3; pass++) { prep(); el._sig = ""; el._update(); await tick(); }
  prep(); el._sig = ""; el._update();
  return el.shadowRoot.innerHTML;
}

const check = (html) => {
  assert.ok(html.length > 500);
  assert.ok(!html.includes("undefined"), "undefined in output");
  assert.ok(!html.includes("NaN"), "NaN in output");
};

test("every panel tab and room view renders", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  for (const tab of ["overview", "rooms", "history", "diag"]) check(await render(panel, () => { panel._tab = tab; }));
  for (const view of ["cmp", "list", "cards"]) check(await render(panel, () => { panel._tab = "rooms"; panel._rview = view; }));
  for (const range of ["24h", "7d", "30d", "1y"]) check(await render(panel, () => { panel._tab = "history"; panel._histRange = range; }));
});

test("room names are masked and the details dialog opens", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const html = await render(panel, () => { panel._tab = "rooms"; panel._rview = "cards"; panel._ropen = new Set(["climate.room1"]); });
  assert.ok(html.includes("Bad &amp; &lt;WC&gt;"));
  assert.ok(!html.includes("<WC>"));
  assert.ok(html.includes('class="rsheet'));
});

test("the dashboard card renders all sections, in German and English", async () => {
  const card = new X.ProxonFwtCard();
  card.setConfig({ sections: X.ALL_SECTIONS });
  card.hass = hass;
  check(await render(card, () => {}));
  const en = new X.ProxonFwtCard();
  en.setConfig({ type: "custom:proxon-fwt-card" });
  en.hass = { ...hass, language: "en" };
  check(await render(en, () => {}));
});

test("the hint badge sits on the Diagnostics tab, where the hints are listed", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass; // room 3 has 1400 ppm CO2: a warning hint
  const html = await render(panel, () => { panel._tab = "overview"; });
  const badged = html.split('<button class="tabbtn').slice(1).filter((b) => b.includes('class="badge"')).map((b) => /data-v="(\w+)"/.exec(b)[1]);
  assert.deepEqual(badged, ["diag"]);
  const diag = await render(panel, () => { panel._tab = "diag"; });
  assert.ok(diag.includes('class="ins w"'));
});

test("boost ventilation sits in the Operation card; there is no quick-actions card or all-rooms action", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const html = await render(panel, () => { panel._tab = "overview"; });
  const op = html.slice(html.indexOf('class="opw"'));
  assert.ok(op.includes('data-act="boostmin"'), "duration chips in the Operation card");
  assert.ok(!html.includes("Schnellaktionen"));
  const rooms = await render(panel, () => { panel._tab = "rooms"; });
  assert.ok(!rooms.includes('data-act="allroom"'));
});

// ---- hot water heat pump (TWWP) ---------------------------------------------
const twEntities = { ...entities }, twStates = { ...states }, twDevices = { ...devices };
const twEnt = (id, extra = {}, state = "1", attrs = {}) => {
  twEntities[id] = { entity_id: id, platform: "proxon_modbus", device_id: "tw1", ...extra };
  twStates[id] = { state, attributes: attrs, last_updated: "2026-11-07T11:00:00Z" };
};
twDevices.tw1 = { id: "tw1", name: "Warmwasser <TWWP>", via_device_id: "central", identifiers: [["proxon_modbus", "e1_twwp_SUB1"]] };
twEnt("water_heater.tw", {}, "pv", { current_temperature: 54.2, temperature: 53 });
twEnt("number.tw_normal", { translation_key: "twwp_target_normal" }, "53", { min: 30, max: 60, step: 1 });
twEnt("number.tw_pv", { translation_key: "twwp_target_pv" }, "60", { min: 30, max: 60, step: 1 });
twEnt("number.tw_min", { translation_key: "twwp_target_min" }, "42", { min: 30, max: 60, step: 1 });
twEnt("number.tw_hlow", { translation_key: "twwp_hyst_low" }, "3", { min: 1, max: 10, step: 0.5 });
twEnt("number.tw_hhigh", { translation_key: "twwp_hyst_high" }, "1", { min: 0, max: 5, step: 0.5 });
twEnt("sensor.tw_program", { translation_key: "twwp_program" }, "pv");
twEnt("sensor.tw_pv_status", { translation_key: "twwp_pv_status" }, "pv");
twEnt("sensor.tw_reason", { translation_key: "twwp_reason" }, "pv", { control: false, last_run: new Date(Date.now() - 23000).toISOString(), last_error: "a <b>" });
twEnt("sensor.tw_planned", { translation_key: "twwp_planned" }, "1", { switches: { "switch.freigabe": "on" } });
twEnt("binary_sensor.tw_problem", { translation_key: "twwp_sensor_problem" }, "off");
twEnt("switch.tw_control", { translation_key: "twwp_control" }, "off");
for (const [id, state, a] of [["sensor.tw_water", "54.2", { unit_of_measurement: "°C" }], ["sensor.tw_outer", "5.2", { unit_of_measurement: "°C" }], ["sensor.tw_pv", "2.5", { unit_of_measurement: "kW" }],
  ["sensor.tw_power", "389", { unit_of_measurement: "W" }], ["sensor.tw_energy", "5604.6", { unit_of_measurement: "kWh" }], ["switch.freigabe", "on", {}], ["switch.freigabe_pv", "off", {}]]) {
  twStates[id] = { state, attributes: a, last_updated: "2026-11-07T11:00:00Z" };
}
const twSettings = [{ device_id: "central", twwp: [{ device_id: "tw1", water_temp: "sensor.tw_water", outer_temp: "sensor.tw_outer", pv_power: "sensor.tw_pv",
  power_entity: "sensor.tw_power", energy_entity: "sensor.tw_energy", enable_switch: "switch.freigabe", enable_pv_switch: "switch.freigabe_pv" }] }];
const calls = [];
const twHass = { ...hass, entities: twEntities, states: twStates, devices: twDevices,
  callWS: async (m) => (m.type === "proxon_modbus/settings" ? twSettings : m.type === "frontend/get_user_data" ? { value: null } : {}),
  callService: async (...a) => { calls.push(a); } };

test("the hot water tab appears only with a heat pump, and renders without undefined or NaN", async () => {
  const none = new X.ProxonFwtPanel();
  none.hass = hass;
  assert.ok(!(await render(none, () => { none._tab = "warm"; })).includes('data-v="warm"'), "no TWWP: no tab, falls back to the overview");
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  assert.ok(html.includes('data-v="warm"') && html.includes("Warmwasser"));
  assert.ok(html.includes("54,2°") && html.includes("389 W") && html.includes("2,5 kW") && html.includes("Messpunkt Mitte"), "main picture: water, power, PV");
  assert.ok(html.includes('data-act="twstep"') && html.includes('data-act="twctl"'));
  assert.ok(html.includes("PV-Überschuss: Start") && html.includes("vor 2"));
  assert.ok(html.includes("switch.freigabe → an"), "planned switching is listed");
});

test("markup in the device name and in the last error is masked", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = { ...twHass, devices: { ...twDevices, tw1: { ...twDevices.tw1 } } };
  const many = { ...twDevices, tw2: { id: "tw2", name: "Zweite", via_device_id: "central", identifiers: [["proxon_modbus", "e1_twwp_SUB2"]] } };
  twEntities["water_heater.tw2"] = { entity_id: "water_heater.tw2", platform: "proxon_modbus", device_id: "tw2" };
  twStates["water_heater.tw2"] = { state: "off", attributes: {}, last_updated: "2026-11-07T11:00:00Z" };
  panel.hass = { ...twHass, devices: many };
  const html = await render(panel, () => { panel._tab = "warm"; });
  assert.ok(html.includes("Warmwasser &lt;TWWP&gt;") && !html.includes("<TWWP>"));
  assert.ok(html.includes("a &lt;b&gt;") && !html.includes("a <b>"));
  check(html);
  delete twEntities["water_heater.tw2"]; delete twStates["water_heater.tw2"];
});

test("the header shows the program, and the controls call the right services", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "overview"; });
  assert.ok(html.includes('class="hchip m"><ha-icon  icon="mdi:water-boiler"></ha-icon>PV'), "program chip in the header");
  calls.length = 0;
  const el = (act, v) => ({ dataset: { act, v } });
  panel._click({ composedPath: () => [el("twctl", "switch.tw_control")] });
  await tick();
  assert.deepEqual(calls[0], ["switch", "toggle", { entity_id: "switch.tw_control" }]);
  panel._click({ composedPath: () => [el("twstep", "number.tw_normal|1")] });
  panel._click({ composedPath: () => [el("twstep", "number.tw_normal|1")] });
  assert.equal(panel._twTarget("number.tw_normal"), 55, "steps add up on the pending target (step 1)");
  await new Promise((r) => setTimeout(r, 700));
  const set = calls.filter((c) => c[1] === "set_value");
  assert.equal(set.length, 1, "written once");
  assert.deepEqual(set[0], ["number", "set_value", { entity_id: "number.tw_normal", value: 55 }]);
});

test("the overview shows a hot water tile in the panel, not in the dashboard card, and flags a sensor problem", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "overview"; });
  const tile = html.slice(html.indexOf('data-v="warm" role="button"'));
  assert.ok(html.includes('data-act="tab" data-v="warm" role="button"'), "tile opens the Hot water tab");
  assert.ok(tile.includes("54,2°") && !tile.includes(">PV<"), "temperature, no program (it is in the header)");
  check(html);
  const plain = new X.ProxonFwtPanel();
  plain.hass = hass;
  assert.ok(!(await render(plain, () => { plain._tab = "overview"; })).includes('data-v="warm"'), "no heat pump: no tile");
  const card = new X.ProxonFwtCard();
  card.setConfig({ sections: X.ALL_SECTIONS });
  card.hass = twHass;
  assert.ok(!(await render(card, () => {})).includes('data-v="warm"'), "the card has no tabs");
  const bad = { ...twHass, states: { ...twStates, "binary_sensor.tw_problem": { ...twStates["binary_sensor.tw_problem"], state: "on" } } };
  const p2 = new X.ProxonFwtPanel();
  p2.hass = bad;
  const down = await render(p2, () => { p2._tab = "overview"; });
  assert.ok(down.includes("Sensor oder Sollwert nicht verfügbar") && down.includes("mdi:alert-outline"));
});

test("the overview flags a failed sensor, and a controller that only observes and would act differently", async () => {
  const withState = (over) => ({ ...twHass, states: { ...twStates, ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, { ...twStates[k], state: v }])) } });
  const banners = async (h, el = new X.ProxonFwtPanel()) => { el.hass = h; return (await render(el, () => { el._tab = "overview"; })); };
  const obs = await banners(withState({})); // control off, 1 planned switching
  assert.ok(obs.includes("Probelauf: Der Regler würde 1 Schalter anders stellen") && obs.includes('class="banner i go"') && obs.includes('data-act="tab" data-v="warm"'));
  check(obs);
  assert.ok(!(await banners(withState({ "switch.tw_control": "on" }))).includes("Probelauf"), "controlling: no dry-run banner");
  assert.ok(!(await banners(withState({ "sensor.tw_planned": "0" }))).includes("Probelauf"), "nothing planned: no banner");
  assert.ok((await banners(withState({ "sensor.tw_planned": "3" }))).includes("Regler würde 3 Schalter"));
  const bad = await banners(withState({ "binary_sensor.tw_problem": "on" }));
  assert.ok(bad.includes('class="banner r go"') && bad.includes("Sensor oder Sollwert nicht verfügbar") && !bad.includes("Probelauf"));
  const card = new X.ProxonFwtCard();
  card.setConfig({ sections: X.ALL_SECTIONS });
  assert.ok(!(await banners(withState({ "binary_sensor.tw_problem": "on" }), card)).includes("Freigaben abgeschaltet"), "the dashboard card has no tabs, so no banner");
});

test("the hysteresis is shown and editable, the note follows it, and a narrow band is flagged", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  assert.ok(!html.includes('data-v="number.tw_hlow|1"'), "folded away by default");
  assert.ok(html.includes('data-act="twhyst"') && html.includes("Hysterese · heizt 3 K unter Soll, stoppt 1 K darüber") && html.includes('aria-expanded="false"'), "a line says what it is");
  panel._click({ composedPath: () => [{ dataset: { act: "twhyst" } }] });
  const open = await render(panel, () => { panel._tab = "warm"; });
  assert.ok(open.includes('aria-expanded="true"') && open.includes('data-v="number.tw_hlow|1"') && open.includes('data-v="number.tw_hhigh|-1"'), "steppers for both values once opened");
  panel._click({ composedPath: () => [{ dataset: { act: "twhyst" } }] });
  assert.ok(!(await render(panel, () => { panel._tab = "warm"; })).includes('data-v="number.tw_hlow|1"'), "and folded again");
  assert.ok(html.includes("Normal: heizt unter 50°, stoppt ab 54°") && html.includes("PV: heizt unter 57°, stoppt ab 61°"), "brackets of the scale follow the values");
  assert.ok(!html.includes("kleiner als 2 K"), "the default band of 4 K is fine");
  const narrow = { ...twHass, states: { ...twStates, "number.tw_hlow": { ...twStates["number.tw_hlow"], state: "1" }, "number.tw_hhigh": { ...twStates["number.tw_hhigh"], state: "0.5" } } };
  const p2 = new X.ProxonFwtPanel();
  p2.hass = narrow;
  const warn = await render(p2, () => { p2._tab = "warm"; });
  assert.ok(warn.includes("kleiner als 2 K") && warn.includes("Normal: heizt unter 52°, stoppt ab 53,5°"));
  calls.length = 0;
  panel._click({ composedPath: () => [{ dataset: { act: "twstep", v: "number.tw_hlow|1" } }] });
  await new Promise((r) => setTimeout(r, 700));
  assert.deepEqual(calls.find((c) => c[1] === "set_value"), ["number", "set_value", { entity_id: "number.tw_hlow", value: 3.5 }], "steps by the entity's own step (0.5)");
});

test("the history chart draws phase bands, reference lines and a legend for them, and keeps them in its scale", () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const now = Date.now() / 1000, h = 3600;
  const series = [{ label: "Wasser", color: "#378ADD", pts: [[now - 20 * h, 41], [now - 10 * h, 47], [now - 1 * h, 52]] }];
  const phases = [{ iv: [[now - 12 * h, now - 8 * h]], color: "#3fa660", label: "PV-Betrieb" }, { iv: [], color: "#D85A30", label: "Minimum" }];
  const html = panel._chart(series, { range: "24h", unit: "°", phases, refs: [{ v: 60, label: "Soll PV 60°" }] });
  assert.ok(html.includes('fill="#3fa660" opacity=".2"'), "band for the phase");
  assert.ok(html.includes("Soll PV 60°") && html.includes('stroke-dasharray="4 4"'), "reference line with its label");
  assert.ok(html.includes("PV-Betrieb</span>") && !html.includes("Minimum</span>"), "legend only for phases that occur");
  assert.ok(panel._cm.hi >= 60, "the reference value is inside the axis");
  assert.deepEqual(panel._cm.phases, phases);
  assert.ok(!html.includes("NaN") && !html.includes("undefined"));
  const plain = panel._chart(series, { range: "24h", unit: "°" });
  assert.ok(!plain.includes("stroke-dasharray=\"4 4\"") && panel._cm.hi < 60, "without options the chart is unchanged");
});

// ---- hot water history card ---------------------------------------------------
const twRows = (vals) => { const now = Date.now() / 1000; return vals.map(([h, s]) => ({ lu: now - h * 3600, s: String(s) })); };
const twData = {
  "sensor.tw_water": twRows([[24, 44], [18, 41], [12, 47], [8, 55], [4, 60], [1, 54.2]]),
  "sensor.tw_power": twRows([[24, 0], [10, 389], [6, 0], [3, 400], [2, 0]]), // heats 4 h + 1 h
  "sensor.tw_pv": twRows([[24, 0], [10, 2.5], [6, 0]]),
  "sensor.tw_outer": twRows([[24, 3], [12, 6], [1, 5.2]]),
  "sensor.tw_program": twRows([[24, "off"], [18, "minimum"], [14, "normal"], [9, "pv"], [5, "off"]]),
};
const twHist = { ...twHass, callWS: async (m) => {
  if (m.type === "history/history_during_period") return Object.fromEntries(m.entity_ids.filter((i) => twData[i]).map((i) => [i, twData[i]]));
  if (m.type === "recorder/statistics_during_period") return Object.fromEntries(m.statistic_ids.map((i) => [i, [1, 2, 3, 4].map((k) => ({ start: (Date.now() - k * 36e5 * 24) , mean: 40 + k, change: 0.5 }))]));
  return twHass.callWS(m);
} };

test("the hot water history shows axes, targets, program phases and the heating time", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  assert.ok(html.includes('class="ch"'), "the chart of the FWT history");
  assert.ok(html.includes("Soll PV 60°") && html.includes("Soll 53°") && html.includes("Minimum 42°"), "target lines");
  const lg = html.slice(html.indexOf('class="legend"', html.indexOf('class="ch"')));
  assert.ok(lg.includes("PV-Betrieb ") && lg.includes("Normalbetrieb ") && !lg.includes("Nachtabschaltung"), "legend lists only phases that occurred");
  assert.ok(html.includes("Heizzeit: 5 h 0 min"), "heating time from the power above 100 W");
  assert.ok(html.includes('data-act="twmetric" data-v="power"') && html.includes('data-act="hrange"') && html.includes('data-act="twcmp"'), "chips, range and previous period");
  assert.ok(html.includes("Min") && html.includes("Ø"), "min / max / mean");
});

test("the hot water history switches measurement and range", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  await render(panel, () => { panel._tab = "warm"; });
  panel._click({ composedPath: () => [{ dataset: { act: "twmetric", v: "power" } }] });
  const power = await render(panel, () => { panel._tab = "warm"; });
  assert.ok(!power.includes("Σ") && power.includes(" W"), "power: unit, no energy sum column");
  assert.ok(!power.slice(power.indexOf('class="ch"')).includes("Soll PV 60°"), "no target lines on the power curve");
  const month = await render(panel, () => { panel._tab = "warm"; panel._histRange = "30d"; });
  check(month);
  assert.ok(month.includes('class="ch"') && !month.includes("Heizzeit:"), "statistics for long ranges, no heating time under the chart, no phases");
  const prev = await render(panel, () => { panel._tab = "warm"; panel._histRange = "24h"; panel._hcmp = true; });
  assert.ok(prev.includes("Vorzeitraum"), "previous period series");
  panel._hcmp = false;
});

test("without any history the hot water card says so", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass; // no history behind the websocket
  const html = await render(panel, () => { panel._tab = "warm"; panel._histRange = "24h"; });
  assert.ok(html.includes("Keine Verlaufsdaten.") && !html.includes('class="ch"'), "note instead of a chart");
  check(html);
});

test("an icon inside a header chip stays small, so all chips are equally high", async () => {
  const fs = await import("node:fs");
  const css = fs.readFileSync(new URL("lib/styles.js", WWW), "utf8");
  assert.match(css, /\.hchip ha-icon \{ --mdc-icon-size: 16px;/);
});

test("the main picture shows status, power, today's energy and heating time, and the flow only while heating", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  assert.ok(html.includes('class="twhsvg heat"'), "heating: the flow and the fan are animated");
  assert.ok(html.includes("Heizt seit") && html.includes("Energie heute") && html.includes("Heizzeit heute"), "tiles");
  assert.ok(html.includes(">PV</span>") && html.includes('class="chip g"'), "program chip in the card header");
  const idle = { ...twHist, states: { ...twStates, "sensor.tw_power": { ...twStates["sensor.tw_power"], state: "0" } } };
  const p2 = new X.ProxonFwtPanel();
  p2.hass = idle;
  const rest = await render(p2, () => { p2._tab = "warm"; });
  assert.ok(rest.includes('class="twhsvg "') && rest.includes("<b>bereit</b>"), "idle: no animation, tile says bereit");
  assert.ok(!rest.includes("Heizt seit"));
});

test("heating runs are added up from the power curve", () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  assert.deepEqual(panel._twRuns([[0, 0], [100, 389], [200, 0], [300, 400]], 400), { heat: 200, since: 300 });
  assert.deepEqual(panel._twRuns([[0, 389], [100, 0]], 150), { heat: 100, since: null });
  assert.deepEqual(panel._twRuns([], 10), { heat: 0, since: null });
  assert.deepEqual(panel._twRuns([[0, 100], [10, 100.5]], 20), { heat: 10, since: 10 }, "exactly 100 W does not count as heating");
});

test("the target scale shows zones, marks, pointer and the switching band", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  assert.ok(html.includes("Minimum 42°") && html.includes("Soll 53°") && html.includes("Soll PV 60°"), "marks");
  assert.ok(html.includes("jetzt 54,2°"), "pointer at the water temperature");
  for (const z of ["unter Minimum", "heizt", "halten", "Soll erreicht"]) assert.ok(html.includes(`${z}</span>`), `zone ${z}`);
  assert.ok(!html.includes('aria-label="Heute"'), "no separate day strip: the history shows the programs");
  const sm = panel._twScale({ ents: {}, id: "tw1" });
  assert.equal(sm, null, "without the numbers there is no scale");
  const nodata = new X.ProxonFwtPanel();
  nodata.hass = twHass; // no history
  assert.ok((await render(nodata, () => { nodata._tab = "warm"; })).includes("jetzt 54,2°"), "the scale needs no history");
});

test("one Operation card: switch, PV status, enables and the last decision; no separate program bar or decision card", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  const op = html.slice(html.indexOf("Regelung aktiv"));
  assert.ok(op.includes("Probelauf: Entscheidungen werden nur angezeigt") && op.includes('data-act="twctl"'), "dry-run switch");
  assert.ok(op.includes("Normal: an · PV: aus"), "both enables in one row");
  assert.ok(op.includes("Letzte Entscheidung") && op.includes("PV-Überschuss: Start"), "last decision");
  assert.ok(op.includes("Geplante Schaltungen"), "planned switching is listed when there is one");
  assert.ok(!html.includes('class="twprog"') && !html.includes("Das Programm wählt der Regler"), "the program bar is gone");
  assert.equal((html.match(/<ha-card>/g) || []).length, 4, "main picture, targets, operation (with the scale), history");
  const idle = { ...twHass, states: { ...twStates, "sensor.tw_planned": { ...twStates["sensor.tw_planned"], state: "0" } } };
  const p2 = new X.ProxonFwtPanel();
  p2.hass = idle;
  assert.ok(!(await render(p2, () => { p2._tab = "warm"; })).includes("Geplante Schaltungen"), "nothing planned: no row");
});

test("the page is a grid: main picture and operation, scale and day, then the history; legend swatches and compact steppers", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  const html = await render(panel, () => { panel._tab = "warm"; });
  check(html);
  const order = ["tw-hero", "tw-op", "tw-set", "tw-hist"].map((c) => html.indexOf(`class="${c}"`));
  assert.ok(order.every((v) => v > 0) && order.every((v, k) => k === 0 || v > order[k - 1]), "four areas in reading order for the narrow layout");
  assert.ok(!html.includes("tw-day"), "the day card is gone");
  assert.ok(html.includes('class="twgrid"') && html.includes('class="twc"'));
  assert.ok(!html.includes("Ein Fühler in der Mitte des Speichers: Das Wasser ist einheitlich gefüllt.</div>"), "the explanation is a tooltip, not a text line");
  assert.ok(html.includes("<title>Ein Fühler in der Mitte des Speichers"), "tooltip of the main picture");
  assert.ok(html.includes('class="legend"') && html.includes("<i style=\"background:"), "legend with colour swatches (in the card header)");
  const css = (await import("node:fs")).readFileSync(new URL("lib/styles.js", WWW), "utf8");
  assert.match(css, /@container \(min-width: 1000px\)[\s\S]*\.tw-hero[\s\S]*\.tw-hist/);
});

test("card widths: the full panel width when narrow, shares of 2 : 1 when wide", () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  panel.clientWidth = 700;
  assert.equal(panel._twWide(), false);
  assert.equal(panel._twCardW(), 700 - 64, "narrow: panel width minus paddings");
  assert.equal(panel._twCardW(2 / 3), 700 - 64, "narrow: every card has the full width");
  panel.clientWidth = 1500;
  assert.equal(panel._twWide(), true);
  const two = panel._twCardW(2 / 3), one = panel._twCardW(1 / 3);
  assert.ok(Math.abs(two - 2 * one - 32) < 1, "two thirds are twice one third (plus one padding)");
  assert.ok(two < panel._twCardW(), "a column is narrower than the whole panel");
});

test("the history legend names how long each program ran in the shown range", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  const html = await render(panel, () => { panel._tab = "warm"; panel._histRange = "24h"; });
  check(html);
  // twData programs: minimum 18 h to 14 h ago (4 h), normal 14 h to 9 h (5 h), pv 9 h to 5 h (4 h), off after that
  const legend = html.slice(html.indexOf('class="legend"', html.indexOf('class="ch"')));
  assert.ok(legend.includes("PV-Betrieb 4 h 0 min") && legend.includes("Normalbetrieb 5 h 0 min") && legend.includes("Minimumbetrieb 4 h 0 min"), "time per program, with the long names");
  assert.ok(!legend.includes("Nachtabschaltung"), "a program that did not run is not listed");
  // the tooltip names only the program, without the duration
  assert.deepEqual(panel._cm.phases.map((p) => p.label).sort(), ["Minimumbetrieb", "Nachtabschaltung", "Normalbetrieb", "PV-Betrieb"]);
});

test("the targets can be switched off in the water curve and then no longer stretch its scale", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  const chartPart = (html) => html.slice(html.indexOf('class="ch"'));
  const on = await render(panel, () => { panel._tab = "warm"; panel._histRange = "24h"; });
  assert.ok(on.includes('data-act="twrefs"') && on.includes('aria-pressed="true"'), "button, pressed by default");
  assert.ok(chartPart(on).includes("Soll PV 60°"), "targets drawn");
  const hiOn = panel._cm.hi;
  panel._click({ composedPath: () => [{ dataset: { act: "twrefs" } }] });
  const off = await render(panel, () => { panel._tab = "warm"; });
  assert.ok(off.includes('aria-pressed="false"') && !chartPart(off).includes("Soll PV 60°"), "lines gone");
  assert.ok(panel._cm.hi <= hiOn, "the scale no longer includes the targets");
  const power = await render(panel, () => { panel._twMetric = "power"; panel._tab = "warm"; });
  assert.ok(!power.includes('data-act="twrefs"'), "only on the water curve");
  panel._twRefs = true; panel._twMetric = "water";
});

test("a reference line at the top edge gets its label below the line, so it is not cut off", () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const now = Date.now() / 1000, h = 3600;
  const series = [{ label: "Wasser", color: "#378ADD", pts: [[now - 20 * h, 41], [now - 1 * h, 52]] }];
  const html = panel._chart(series, { range: "24h", unit: "°", refs: [{ v: 60, label: "Soll PV 60°" }, { v: 45, label: "Soll 45°" }] });
  const y = (label) => Number(new RegExp(`y="([\\d.]+)"[^>]*>${label}</text>`).exec(html)[1]);
  const line = (v) => panel._cm.y(v);
  assert.ok(y("Soll PV 60°") > line(60), "top edge: label below its line");
  assert.ok(y("Soll 45°") < line(45), "inside the chart: label above its line");
  assert.ok(y("Soll PV 60°") > 0, "inside the picture");
});

test("the cards of a row in the wide hot water layout are stretched to the same height", async () => {
  const css = (await import("node:fs")).readFileSync(new URL("lib/styles.js", WWW), "utf8");
  assert.match(css, /\.twgrid \{ align-items: stretch; \}/);
  assert.match(css, /\.tw-hero > ha-card[\s\S]*flex: 1/);
});

test("the scale shows 65 degrees although the targets stop at 60, so the PV switching band above 60 is visible", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "warm"; });
  const scale = html.slice(html.indexOf('aria-label="Sollwerte"'));
  assert.ok(scale.includes(">65</text>") && scale.includes(">60</text>") && !scale.includes(">70</text>"), "marks up to 65");
  assert.ok(html.includes("PV: heizt unter 57°, stoppt ab 61°"), "the stop point 61 lies on the scale");
});

test("the housing in the main picture is clearly taller than wide, and everything inside it lies inside", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHass;
  const html = await render(panel, () => { panel._tab = "warm"; });
  const m = /<rect width="(\d+)" height="(\d+)" rx="\d+" fill="var\(--card-background-color\)"/.exec(html);
  assert.ok(m, "housing outline");
  const [w, h] = [Number(m[1]), Number(m[2])];
  assert.ok(h / w >= 1.3 && h / w <= 1.9, `aspect ${(h / w).toFixed(2)} looks like a standing unit`);
  const vb = /viewBox="0 0 (\d+) (\d+)" role="img" aria-label="Speicher/.exec(html);
  assert.ok(vb && Number(vb[2]) >= h + 10, "the picture is high enough for the housing");
  assert.ok(Number(vb[1]) >= 232 + w, "and wide enough");
});

test("the lane chart stacks measurements on one time axis, each lane with its own scale, with shared bands, legend and crosshair data", () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const now = Date.now() / 1000, h = 3600;
  const pts = (arr) => arr.map(([hh, v]) => [now - hh * h, v]);
  const deg = (v) => `${Math.round(v)}°`, w = (v) => `${Math.round(v)} W`;
  const lanes = [
    { h: 150, axis: true, series: [{ label: "Wasser", color: "#378ADD", pts: pts([[20, 41], [10, 47], [2, 58]]), kind: "line", fmt: deg }], refs: [{ v: 60, label: "Soll PV 60°" }] },
    { h: 90, axis: false, series: [
      { label: "PV-Leistung", short: "PV", color: "#f2a516", kind: "area", pts: pts([[20, 0], [10, 3000], [2, 500]]), fmt: w },
      { label: "Leistung", short: "WP", color: "#185FA5", kind: "line", pts: pts([[20, 0], [10, 400], [2, 0]]), fmt: w, energy: true }] },
    { h: 56, axis: true, series: [{ label: "Luft", color: "#D85A30", pts: pts([[20, 3], [10, 8], [2, 6]]), kind: "line", fmt: deg }], refs: [{ v: 5, label: "PV-Betrieb ab 5°" }] },
  ];
  const phases = [{ iv: [[now - 12 * h, now - 6 * h]], color: "#3fa660", label: "PV-Betrieb", legend: "PV-Betrieb 6 h 0 min" }];
  const html = panel._laneChart(lanes, { range: "24h", phases });
  assert.ok(!html.includes("NaN") && !html.includes("undefined"));
  assert.equal((html.match(/<svg class="ch"/g) || []).length, 1, "one chart");
  assert.ok(html.includes("Soll PV 60°") && html.includes("PV-Betrieb ab 5°"), "reference lines in their lanes");
  assert.ok(html.includes("<polygon") && html.includes(">PV</text>") && html.includes(">WP</text>"), "the lane without axis: area plus the names of the two curves");
  assert.ok(html.includes('fill="#3fa660" opacity=".18"') && html.includes("PV-Betrieb 6 h 0 min"), "phase band through all lanes, legend with the time");
  assert.ok(html.includes("<b>3.000 W</b>") || html.includes("<b>3000 W</b>"), "max of the PV curve in the table");
  assert.ok(!html.includes("Σ"), "no energy sum column");
  const m = panel._cm, top = m.pt, bottom = m.H - m.pb;
  assert.equal(m.series.length, 4);
  for (const s of m.series) {
    for (const [, v] of s.pts) { const yy = s.y(v); assert.ok(yy >= top - 0.5 && yy <= bottom + 0.5, `${s.label}: ${yy} inside ${top}..${bottom}`); }
    assert.equal(typeof s.fmt, "function", "each curve brings its own number format for the tooltip");
  }
  const [water, pv, power, air] = m.series;
  assert.ok(Math.max(...water.pts.map((p) => water.y(p[1]))) < Math.min(...air.pts.map((p) => air.y(p[1]))), "the water lane lies above the air lane");
  assert.ok(pv.y(3000) < pv.y(0) && power.y(400) < power.y(0), "each curve rises with its own scale");
  assert.ok(Math.abs(pv.y(3000) - (power.y(400))) < 20, "both curves of the unlabelled lane fill the lane height, whatever their units");
});

test("the hot water history starts with 'All' in lanes, the chip comes first, and a single measurement is one click away", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = twHist;
  panel._twMetric = undefined;
  const html = await render(panel, () => { panel._tab = "warm"; panel._histRange = "24h"; panel._hcmp = false; });
  check(html);
  const chips = [...html.matchAll(/data-act="twmetric" data-v="(\w+)"/g)].map((x) => x[1]);
  assert.deepEqual(chips, ["all", "water", "power", "pv", "outer"], "'All' first, then the single measurements");
  assert.ok(/class="vbtn a" data-act="twmetric" data-v="all"/.test(html), "'All' is selected by default");
  const chart = html.slice(html.indexOf('class="ch"'));
  assert.ok(chart.includes("Soll PV 60°") && chart.includes("PV-Betrieb ab 5°"), "targets in the water lane, the PV limit in the air lane");
  assert.ok(chart.includes("<polygon") && chart.includes(">WP</text>") && chart.includes(">PV</text>"), "power lane with the PV area");
  assert.ok(/data-act="twcmp" data-v="[a-z_]+"/.test(html) && !/data-act="twcmp"[^>]*disabled/.test(html), "previous period in the lane view switches to the first measurement");
  const model = panel._cm;
  assert.equal(model.series.length, 4, "four curves with crosshair data");
  // one measurement
  panel._click({ composedPath: () => [{ dataset: { act: "twmetric", v: "water" } }] });
  const water = await render(panel, () => { panel._tab = "warm"; });
  assert.ok(/class="vbtn a" data-act="twmetric" data-v="water"/.test(water) && !water.slice(water.indexOf('class="ch"')).includes(">WP</text>"), "single measurement: the normal chart");
  assert.ok(/data-act="twcmp" data-v=""/.test(water), "previous period toggles in a single view");
  panel._click({ composedPath: () => [{ dataset: { act: "twmetric", v: "all" } }] });
  assert.ok(/class="vbtn a" data-act="twmetric" data-v="all"/.test(await render(panel, () => { panel._tab = "warm"; })), "and back to 'All'");
});

test("the lane view honours the targets switch, the range and the configured PV limit", async () => {
  const settings = [{ ...twSettings[0], twwp: [{ ...twSettings[0].twwp[0], pv_min_outer: 7 }] }];
  const hass7 = { ...twHist, callWS: async (m) => (m.type === "proxon_modbus/settings" ? settings : twHist.callWS(m)) };
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass7;
  panel._twMetric = "all"; panel._twRefs = true;
  const on = await render(panel, () => { panel._tab = "warm"; panel._histRange = "24h"; });
  assert.ok(on.includes("PV-Betrieb ab 7°"), "limit from the settings");
  panel._click({ composedPath: () => [{ dataset: { act: "twrefs" } }] });
  const off = await render(panel, () => { panel._tab = "warm"; });
  assert.ok(!off.slice(off.indexOf('class="ch"')).includes("Soll PV 60°"), "targets switched off in the water lane");
  assert.ok(off.slice(off.indexOf('class="ch"')).includes("PV-Betrieb ab 7°"), "the PV limit stays");
  const month = await render(panel, () => { panel._tab = "warm"; panel._histRange = "30d"; });
  check(month);
  assert.ok(month.includes('class="ch"') && !month.includes("Heizzeit:"), "statistics: lanes without program bands");
  panel._twRefs = true; panel._histRange = "24h"; panel._twMetric = undefined;
});

// ---- FWT history: chips, lanes, tables ------------------------------------------
const fwtRows = (id) => {
  const now = Date.now() / 1000, bin = id.startsWith("binary_sensor.");
  return [[20, 1], [14, 3], [8, 2], [2, 4]].map(([h, k]) => ({ lu: now - h * 3600, s: bin ? (k % 2 ? "on" : "off") : String(10 * k + (id.includes("compressor_speed") ? 3000 : 0)) }));
};
const fwtHist = { ...hass, callWS: async (m) => {
  if (m.type === "history/history_during_period") return Object.fromEntries(m.entity_ids.map((i) => [i, fwtRows(i)]));
  if (m.type === "recorder/statistics_during_period") return Object.fromEntries(m.statistic_ids.map((i) => [i, [1, 2, 3, 4].map((k) => ({ start: Date.now() - k * 36e5, mean: 10 * k, change: 0.5 }))]));
  return hass.callWS(m);
} };
const histPanel = async (prep = () => {}) => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = fwtHist;
  const html = await render(panel, () => { panel._tab = "history"; panel._histRange = "24h"; panel._hcmp = false; prep(panel); });
  return { panel, html };
};
const clickAct = (panel, act, v) => panel._click({ composedPath: () => [{ dataset: { act, v } }] });
const again = (panel) => render(panel, () => { panel._tab = "history"; });

test("history chips: 'All' first and selected, then the groups; no separate compressor chip; no previous-period switch in 'All'", async () => {
  const { panel, html } = await histPanel();
  check(html);
  const chips = [...html.matchAll(/data-act="metric" data-v="(\w+)"/g)].map((x) => x[1]);
  assert.deepEqual(chips, ["all", "temp", "circuit", "drives", "power", "eff", "co2", "rf"]);
  assert.ok(/class="vbtn a" data-act="metric" data-v="all"/.test(html), "'All' is selected by default");
  assert.ok(!/<button[^>]*data-act="hcmp"/.test(html), "no previous-period switch in the lane view");
  assert.ok(panel._cm.series.length >= 10, "curves of all groups in one chart");
  const tbl = html.slice(html.indexOf('class="hsts"'), html.indexOf("Wärmepumpen-Laufzeit"));
  assert.ok(tbl.length > 100 && !tbl.includes("Σ"), "no sum column in the table (the bar cards below keep theirs)");
  clickAct(panel, "metric", "circuit");
  assert.ok(/<button[^>]*data-act="hcmp"/.test(await again(panel)), "single group: the switch is back");
});

test("the table under a chart has now, min, max and mean; 'now' is the live value of the sensor", async () => {
  const { html } = await histPanel((p) => { p._metric = "temp"; });
  const head = html.slice(html.indexOf('class="hst hh"'), html.indexOf('class="hst hh"') + 400);
  for (const w of ["jetzt", "Min", "Max", "Ø"]) assert.ok(head.toLowerCase().includes(w.toLowerCase()), `column ${w}`);
  const row = html.slice(html.indexOf("</i>Zuluft</span>"));
  assert.ok(row.slice(0, 200).includes("19,4°"), "the now value is the live temperature, not the last point of the curve");
});

test("a click on a table row hides the curve and its scale, a second click shows it again", async () => {
  const { panel } = await histPanel((p) => { p._metric = "temp"; p._hid = {}; });
  const n = panel._cm.series.length;
  clickAct(panel, "ser", "temp|Zuluft");
  const off = await again(panel);
  assert.equal(panel._cm.series.length, n - 1, "one curve less in the plot");
  assert.ok(/class="hst tg off" role="button" tabindex="0" aria-pressed="false" data-act="ser" data-v="temp\|Zuluft"/.test(off), "row stays, dimmed");
  clickAct(panel, "ser", "temp|Zuluft");
  await again(panel);
  assert.equal(panel._cm.series.length, n, "back");
});

test("in the refrigerant circuit the compressor temperature starts hidden", async () => {
  const { panel, html } = await histPanel((p) => { p._metric = "circuit"; p._hid = {}; });
  assert.ok(/hst tg off[^>]*data-v="circuit\|Kompressor"/.test(html), "row dimmed");
  assert.equal(panel._cm.series.length, 5, "five curves in the plot");
  clickAct(panel, "ser", "circuit|Kompressor");
  await again(panel);
  assert.equal(panel._cm.series.length, 6, "shown on click");
});

test("the table folds away and leaves the curve names as switches", async () => {
  const { panel, html } = await histPanel((p) => { p._metric = "temp"; p._hstOpen = true; });
  assert.ok(html.includes('class="hsts"') && html.includes('data-act="hsts" aria-expanded="true"'));
  clickAct(panel, "hsts");
  const folded = await again(panel);
  assert.ok(!folded.includes('class="hsts"') && folded.includes('aria-expanded="false"'), "table gone");
  assert.ok(/class="legend hlg"[^]*data-act="ser"/.test(folded), "the curve names stay clickable");
  clickAct(panel, "hsts");
  assert.ok((await again(panel)).includes('class="hsts"'), "and open again");
});

test("all line charts have the same height; the key figure tile for the compressor opens the drives chip", async () => {
  const { html } = await histPanel((p) => { p._metric = "temp"; });
  const { CHART_H } = await import(new URL("lib/constants.js", WWW).href);
  assert.ok(html.includes(`viewBox="0 0 ${html.match(/viewBox="0 0 (\d+) \d+"/)[1]} ${CHART_H}"`), "single chart has CHART_H");
  const panel = new X.ProxonFwtPanel();
  panel.hass = fwtHist;
  const ov = await render(panel, () => { panel._tab = "overview"; });
  check(ov);
  assert.ok(/data-act="kpi" data-v="drives"[^]*Kompressor[^]*2\.400/.test(ov), "tile with the speed");
  clickAct(panel, "kpi", "drives");
  const hist = await render(panel, () => {});
  assert.ok(/class="vbtn a" data-act="metric" data-v="drives"/.test(hist), "the drives chip is selected");
});

test("central PTC power and energy sensors show as tiles in the rooms summary", async () => {
  ent("sensor.ptc_w", "central", {}, "1.2", { device_class: "power", unit_of_measurement: "kW" });
  ent("sensor.ptc_e", "central", {}, "2500", { device_class: "energy", unit_of_measurement: "Wh" });
  const panel = new X.ProxonFwtPanel();
  panel.hass = { ...hass, callWS: async (m) => (m.type === "proxon_modbus/settings" ? [{ device_id: "central", ptc_power_entity: "sensor.ptc_w", ptc_energy_entity: "sensor.ptc_e" }] : {}) };
  const html = await render(panel, () => { panel._tab = "rooms"; });
  check(html);
  assert.ok(html.includes("1,20") && html.includes("kW"), "power tile");
  assert.ok(html.includes("2,50") && html.includes("kWh"), "energy tile");
});

test("PTC sensors appear in overview (replacing the compressor tile), diagnosis and history", async () => {
  ent("sensor.ptc_w", "central", {}, "1.2", { device_class: "power", unit_of_measurement: "kW" });
  ent("sensor.ptc_e", "central", {}, "412", { device_class: "energy", unit_of_measurement: "kWh" });
  const panel = new X.ProxonFwtPanel();
  panel.hass = { ...hass, callWS: async (m) => (m.type === "proxon_modbus/settings" ? [{ device_id: "central", ptc_power_entity: "sensor.ptc_w", ptc_energy_entity: "sensor.ptc_e" }] : {}) };
  let html = await render(panel, () => { panel._tab = "overview"; });
  check(html);
  assert.ok(html.includes("von 3 Räumen heizen"), "PTC tile with the room count");
  assert.ok(html.includes("1,20"), "PTC power in kW");
  assert.ok(!html.includes(">Kompressor<"), "the compressor tile makes way for the PTC tile");
  html = await render(panel, () => { panel._tab = "diag"; });
  check(html);
  assert.ok(html.includes("PTC-Zusatzheizung") && html.includes("pseg"), "diagnosis tile with room segments");
  assert.ok(html.includes("PTC-Verbrauch gesamt") && html.includes("412"), "meter reading");
  html = await render(panel, () => { panel._tab = "history"; panel._metric = "ptc"; });
  check(html);
  assert.ok(html.includes('data-v="ptc"'), "PTC chip in the history");
});

test("without PTC sensors the compressor tile stays", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const html = await render(panel, () => { panel._tab = "overview"; });
  assert.ok(html.includes("Kompressor") && !html.includes("Räumen heizen"));
});

test("values of one entity open its more-info dialog", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const html = await render(panel, () => { panel._tab = "rooms"; });
  assert.ok(html.includes('data-act="more" data-v="sensor.room0_co2"'), "CO2 chip is a link");
  assert.ok(html.includes('data-act="more" data-v="climate.room0"'), "ring value is a link");
  const seen = [];
  panel.dispatchEvent = (ev) => { seen.push(ev); return true; };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init.detail; } };
  panel._click({ composedPath: () => [{ dataset: { act: "more", v: "sensor.room0_co2" } }] });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, "hass-more-info");
  assert.equal(seen[0].detail.entityId, "sensor.room0_co2");
  const diag = await render(panel, () => { panel._tab = "diag"; });
  assert.ok(diag.includes('data-act="more" data-v="sensor.temp_supply_air"'), "measurement rows are links");
});

test("values in schema, operation, diagnosis, status, hints and hot water open their entity", async () => {
  const link = (html, id, what) => assert.ok(html.includes(`data-act="more" data-v="${id}"`), `${what}: ${id}`);
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  let html = await render(panel, () => { panel._tab = "overview"; });
  for (const id of ["sensor.temp_supply_air", "sensor.temp_fresh_air", "sensor.temp_evaporator", "sensor.fan_speed_supply", "sensor.fan_speed_extract", "sensor.temp_compressor", "sensor.heat_recovery"]) link(html, id, "schema or operation");
  link(html, "binary_sensor.error_system", "status row");
  html = await render(panel, () => { panel._tab = "diag"; });
  for (const id of ["sensor.compressor_speed", "sensor.hp_runtime_today", "binary_sensor.error_system", "binary_sensor.heat_pump_heating"]) link(html, id, "diagnosis");
  const tw = new X.ProxonFwtPanel();
  tw.hass = twHass;
  html = await render(tw, () => { tw._tab = "warm"; });
  for (const id of ["sensor.tw_water", "sensor.tw_outer", "sensor.tw_pv", "sensor.tw_power"]) link(html, id, "hot water");
});

test("the dashboard card links its values to their entities", async () => {
  const card = new X.ProxonFwtCard();
  card.setConfig({ sections: X.ALL_SECTIONS });
  card.hass = hass;
  const html = await render(card, () => {});
  check(html);
  for (const id of ["sensor.temp_supply_air", "sensor.temp_fresh_air", "sensor.compressor_speed", "sensor.temp_evaporator", "sensor.temp_pre_evaporator",
    "binary_sensor.error_system", "binary_sensor.heat_pump_heating", "climate.room0", "sensor.room0_co2", "sensor.heat_recovery", "sensor.power_consumption"]) {
    assert.ok(html.includes(`data-act="more" data-v="${id}"`), `card: ${id}`);
  }
  assert.ok(html.includes('class="row first'), "the first status row keeps its style");
});

test("the card shows its own status card and no dead panel links; the editor lists sections by name", async () => {
  const card = new X.ProxonFwtCard();
  card.setConfig({ sections: ["status", "refrigerant", "heatpump", "schema"] });
  card.hass = hass;
  const html = await render(card, () => {});
  check(html);
  assert.ok(html.includes("Alter") || html.includes("Tag 45"), "filter age line of the card status");
  assert.ok(!/<[a-z][^>]*data-act="tab"/.test(html), "no links to panel tabs in the card");
  assert.ok(!html.includes("Außen ·") && html.includes("Kältekreis und Antriebe"));
  const ed = new X.ProxonFwtCardEditor();
  ed.hass = hass;
  ed.setConfig({ type: "custom:proxon-fwt-card" });
  const flat = (sc) => sc.flatMap((s) => (s.schema ? flat(s.schema) : [s.name]));
  assert.deepEqual(flat(ed._form.schema), ["preset", "layout", "sec_operate", "sec_plant", "sec_details", "outdoor_side"], "no sensor or speed fields in the editor");
  assert.equal(ed._label("alerts"), "Meldungen");
});

test("sections: old names map to the new ones, order is fixed, presets and alerts work", async () => {
  const { resolveSections, PRESETS } = await import(new URL("lib/constants.js", WWW).href);
  assert.deepEqual(resolveSections({}), PRESETS.standard);
  assert.deepEqual(resolveSections({ preset: "compact" }), ["overview", "operation"]);
  assert.deepEqual(resolveSections({ preset: "all" }), ["overview", "operation", "schema", "rooms", "status", "refrigerant", "history", "runtime", "energy"]);
  assert.deepEqual(resolveSections({ sections: ["rooms", "fan", "air", "heatpump", "kpi", "mode", "quick", "alerts"] }), ["overview", "operation", "schema", "rooms"], "old names mapped, duplicates dropped, fixed order");
  assert.deepEqual(resolveSections({ sections: ["rooms"], preset: "all" }), ["rooms"], "an explicit list wins over the preset");
  assert.throws(() => resolveSections({ sections: ["nope"] }));
  const card = new X.ProxonFwtCard();
  card.setConfig({ preset: "compact" });
  card.hass = hass;
  const html = await render(card, () => {});
  check(html);
  assert.ok(html.includes("ovw") && html.includes("Zuluft") && html.includes("Komfort") && html.includes("opw bare"), "overview with the controls in one card");
  assert.ok(!html.includes("Kältekreis") && !html.includes('class="rooms"'));
  assert.equal(html.split("<ha-card").length - 1, 1, "compact is a single card");
  // the editor writes a preset, or an explicit list once sections are changed
  const ed = new X.ProxonFwtCardEditor();
  ed.hass = hass;
  ed.setConfig({ type: "custom:proxon-fwt-card" });
  assert.deepEqual(ed._config_from({ ...ed._data(ed._config), preset: "all" }), { type: "custom:proxon-fwt-card", preset: "all" });
  assert.deepEqual(ed._config_from({ ...ed._data(ed._config), preset: "standard" }), { type: "custom:proxon-fwt-card" });
  const custom = ed._config_from({ ...ed._data(ed._config), sec_details: ["history"] });
  assert.deepEqual(custom.sections, ["overview", "operation", "schema", "rooms", "status", "history"]);
  assert.equal(custom.preset, undefined);
  assert.equal(ed._data(custom).preset, "custom");
});

test("tabs layout: one card with head and tab bar, the tab shows its sections, a click switches", async () => {
  const card = new X.ProxonFwtCard();
  card.setConfig({ preset: "all", layout: "tabs" });
  card.hass = hass;
  let html = await render(card, () => {});
  check(html);
  assert.ok(html.includes("tabcard") && html.includes("ctabs"));
  for (const t of ["overview", "rooms", "maintenance", "history"]) assert.ok(html.includes(`data-act="ctab" data-v="${t}"`), `tab ${t}`);
  assert.ok(html.includes("ovh") && html.includes("Zuluft") && html.includes("opw bare"), "first tab: head, figures, controls");
  assert.ok(!html.includes("Kältekreis und Antriebe") && !html.includes('class="rgrid'), "other tabs are not rendered");
  html = await render(card, () => { card._ctab = "maintenance"; });
  assert.ok(html.includes("Kältekreis und Antriebe") && html.includes("Gerätefilter") && html.includes("ovh"), "maintenance tab keeps the head");
  card._click({ composedPath: () => [{ dataset: { act: "ctab", v: "rooms" } }] });
  assert.equal(card._ctab, "rooms");
  html = await render(card, () => {});
  assert.ok(html.includes("Wohnen") && !html.includes("Gerätefilter"));
  const one = new X.ProxonFwtCard();
  one.setConfig({ sections: ["rooms"], layout: "tabs" });
  one.hass = hass;
  assert.ok(!(await render(one, () => {})).includes('class="ctabs'), "a single tab shows no tab bar");
  assert.throws(() => new X.ProxonFwtCard().setConfig({ layout: "grid" }));
  const ed = new X.ProxonFwtCardEditor();
  ed.hass = hass;
  ed.setConfig({ layout: "tabs" });
  assert.equal(ed._data(ed._config).layout, "tabs");
  assert.equal(ed._config_from({ ...ed._data(ed._config), layout: "stacked" }).layout, undefined);
});

test("the whole room card opens the details, its own controls keep their action", async () => {
  const panel = new X.ProxonFwtPanel();
  panel.hass = hass;
  const html = await render(panel, () => { panel._tab = "rooms"; panel._rview = "cards"; });
  assert.ok(/<div class="rc" style="--rcc:[^"]+" data-act="rtoggle" data-v="0">/.test(html), "card is the click target, tinted by its state");
  assert.ok(html.includes('data-act="more" data-v="sensor.room0_co2"') && html.includes('data-act="rstep"'), "chips and steps are still their own targets");
  // the innermost element with an action wins: a click in the empty part of the card reaches the card
  panel._click({ composedPath: () => [{ dataset: {} }, { dataset: { act: "rtoggle", v: "0" } }, { dataset: {} }] });
  assert.ok(panel._ropen.size === 1, "details open");
});

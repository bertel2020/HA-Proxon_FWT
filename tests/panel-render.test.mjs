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
}
const registry = {};
Object.assign(globalThis, {
  HTMLElement: El, CustomEvent: class {}, Event: class {},
  customElements: { get: (n) => registry[n], define: (n, c) => { registry[n] = c; } },
  window: { customCards: [] }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: { createElement: (tag) => ({ tag, textContent: "" }), addEventListener() {}, removeEventListener() {} },
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
twEnt("number.tw_normal", { translation_key: "twwp_target_normal" }, "53", { min: 20, max: 70, step: 0.5 });
twEnt("number.tw_pv", { translation_key: "twwp_target_pv" }, "60", { min: 20, max: 70, step: 0.5 });
twEnt("number.tw_min", { translation_key: "twwp_target_min" }, "42", { min: 20, max: 70, step: 0.5 });
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
  assert.ok(html.includes("54,2°") && html.includes("389 W") && html.includes("2,5 kW") && html.includes("5.605 kWh"));
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
  panel._click({ composedPath: () => [el("twstep", "number.tw_pv|1")] });
  panel._click({ composedPath: () => [el("twstep", "number.tw_pv|1")] });
  assert.equal(panel._twTarget("number.tw_pv"), 61, "steps add up on the pending target");
  await new Promise((r) => setTimeout(r, 700));
  const set = calls.filter((c) => c[1] === "set_value");
  assert.equal(set.length, 1, "written once");
  assert.deepEqual(set[0], ["number", "set_value", { entity_id: "number.tw_pv", value: 61 }]);
});

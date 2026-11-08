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

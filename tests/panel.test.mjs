// Run with: node --test tests/panel.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const FILE = new URL("../custom_components/proxon_modbus/www/proxon-fwt-card.js", import.meta.url);
const src = fs.readFileSync(FILE, "utf8");

class El {
  constructor() { this.attrs = new Set(); this.events = []; this.style = {}; }
  attachShadow() { this.shadowRoot = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }; return this.shadowRoot; }
  addEventListener() {}
  removeEventListener() {}
  toggleAttribute(n, on) { on ? this.attrs.add(n) : this.attrs.delete(n); }
  dispatchEvent(e) { this.events.push(e); return true; }
}

function load() {
  const registry = {};
  const ctx = {
    HTMLElement: El, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }, Event: class {},
    customElements: { get: (n) => registry[n], define: (n, c) => { registry[n] = c; } },
    window: { customCards: [] }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console, Date, Math, JSON, Object, Array, Set, Map, String, Number, Promise,
    document: { createElement: (tag) => ({ tag, textContent: "" }) },
    ResizeObserver: class { observe() {} disconnect() {} }, requestAnimationFrame: (f) => f(), setTimeout, clearTimeout,
  };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(src + "\n;this.__x = { ProxonFwtBase, esc, TEXT };", ctx);
  return ctx.__x;
}

const { ProxonFwtBase, esc, TEXT } = load();
const make = () => { const e = new ProxonFwtBase(); e._update = () => {}; e._hass = { language: "de", states: {} }; return e; };

test("TEXT has no duplicate keys within a language", () => {
  const start = src.indexOf("const TEXT = {"), end = src.indexOf("const MODE_META");
  const body = src.slice(start, end);
  const blocks = body.split(/\n  (?:de|en): \{/).slice(1);
  assert.equal(blocks.length, 2);
  for (const b of blocks) {
    const keys = [...b.matchAll(/(?:^|[\s,{])([a-z][a-z0-9_]*): "/g)].map((m) => m[1]);
    const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dup, []);
  }
});

test("de and en define the same keys", () => {
  assert.deepEqual(Object.keys(TEXT.de).sort(), Object.keys(TEXT.en).sort());
});

test("filter age sentence keeps its placeholders", () => {
  const p = make();
  assert.equal(p._t("f_age_text", "3", "180", "177"), "Tag 3 von 180 · noch 177 Tage");
});

test("esc masks markup in text and attributes", () => {
  assert.equal(esc(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  assert.equal(esc(null), "");
});

test("history cache is dropped when the data source changes", () => {
  const p = make();
  p._settingsFor = "dev1";
  p._settings = { power_entity: "sensor.a" };
  let loads = 0;
  const loader = () => { loads++; return Promise.resolve(1); };
  p._hget("run", loader);
  p._hget("run", loader);
  assert.equal(loads, 1);
  p._settings = { power_entity: "sensor.b" };
  p._hget("run", loader);
  assert.equal(loads, 2);
  p._settingsFor = "dev2";
  p._hget("run", loader);
  assert.equal(loads, 3);
});

test("_write runs calls in order, locks while busy and reports failures", async () => {
  const p = make();
  const order = [];
  const first = p._write(async () => { order.push("a"); await null; order.push("b"); });
  assert.ok(p.attrs.has("busy"));
  await p._write(async () => order.push("ignored"));
  await first;
  assert.deepEqual(order, ["a", "b"]);
  assert.ok(!p.attrs.has("busy"));
  await p._write(async () => { throw new Error("boom"); });
  assert.equal(p.events.length, 1);
  assert.match(p.events[0].detail.message, /boom/);
  assert.ok(!p.attrs.has("busy"));
});

test("room details open in a dialog, one at a time, and close again", () => {
  const p = make();
  p._d = { central: {}, rooms: [{ climate: "climate.a" }, { climate: "climate.b" }] };
  const click = (act, v) => p._click({ composedPath: () => [{ dataset: { act, v } }] });
  click("rtoggle", "0");
  assert.deepEqual([...p._ropen], ["climate.a"]);
  click("rtoggle", "1");
  assert.deepEqual([...p._ropen], ["climate.b"]);
  click("rtoggle", "1");
  assert.equal(p._ropen.size, 0);
  click("rtoggle", "0");
  click("rclose");
  assert.equal(p._ropen.size, 0);
});

test("heat pump runtime bars (7 days) carry hover tooltips", () => {
  const p = make();
  const now = Date.now() / 1000;
  p._hc = { hp: { t: Date.now(), v: { iv: [[now - 7200, now - 3600]], t0: now - 86400 * 8 } } };
  const html = p._hpBars();
  assert.equal((html.match(/data-tip="/g) || []).length, 7);
  assert.match(html, /class="chw"/);
  assert.match(html, /class="tip"/);
  assert.match(html, /1 h · 1 /);
});

test("power entities reporting kW or MW are normalised to W", () => {
  const p = make();
  p._d = { central: { power_consumption: "sensor.p" } };
  p._config = {};
  const set = (state, unit) => { p._hass.states["sensor.p"] = { state, attributes: { unit_of_measurement: unit } }; p._hass.entities = {}; };
  p._num = (id) => { const s = p._hass.states[id]; return s ? Number(s.state) : null; };
  p._state = (id) => p._hass.states[id];
  p._opt = () => undefined;
  set("450", "W"); assert.equal(p._pnum(), 450);
  set("0.45", "kW"); assert.equal(p._pnum(), 450);
  set("0.0005", "MW"); assert.equal(p._pnum(), 500);
});

test("a dismissed hint survives a short gap of its cause but not a long one", () => {
  const p = make();
  p._dismissedLoaded = true;
  p._saveDismissed = () => {};
  p._dismissed = { co2: Date.now() };
  p._pruneDismissed([{ key: "co2" }]);
  p._pruneDismissed([]);
  assert.ok("co2" in p._dismissed);
  p._seen.co2 = Date.now() - 31 * 60000;
  p._pruneDismissed([]);
  assert.ok(!("co2" in p._dismissed));
});

test("fast +/- clicks add up and are written once", async () => {
  const p = make();
  const calls = [];
  p._hass.callService = async (...a) => { calls.push(a); };
  p._hass.states["climate.a"] = { state: "heat", attributes: { temperature: 20, min_temp: 18, max_temp: 30, target_temp_step: 1 } };
  p._state = (id) => p._hass.states[id];
  p._d = { central: {}, rooms: [{ climate: "climate.a" }] };
  for (let i = 0; i < 3; i++) p._bump("climate.a", 1);
  assert.equal(p._tgt("climate.a", p._hass.states["climate.a"].attributes), 23);
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(["climate", "set_temperature", { entity_id: "climate.a", temperature: 23 }]));
});

test("history loads wait for the settings and failed loads are retried soon", async () => {
  const p = make();
  p._settingsFor = "dev1";
  let loads = 0;
  p._hget("x", () => { loads++; return Promise.resolve(1); });
  assert.equal(loads, 0); // settings not loaded yet
  p._settings = {};
  p._hget("x", () => { loads++; return Promise.reject(new Error("ws")); });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(loads, 1);
  assert.equal(p._hc.x.v, null);
  assert.ok(Date.now() - p._hc.x.t > 250000); // cached as nearly expired: retried after ~15 s, not 5 min
});

test("discovery is reused until the registries change", () => {
  const p = make();
  let runs = 0;
  p._discoverNow = () => { runs++; return { central: {}, rooms: [] }; };
  p._config = {};
  p._hass.entities = {}; p._hass.devices = {};
  p._discover(); p._discover();
  assert.equal(runs, 1);
  p._hass.entities = {};
  p._discover();
  assert.equal(runs, 2);
  p._dmiss = true; // a state was missing: the result must not be cached
  p._discoverNow = () => { runs++; p._dmiss = true; return { central: {}, rooms: [] }; };
  p._hass.devices = {};
  p._discover(); p._discover();
  assert.equal(runs, 4);
});

test("styles fall back to a <style> tag without constructable stylesheets", () => {
  const p = make();
  assert.match(p._styleTag(), /^<style>/);
});

test("unknown translation keys (raw entity states) are masked", () => {
  const p = make();
  assert.equal(p._t('<img src=x onerror="a">'), "&lt;img src=x onerror=&quot;a&quot;&gt;");
  assert.equal(p._t("f_unknown").includes("<"), false);
});

test("bar chart tooltips are built from text nodes, not parsed as markup", () => {
  const tip = { style: {}, offsetWidth: 0, replaceChildren(...c) { this.children = c; }, set innerHTML(v) { throw new Error("innerHTML used"); } };
  const handlers = {};
  const svg = { addEventListener: (n, f) => { handlers[n] = f; }, closest: () => null };
  const el = { getAttribute: () => "<img onerror=x>|1 h" };
  const box = { querySelector: (q) => (q === "[data-tip]" ? {} : q === "svg" ? svg : tip), getBoundingClientRect: () => ({ left: 0, width: 100 }) };
  const p = make();
  p.shadowRoot.querySelectorAll = () => [box];
  p._bindTips();
  handlers.pointermove({ target: { closest: () => el }, clientX: 5 });
  assert.equal(tip.children[0].textContent, "<img onerror=x>");
  assert.equal(tip.children[1].textContent, "1 h");
});

test("rooms follow the configured room number, not the registry order", () => {
  const p = make();
  const climate = (id, dev) => ({ entity_id: `climate.${id}`, platform: "proxon_modbus", device_id: dev });
  p._hass.entities = {
    mode: { entity_id: "select.mode", platform: "proxon_modbus", device_id: "central", translation_key: "operating_mode" },
    c1: climate("b", "r1"), c0: climate("a", "r0"),
  };
  const dev = (id, name, n) => ({ id, name, via_device_id: "central", identifiers: n === undefined ? [] : [["proxon_modbus", `entry_room_${n}`]] });
  p._hass.devices = { r1: dev("r1", "Zweites", 1), r0: dev("r0", "Erstes", 0), central: { id: "central", name: "Proxon" } };
  p._config = {};
  assert.equal(JSON.stringify(p._discoverNow().rooms.map((r) => r.name)), '["Erstes","Zweites"]');
  p._hass.devices = { r1: dev("r1", "Zweites"), r0: dev("r0", "Erstes"), central: { id: "central", name: "Proxon" } };
  assert.equal(JSON.stringify(p._discoverNow().rooms.map((r) => r.name)), '["Zweites","Erstes"]'); // no identifiers: registry order
});

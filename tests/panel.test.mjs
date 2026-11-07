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
  p._hpIv = [[now - 7200, now - 3600]];
  p._hpT0 = now - 86400 * 8;
  const html = p._hpBars();
  assert.equal((html.match(/data-tip="/g) || []).length, 7);
  assert.match(html, /class="chw"/);
  assert.match(html, /class="tip"/);
  assert.match(html, /1 h · 1 /);
});

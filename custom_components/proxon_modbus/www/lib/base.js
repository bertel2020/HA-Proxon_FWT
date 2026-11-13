import { ROOM_ICONS, SETTINGS_TTL, BAD, esc } from "./constants.js";
import { TEXT } from "./text.js";
import { CSS, sharedSheet } from "./styles.js";

export class ProxonFwtBase extends HTMLElement {
  // Overridden by the side panel; the shared code shows panel-only parts based on it.
  get _isPanel() {
    return false;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._view = "tiles";
    this._room = 0;
    this._sig = "";
    this._config = {};
    this.shadowRoot.addEventListener("pointerdown", (ev) => { this._pd = ev.composedPath()[0]; });
    this.shadowRoot.addEventListener("click", (ev) => this._click(ev));
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && ev.target && ev.target.getAttribute && ev.target.getAttribute("role") === "button") {
        ev.preventDefault();
        this._click(ev);
      }
    });
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  connectedCallback() {
    if (typeof ResizeObserver === "undefined" || this._ro) return;
    this._ro = new ResizeObserver(() => {
      const b = Math.round(this.clientWidth / 40);
      if (b !== this._wb) { this._wb = b; this._update(); }
    });
    this._ro.observe(this);
    if (typeof document !== "undefined") {
      this._esc = (ev) => { if (ev.key === "Escape" && this._ropen && this._ropen.size) this._click({ composedPath: () => [{ dataset: { act: "rclose" } }] }); };
      document.addEventListener("keydown", this._esc);
    }
  }

  disconnectedCallback() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._esc && typeof document !== "undefined") { document.removeEventListener("keydown", this._esc); this._esc = null; }
  }

  // ---- entity discovery -------------------------------------------------

  // Discovery walks the whole entity and device registry; HA hands out new registry objects only when
  // something changed, so the result is reused until then (never while a needed state is still missing).
  _discover() {
    const h = this._hass, k = this._dk;
    if (k && k.r !== undefined && k.e === h.entities && k.d === h.devices && k.c === this._config && k.s === this._settings) return k.r;
    this._dmiss = false;
    const r = this._discoverNow();
    this._dk = { e: h.entities, d: h.devices, c: this._config, s: this._settings, r: this._dmiss ? undefined : r };
    return r;
  }

  _discoverNow() {
    const h = this._hass;
    const entities = Object.values(h.entities || {}).filter((e) => e.platform === "proxon_modbus");
    let centralId = this._config.device_id;
    if (!centralId) {
      const mode = entities.find((e) => e.entity_id.startsWith("select.") && e.translation_key === "operating_mode");
      centralId = mode && mode.device_id;
    }
    if (!centralId) return null;
    const central = {};
    for (const e of entities) {
      if (e.device_id === centralId && e.translation_key) central[e.translation_key] = e.entity_id;
    }
    const roomIds = new Set(
      Object.values(h.devices || {}).filter((d) => d.via_device_id === centralId).map((d) => d.id)
    );
    const rooms = [];
    for (const [id, dev] of Object.entries(h.devices || {})) {
      if (!roomIds.has(id)) continue;
      const room = { name: esc(dev.name_by_user || dev.name), ents: {} };
      // room number from the device identifier "<entry>_room_<n>": the configured order, not the registry's
      for (const ident of dev.identifiers || []) {
        const m = ident && ident[0] === "proxon_modbus" && /_room_(\d+)$/.exec(String(ident[1]));
        if (m) room.idx = Number(m[1]);
      }
      for (const e of entities) {
        if (e.device_id !== id) continue;
        if (e.entity_id.startsWith("climate.")) room.climate = e.entity_id;
        else if (e.translation_key) room.ents[e.translation_key] = e.entity_id;
        else {
          if (!h.states[e.entity_id]) this._dmiss = true;
          const dc = (h.states[e.entity_id] || { attributes: {} }).attributes.device_class;
          if (dc === "carbon_dioxide" || dc === "co2") room.co2 = e.entity_id;
          if (dc === "humidity") room.rf = e.entity_id;
        }
      }
      // own sensors chosen per room in the integration options win over the unit's inputs
      const own = ((this._settings && this._settings.room_sensors) || []).filter((x) => x.device_id === id);
      for (const x of own) { if (x.co2) room.co2 = x.co2; if (x.rf) room.rf = x.rf; }
      if (room.climate) rooms.push(room);
    }
    if (rooms.length && rooms.every((r) => r.idx !== undefined)) rooms.sort((a, b) => a.idx - b.idx);
    return { central, rooms };
  }

  _update() {
    const h = this._hass;
    if (!h) return;
    const d = this._discover();
    this._d = d;
    const centralId = d && this._config.device_id ? this._config.device_id : d && d.central && Object.keys(d.central).length ? (h.entities[d.central.operating_mode] || {}).device_id : null;
    if (d && centralId && (this._settingsFor !== centralId || (!this._settingsBusy && Date.now() - (this._settingsAt || 0) > SETTINGS_TTL))) this._loadSettings(centralId);
    const ids = d
      ? [...Object.values(d.central), ...d.rooms.flatMap((r) => [r.climate, r.co2, r.rf, ...Object.values(r.ents)]),
        this._opt("power_entity"), this._opt("outdoor_entity")]
      : [];
    const sig = ids.filter(Boolean).map((i) => {
      const s = h.states[i];
      return s ? `${s.state}|${s.attributes.temperature}|${s.attributes.current_temperature}|${s.attributes.preferred_stage}|${s.attributes.last_restore}|${s.attributes.until}` : "-";
    }).join(",") + `|${this._view}|${this._room}|${h.language}|${this._flip()}|${this._hver || 0}|${this._histRange || "24h"}|${this._hcmp ? 1 : 0}|${this._metric || ""}|${this._ymetric || ""}|${this._tab || ""}|${this._rview || ""}|${this._rfilter || ""}|${[...(this._ropen || [])].join("+")}|${this._boost ? 1 : 0}|${this._wb || 0}|${this._settingsStamp || 0}|${Object.keys(this._dismissed || {}).join("+")}`;
    if (sig === this._sig) return;
    this._sig = sig;
    const keep = this._keepUi();
    this._render();
    this._bindChart();
    this._bindTips();
    this._restoreUi(keep);
  }

  _styleTag() {
    const sh = sharedSheet(), root = this.shadowRoot;
    if (sh && "adoptedStyleSheets" in root) {
      if (!this._adopted) { root.adoptedStyleSheets = [sh]; this._adopted = true; }
      return "";
    }
    return `<style>${CSS}</style>`;
  }

  // A full re-render replaces the DOM: keep the dialog's scroll position and the focused control,
  // and move focus into the dialog when it opens / back to the room card when it closes.
  _keepUi() {
    const root = this.shadowRoot, sheet = root.querySelector && root.querySelector(".rsheet"), a = root.activeElement;
    return { top: sheet ? sheet.scrollTop : 0, act: a && a.dataset ? a.dataset.act : null, v: a && a.dataset ? a.dataset.v : null, inDlg: !!(a && a.closest && a.closest(".rsheet")) };
  }

  _restoreUi(k) {
    const root = this.shadowRoot;
    if (!root.querySelector) return;
    const sheet = root.querySelector(".rsheet"), want = this._focusReq;
    this._focusReq = null;
    if (sheet) sheet.scrollTop = k.top;
    let el = null;
    if (want === "open" && sheet) el = sheet.querySelector(".x");
    else if (want && want.startsWith("close:")) el = root.querySelector(`.rh[data-act="rtoggle"][data-v="${CSS.escape(want.slice(6))}"], .crow[data-v="${CSS.escape(want.slice(6))}"]`);
    else if (k.act && k.act !== "rclose" && k.act !== "noop") {
      const sel = `[data-act="${k.act}"]${k.v != null ? `[data-v="${CSS.escape(String(k.v))}"]` : ""}`;
      el = (k.inDlg && sheet ? sheet : root).querySelector(sel);
    }
    if (el && el.focus) el.focus({ preventScroll: true });
  }

  _days(n) {
    return n === 1 ? this._t("d_one") : this._t("d_n", String(n));
  }

  // Device filter: age in days (since the last change), message and forced-shutdown countdown.
  _filterInfo(c) {
    const iv = Number(this._opt("filter_interval", 180)) || 180;
    const age = this._num(c.filter_age_days), left = this._num(c.filter_shutdown_days);
    return { iv, age, left, due: this._on(c.filter_device), known: age !== null };
  }

  _recirc() {
    return !!this._opt("recirc_filter", false);
  }

  _flip() {
    return this._opt("outdoor_side", "left") === "right";
  }

  // Effective option: card/panel config wins, then the integration's options
  // (loaded once over websocket), then the default.
  _opt(key, def) {
    const v = this._config[key];
    if (v !== undefined && v !== null && v !== "") return v;
    const o = this._settings && this._settings[key];
    return o !== undefined && o !== null && o !== "" ? o : def;
  }

  async _loadSettings(centralId) {
    if (this._settingsFor !== centralId) { this._settings = undefined; this._settingsFor = centralId; }
    this._settingsBusy = true;
    this._settingsAt = Date.now();
    let next;
    try {
      const all = await this._hass.callWS({ type: "proxon_modbus/settings" });
      next = all.find((e) => e.device_id === centralId) || (all.length === 1 ? all[0] : {});
    } catch (err) {
      next = this._settings || {};
    }
    if (this._settingsFor !== centralId) return; // the unit changed while the request was running
    this._settingsBusy = false;
    // Only re-render (and invalidate dependent history) when the options actually changed.
    if (JSON.stringify(next) !== JSON.stringify(this._settings)) {
      this._settings = next;
      this._settingsStamp = Date.now();
    }
    if (!this._dismissedLoaded) this._loadDismissed();
    this._update();
  }

  // ---- helpers ----------------------------------------------------------

  _t(key, ...args) {
    const lang = ((this._hass && this._hass.language) || "en").split("-")[0];
    const txt = (TEXT[lang] || TEXT.en)[key] ?? TEXT.en[key] ?? esc(key); // unknown keys are raw entity states or options
    return args.length ? txt.replace(/\{(\d)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m)) : txt;
  }

  _state(id) {
    return id ? this._hass.states[id] : undefined;
  }

  _ok(id) {
    const s = this._state(id);
    return !!s && !BAD.includes(s.state);
  }

  _num(id) {
    return this._ok(id) && !isNaN(Number(this._state(id).state)) ? Number(this._state(id).state) : null;
  }

  _on(id) {
    const s = this._state(id);
    return !!s && s.state === "on";
  }

  _fmt(v, digits = 1) {
    if (v === null || v === undefined) return "–";
    const lang = (this._hass && this._hass.language) || "en";
    return v.toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  _temp(id, digits = 1) {
    const v = this._num(id);
    return v === null ? null : `${this._fmt(v, digits)}°`;
  }

  _icon(name, extra = "") {
    return `<ha-icon ${extra} icon="${name}"></ha-icon>`;
  }

  _btn(attrs, cls, inner, disabled = false, style = "") {
    return `<button class="${cls}" ${attrs} ${style ? `style="${style}"` : ""} ${disabled ? "disabled" : ""}>${inner}</button>`;
  }

  _header(icon, title, right = "") {
    return `<div class="h">${this._icon(icon)}${title}<span class="r">${right}</span></div>`;
  }

  _roomIcon(name) {
    const hit = ROOM_ICONS.find(([re]) => re.test(name));
    return hit ? hit[1] : "mdi:door";
  }

  _outdoorId() {
    return this._opt("outdoor_entity") || this._d.central.temp_outside;
  }

  _powerId() {
    return this._opt("power_entity") || this._d.central.power_consumption;
  }

  // The power entity may report kW or MW; everything in the panel works in W.
  _pscale() {
    const u = String(((this._state(this._powerId()) || { attributes: {} }).attributes.unit_of_measurement) || "W").trim();
    return u === "kW" ? 1e3 : u === "MW" ? 1e6 : 1;
  }

  _pnum() {
    const v = this._num(this._powerId());
    return v === null ? null : v * this._pscale();
  }

  _efficiency() {
    // Exhaust side after the exchanger (before the evaporator): not influenced by the heat pump.
    const c = this._d.central;
    if (this._on(c.bypass_active)) return null; // summer bypass: the exchanger is bypassed, the value would be meaningless
    if (c.heat_recovery && this._state(c.heat_recovery)) { // the integration's own sensor (same formula, long-term statistics)
      const v = this._num(c.heat_recovery);
      return v === null ? null : Math.round(v);
    }
    const f = this._num(c.temp_fresh_air), e = this._num(c.temp_extract_air), x = this._num(c.temp_pre_evaporator);
    if (f === null || e === null || x === null || Math.abs(e - f) < 3) return null;
    return Math.max(0, Math.min(100, Math.round(((e - x) / (e - f)) * 100)));
  }

}

/*
 * Proxon FWT card - dashboard card shipped with the proxon_modbus integration.
 *
 * Usage:   type: custom:proxon-fwt-card
 * Options: see README ("Dashboard-Karte"). All entities are discovered
 * automatically from the integration, nothing has to be configured.
 */
const SECTIONS = ["mode", "air", "fan", "heatpump", "refrigerant", "status", "rooms"];

const TEXT = {
  de: {
    mode: "Betriebsart", air: "Luftwege", fan: "Lüftung", heatpump: "Wärmepumpe",
    refrigerant: "Kältekreis", diagnostic: "Diagnose", status: "Status und Wartung",
    rooms: "Räume", tiles: "Kacheln", list: "Liste",
    off: "Aus", eco_summer: "Eco Sommer", eco_winter: "Eco Winter", comfort: "Komfort",
    furnace: "Ofenbetrieb", emergency: "Notbetrieb", frost_protection: "Einfrierschutz",
    commissioning: "Einregulierung", not_used: "Nicht belegt",
    d_off: "Anlage ausgeschaltet.",
    d_eco_summer: "Sparbetrieb im Sommer. Lüfterstufe frei wählbar.",
    d_eco_winter: "Sparbetrieb im Winter. Lüfterstufe frei wählbar.",
    d_comfort: "Komfortbetrieb. Intensivlüftung verfügbar.",
    d_furnace: "Betrieb bei laufendem Kaminofen.",
    readonly: "Dieser Zustand wird nur gemeldet und lässt sich nicht schreiben.",
    locked: "Betriebsart derzeit nicht wählbar",
    outdoor_side: "Außenseite", room_side: "Raumseite", exchanger: "Kreuzstrom-Wärmetauscher",
    fresh: "Frischluft", exhaust: "Fortluft", extract: "Abluft", supply: "Zuluft",
    bypass: "Bypass aktiv", bypass_closed: "Bypass geschlossen",
    auto: "Auto", stage: "Stufe", automatic: "automatisch",
    fan_note: "Lüfterstufe nur in Eco Sommer und Eco Winter wählbar.",
    intensive: "Intensivlüftung", fan_auto: "Lüfter-Automatik",
    supply_fan: "Zuluft", extract_fan: "Abluft",
    compressor: "Kompressor", power: "Leistungsaufnahme",
    hp_heating: "Heizbetrieb", hp_cooling: "Kühlbetrieb", hp_continuous: "Dauerbetrieb",
    cooling_available: "Kühlen verfügbar", cooling_enable: "Kühlung freigegeben",
    evaporator: "Verdampfer", condenser: "Kondensator", outside: "Außen",
    pre_evaporator: "vor Verdampfer", post_preheat: "nach Vorwärme", pre_condenser: "vor Kondensator",
    error: "Systemfehler", no_error: "Kein Fehler", has_error: "Fehler",
    filter_device: "Gerätefilter", filter_recirc: "Umluftfilter",
    change_due: "Wechsel fällig", ok: "OK",
    mode_change: "Betriebsartwechsel", possible: "möglich", not_possible: "nicht möglich",
    heating_n: "heizen", of: "von", heats: "heizt", fine: "ok",
    actual: "Ist", target: "Soll", adjustable: "Einstellbar",
    ptc: "PTC-Element", ptc_active: "aktiv", ptc_off: "aus", ptc_enabled: "PTC freigegeben",
    yes: "ja", no: "nein", co2: "CO₂", humidity: "Feuchte",
    none: "Keine Anlage gefunden. Ist die Integration „Proxon FWT (Modbus)“ eingerichtet?",
    no_rooms: "Keine Räume konfiguriert.", unavailable: "nicht verfügbar",
  },
  en: {
    mode: "Operating mode", air: "Air paths", fan: "Ventilation", heatpump: "Heat pump",
    refrigerant: "Refrigerant circuit", diagnostic: "Diagnostics", status: "Status and maintenance",
    rooms: "Rooms", tiles: "Tiles", list: "List",
    off: "Off", eco_summer: "Eco summer", eco_winter: "Eco winter", comfort: "Comfort",
    furnace: "Stove mode", emergency: "Emergency", frost_protection: "Frost protection",
    commissioning: "Commissioning", not_used: "Not used",
    d_off: "Unit switched off.",
    d_eco_summer: "Economy mode for summer. Fan stage can be chosen freely.",
    d_eco_winter: "Economy mode for winter. Fan stage can be chosen freely.",
    d_comfort: "Comfort mode. Intensive ventilation available.",
    d_furnace: "Operation while a stove is running.",
    readonly: "This state is only reported and cannot be written.",
    locked: "Operating mode cannot be changed right now",
    outdoor_side: "Outdoor side", room_side: "Indoor side", exchanger: "Cross-flow heat exchanger",
    fresh: "Fresh air", exhaust: "Exhaust air", extract: "Extract air", supply: "Supply air",
    bypass: "Bypass active", bypass_closed: "Bypass closed",
    auto: "Auto", stage: "Stage", automatic: "automatic",
    fan_note: "Fan stage can only be chosen in Eco summer and Eco winter.",
    intensive: "Intensive ventilation", fan_auto: "Fan automatic",
    supply_fan: "Supply", extract_fan: "Extract",
    compressor: "Compressor", power: "Power consumption",
    hp_heating: "Heating", hp_cooling: "Cooling", hp_continuous: "Continuous",
    cooling_available: "Cooling available", cooling_enable: "Cooling enabled",
    evaporator: "Evaporator", condenser: "Condenser", outside: "Outside",
    pre_evaporator: "before evaporator", post_preheat: "after preheater", pre_condenser: "before condenser",
    error: "System error", no_error: "No error", has_error: "Error",
    filter_device: "Unit filter", filter_recirc: "Recirculation filter",
    change_due: "Replace soon", ok: "OK",
    mode_change: "Mode change", possible: "possible", not_possible: "not possible",
    heating_n: "heating", of: "of", heats: "heating", fine: "ok",
    actual: "Actual", target: "Target", adjustable: "Adjustable",
    ptc: "PTC element", ptc_active: "active", ptc_off: "off", ptc_enabled: "PTC enabled",
    yes: "yes", no: "no", co2: "CO₂", humidity: "Humidity",
    none: "No unit found. Is the \"Proxon FWT (Modbus)\" integration set up?",
    no_rooms: "No rooms configured.", unavailable: "unavailable",
  },
};

const MODE_ICONS = {
  off: "mdi:power", eco_summer: "mdi:weather-sunny", eco_winter: "mdi:snowflake",
  comfort: "mdi:sofa", furnace: "mdi:fireplace",
};
const FAN_STAGES = [
  ["off", "0"], ["stage_1", "1"], ["stage_2", "2"], ["stage_3", "3"], ["stage_4", "4"],
];
const BAD = ["unavailable", "unknown", undefined, null, ""];

const CSS = `
:host { display: block; }
.stack { display: grid; gap: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
ha-card { padding: 14px 16px; }
.h { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; margin-bottom: 12px; }
.h ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.h .r { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
.lb { font-size: 12px; color: var(--secondary-text-color); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 4px; }
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 3px 10px; border-radius: 99px;
  background: var(--secondary-background-color); color: var(--secondary-text-color); }
.chip.g { background: color-mix(in srgb, var(--success-color, #43a047) 20%, transparent); color: var(--success-color, #43a047); }
.chip.w { background: color-mix(in srgb, var(--warning-color, #ffa600) 22%, transparent); color: var(--warning-color, #ffa600); }
.chip.r { background: color-mix(in srgb, var(--error-color, #db4437) 20%, transparent); color: var(--error-color, #db4437); }
.chip.a { background: color-mix(in srgb, var(--primary-color) 20%, transparent); color: var(--primary-color); }
.banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 10px; border-radius: 10px; font-size: 13px; }
.seg { display: grid; gap: 4px; }
.seg button { font: inherit; font-size: 13px; padding: 8px 2px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--secondary-text-color); }
.seg button ha-icon { display: block; margin: 0 auto 2px; --mdc-icon-size: 20px; }
.seg button.a { background: var(--primary-color); color: var(--text-primary-color, #fff); font-weight: 500; }
.seg button:disabled { opacity: .4; cursor: default; }
.row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 7px 0; border-top: 1px solid var(--divider-color); }
.row.first { border-top: 0; padding-top: 0; }
.row ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.row b { margin-left: auto; font-weight: 500; }
.row .sp { margin-left: auto; }
.bar { height: 6px; width: 110px; margin-left: auto; border-radius: 3px; background: var(--secondary-background-color); overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--primary-color); }
.k { background: var(--secondary-background-color); border-radius: 8px; padding: 9px 11px; }
.k .v { font-size: 18px; font-weight: 500; }
.k .v.small { font-size: 15px; }
.kgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.note { font-size: 12px; color: var(--secondary-text-color); margin-top: 8px; }
.hp { display: flex; align-items: center; gap: 16px; }
.big { font-size: 26px; font-weight: 500; }
.big small { font-size: 14px; color: var(--secondary-text-color); font-weight: 400; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.tile { font: inherit; text-align: left; cursor: pointer; border: 2px solid transparent; border-radius: 10px; padding: 10px 12px;
  background: var(--secondary-background-color); color: var(--primary-text-color); }
.tile.s { border-color: var(--primary-color); }
.tile .n { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
.tile .n ha-icon { --mdc-icon-size: 16px; color: var(--secondary-text-color); }
.tile .t { font-size: 24px; font-weight: 500; margin: 6px 0 4px; }
.tile .chips { margin: 0; gap: 4px; }
.rw { display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; align-items: center; padding: 9px 8px;
  border-top: 1px solid var(--divider-color); cursor: pointer; border-radius: 8px; }
.rw.s { background: var(--secondary-background-color); }
.vbtn { font: inherit; font-size: 13px; padding: 5px 12px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--secondary-text-color); }
.vbtn.a { background: var(--primary-color); color: var(--text-primary-color, #fff); }
.det { margin-top: 12px; border-top: 1px solid var(--divider-color); padding-top: 12px; }
.dtop { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.dtop .cur { flex: 1; min-width: 150px; font-size: 32px; font-weight: 500; line-height: 1.1; }
.adj { display: flex; align-items: center; gap: 12px; }
.round { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--divider-color); cursor: pointer; padding: 0;
  background: var(--card-background-color); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; }
.dgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 12px; }
.fl { stroke-dasharray: 6 5; animation: fl 1s linear infinite; }
@keyframes fl { to { stroke-dashoffset: -16; } }
@media (prefers-reduced-motion: reduce) { .fl { animation: none; } }
svg text { fill: var(--primary-text-color); font-family: inherit; }
svg .ts { font-size: 12px; fill: var(--secondary-text-color); }
svg .th { font-size: 14px; font-weight: 500; }
.empty { padding: 16px; color: var(--secondary-text-color); }
`;

class ProxonFwtCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._view = "tiles";
    this._room = 0;
    this._sig = "";
    this.shadowRoot.addEventListener("click", (ev) => this._click(ev));
  }

  static getStubConfig() {
    return { type: "custom:proxon-fwt-card" };
  }

  setConfig(config) {
    const sections = config.sections || SECTIONS;
    if (!Array.isArray(sections) || sections.some((s) => !SECTIONS.includes(s))) {
      throw new Error(`sections must be a list of: ${SECTIONS.join(", ")}`);
    }
    if (config.outdoor_side && !["left", "right"].includes(config.outdoor_side)) {
      throw new Error("outdoor_side must be 'left' or 'right'");
    }
    this._config = {
      outdoor_side: "left", max_fan_rpm: 3000, max_compressor_rpm: 6000, ...config, sections,
    };
    this._sig = "";
    if (this._hass) this._update();
  }

  getCardSize() {
    return 14;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) this._update();
  }

  // ---- entity discovery -------------------------------------------------

  _discover() {
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
      const room = { name: dev.name_by_user || dev.name, ents: {} };
      for (const e of entities) {
        if (e.device_id !== id) continue;
        if (e.entity_id.startsWith("climate.")) room.climate = e.entity_id;
        else if (e.translation_key) room.ents[e.translation_key] = e.entity_id;
        else {
          const dc = (h.states[e.entity_id] || { attributes: {} }).attributes.device_class;
          if (dc === "carbon_dioxide" || dc === "co2") room.co2 = e.entity_id;
          if (dc === "humidity") room.rf = e.entity_id;
        }
      }
      if (room.climate) rooms.push(room);
    }
    return { central, rooms };
  }

  _update() {
    const h = this._hass;
    const d = this._discover();
    this._d = d;
    const ids = d
      ? [...Object.values(d.central), ...d.rooms.flatMap((r) => [r.climate, r.co2, r.rf, ...Object.values(r.ents)]),
        this._config.power_entity, this._config.outdoor_entity]
      : [];
    const sig = ids.filter(Boolean).map((i) => {
      const s = h.states[i];
      return s ? `${s.state}|${s.attributes.temperature}|${s.attributes.current_temperature}` : "-";
    }).join(",") + `|${this._view}|${this._room}|${h.language}`;
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  // ---- helpers ----------------------------------------------------------

  _t(key) {
    const lang = ((this._hass && this._hass.language) || "en").split("-")[0];
    return (TEXT[lang] || TEXT.en)[key] ?? TEXT.en[key] ?? key;
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

  _btn(attrs, cls, inner, disabled = false) {
    return `<button class="${cls}" ${attrs} ${disabled ? "disabled" : ""}>${inner}</button>`;
  }

  // ---- render -----------------------------------------------------------

  _render() {
    const d = this._d;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else {
      const grid = ["fan", "heatpump", "refrigerant", "status"];
      const out = [];
      let cluster = [];
      const flush = () => {
        if (cluster.length) out.push(`<div class="grid">${cluster.join("")}</div>`);
        cluster = [];
      };
      for (const s of this._config.sections) {
        const html = this[`_sec_${s}`](d);
        if (!html) continue;
        if (grid.includes(s)) cluster.push(html);
        else { flush(); out.push(html); }
      }
      flush();
      body = `<div class="stack">${out.join("")}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${body}`;
  }

  _header(icon, title, right = "") {
    return `<div class="h">${this._icon(icon)}${title}<span class="r">${right}</span></div>`;
  }

  _sec_mode(d) {
    const c = d.central;
    if (!c.operating_mode) return "";
    const sel = this._state(c.operating_mode);
    const cur = sel && !BAD.includes(sel.state) ? sel.state : null;
    const detail = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    const readonly = !cur && detail && !["off", "eco_summer", "eco_winter", "comfort", "furnace"].includes(detail);
    const unavail = !!sel && sel.state === "unavailable";
    const changeOk = c.mode_change_possible ? this._on(c.mode_change_possible) || !this._ok(c.mode_change_possible) : true;
    const locked = readonly || unavail || !changeOk;
    const opts = (sel && sel.attributes.options) || ["off", "eco_summer", "eco_winter", "comfort", "furnace"];
    const banner = readonly
      ? `<div class="banner chip ${detail === "emergency" ? "r" : "w"}">${this._icon("mdi:alert-outline")}${this._t(detail)} – ${this._t("locked")}</div>`
      : "";
    const buttons = opts.map((o) =>
      this._btn(`data-act="mode" data-v="${o}"`, cur === o && !locked ? "a" : "", `${this._icon(MODE_ICONS[o] || "mdi:cog")}${this._t(o)}`, locked)
    ).join("");
    const desc = readonly ? this._t("readonly") : cur ? this._t(`d_${cur}`) : "";
    return `<ha-card>${this._header("mdi:tune-variant", this._t("mode"), readonly ? this._t(detail) : cur ? this._t(cur) : "")}
      ${banner}<div class="seg" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr))">${buttons}</div>
      <div class="note">${desc}</div></ha-card>`;
  }

  _sec_air(d) {
    const c = d.central;
    const need = ["temp_fresh_air", "temp_exhaust_air", "temp_extract_air", "temp_supply_air"];
    if (!need.some((k) => c[k])) return "";
    const flip = this._config.outdoor_side === "right";
    const B = "#378ADD", R = "#D85A30";
    const out = flip ? 530 : 20, inn = flip ? 20 : 530;
    const xo = flip ? 375 : 305, xi = flip ? 305 : 375, sg = flip ? -1 : 1;
    const ln = (x1, y1, x2, y2, col, anim, arrow) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2" ${anim ? 'class="fl"' : ""} ${arrow ? 'marker-end="url(#pa)"' : ""}/>`;
    const box = (x, y, col, label, id) => {
      const v = this._temp(id);
      return `<rect x="${x}" y="${y}" width="130" height="46" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".6" stroke-width=".7"/>
        <text class="ts" x="${x + 65}" y="${y + 15}" text-anchor="middle">${label}</text>
        <text class="th" x="${x + 65}" y="${y + 34}" text-anchor="middle">${v === null ? "–" : `${v}C`}</text>`;
    };
    const svg = `<svg width="100%" viewBox="0 0 680 220" role="img" aria-label="${this._t("exchanger")}">
      <defs><marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
      <text class="ts" x="${out + 65}" y="22" text-anchor="middle">${this._t("outdoor_side")}</text>
      <text class="ts" x="${inn + 65}" y="22" text-anchor="middle">${this._t("room_side")}</text>
      <polygon points="340,40 410,110 340,180 270,110" fill="var(--secondary-background-color)" stroke="var(--divider-color)"/>
      ${ln(xo, 75, 340, 110, B, 1)}${ln(340, 110, xi, 145, R, 1)}${ln(xi, 75, 340, 110, R, 1)}${ln(340, 110, xo, 145, B, 1)}
      ${ln(out + (flip ? 0 : 130), 75, xo - sg * 2, 75, B, 0, 1)}${ln(xo - sg * 2, 145, out + (flip ? 0 : 130), 145, B, 0, 1)}
      ${ln(inn + (flip ? 130 : 0), 75, xi + sg * 2, 75, R, 0, 1)}${ln(xi + sg * 2, 145, inn + (flip ? 130 : 0), 145, R, 0, 1)}
      ${box(out, 52, B, this._t("fresh"), c.temp_fresh_air)}${box(out, 122, B, this._t("exhaust"), c.temp_exhaust_air)}
      ${box(inn, 52, R, this._t("extract"), c.temp_extract_air)}${box(inn, 122, R, this._t("supply"), c.temp_supply_air)}
      <text class="ts" x="340" y="205" text-anchor="middle">${this._t("exchanger")}</text></svg>`;
    const bypass = c.bypass_active ? (this._on(c.bypass_active) ? this._t("bypass") : this._t("bypass_closed")) : "";
    return `<ha-card>${this._header("mdi:swap-horizontal", this._t("air"), bypass)}${svg}</ha-card>`;
  }

  _sec_fan(d) {
    const c = d.central;
    if (!c.fan_stage && !c.fan_auto && !c.fan_intensive) return "";
    const sel = this._state(c.fan_stage);
    const stageOk = !!sel && !BAD.includes(sel.state);
    const autoOn = this._on(c.fan_auto);
    const selectable = (n) => {
      const k = n === 0 ? "fan_off_selectable" : `fan_stage_${n}_selectable`;
      return !c[k] || !this._ok(c[k]) || this._on(c[k]);
    };
    let buttons = FAN_STAGES.map(([opt, label], i) =>
      this._btn(`data-act="fan" data-v="${opt}"`, stageOk && !autoOn && sel.state === opt ? "a" : "", label,
        !stageOk || !selectable(i))).join("");
    buttons += this._btn(`data-act="fanauto"`, autoOn ? "a" : "", this._t("auto"), !this._ok(c.fan_auto));
    const current = autoOn ? this._t("auto") : stageOk ? `${this._t("stage")} ${FAN_STAGES.find(([o]) => o === sel.state)?.[1] ?? ""}` : this._t("automatic");
    const bar = (id, label, icon) => {
      const v = this._num(id);
      if (v === null) return "";
      const pct = Math.min(100, Math.round((v / this._config.max_fan_rpm) * 100));
      return `<div class="row first">${this._icon(icon)}${label} ${v.toLocaleString(this._hass.language)} rpm<span class="bar"><i style="width:${pct}%"></i></span></div>`;
    };
    const sw = (id, label, icon, act) => id ? `<div class="row">${this._icon(icon)}${label}<span class="sp">
      <ha-switch data-act="${act}" ${this._on(id) ? "checked" : ""} ${this._ok(id) ? "" : "disabled"}></ha-switch></span></div>` : "";
    return `<ha-card>${this._header("mdi:fan", this._t("fan"), current)}
      <div class="seg" style="grid-template-columns:repeat(6,1fr)">${buttons}</div>
      ${stageOk ? "" : `<div class="note">${this._t("fan_note")}</div>`}
      <div style="margin-top:8px">${bar(c.fan_speed_supply, this._t("supply_fan"), "mdi:arrow-top-right")}${bar(c.fan_speed_extract, this._t("extract_fan"), "mdi:arrow-bottom-left")}</div>
      ${sw(c.fan_intensive, this._t("intensive"), "mdi:rocket-launch-outline", "intensive")}
      ${sw(c.fan_auto, this._t("fan_auto"), "mdi:fan-auto", "autosw")}</ha-card>`;
  }

  _sec_heatpump(d) {
    const c = d.central;
    const rpm = this._num(c.compressor_speed);
    const powerId = this._config.power_entity || c.power_consumption;
    const power = this._num(powerId);
    if (rpm === null && power === null && !c.heat_pump_heating) return "";
    const frac = rpm === null ? 0 : Math.min(1, rpm / this._config.max_compressor_rpm);
    const circ = 2 * Math.PI * 44;
    const ring = `<svg width="104" height="104" viewBox="0 0 110 110" role="img" aria-label="${this._t("compressor")}">
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--divider-color)" stroke-width="9"/>
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--primary-color)" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 55 55)"/>
      <text x="55" y="50" text-anchor="middle" dominant-baseline="central" style="font-size:19px;font-weight:500">${rpm === null ? "–" : rpm.toLocaleString(this._hass.language)}</text>
      <text class="ts" x="55" y="70" text-anchor="middle" style="font-size:11px">rpm</text></svg>`;
    const unit = (this._state(powerId) || { attributes: {} }).attributes.unit_of_measurement || "W";
    const chip = (id, label, cls) => (id && this._ok(id)) ? `<span class="chip ${this._on(id) ? cls : ""}">${label}</span>` : "";
    const cool = c.cooling_enable
      ? `<div class="row">${this._icon("mdi:snowflake")}${this._t("cooling_enable")}<span class="sp"><ha-switch data-act="coolsw" ${this._on(c.cooling_enable) ? "checked" : ""} ${this._ok(c.cooling_enable) ? "" : "disabled"}></ha-switch></span></div>` : "";
    return `<ha-card>${this._header("mdi:heat-pump", this._t("heatpump"))}
      <div class="hp">${ring}<div style="flex:1"><div class="lb">${this._t("compressor")}</div>
      ${power === null ? "" : `<div style="margin-top:6px"><div class="lb">${this._t("power")}</div><div class="big">${this._fmt(power, power % 1 ? 1 : 0)} <small>${unit}</small></div></div>`}</div></div>
      <div class="chips">${chip(c.heat_pump_heating, this._t("hp_heating"), "g")}${chip(c.heat_pump_cooling, this._t("hp_cooling"), "a")}${chip(c.heat_pump_continuous, this._t("hp_continuous"), "a")}${chip(c.cooling_available, this._t("cooling_available"), "g")}</div>
      ${cool}</ha-card>`;
  }

  _sec_refrigerant(d) {
    const c = d.central;
    const outId = this._config.outdoor_entity || c.temp_outside;
    const tile = (label, id, sub = "") => this._ok(id)
      ? `<div class="k"><div class="lb">${label}${sub}</div><div class="v">${this._temp(id)}</div></div>` : "";
    const row = (label, id) => this._ok(id) ? `<div class="row"><span class="lb">${label}</span><b>${this._temp(id)}</b></div>` : "";
    const tiles = tile(this._t("evaporator"), c.temp_evaporator) + tile(this._t("condenser"), c.temp_condenser) +
      tile(this._t("compressor"), c.temp_compressor) + tile(this._t("outside"), outId, this._config.outdoor_entity ? " ·" : "");
    const rows = row(this._t("pre_evaporator"), c.temp_pre_evaporator) + row(this._t("post_preheat"), c.temp_post_preheat) +
      row(this._t("pre_condenser"), c.temp_pre_condenser);
    if (!tiles && !rows) return "";
    return `<ha-card>${this._header("mdi:thermometer", this._t("refrigerant"), this._t("diagnostic"))}
      <div class="kgrid">${tiles}</div><div style="margin-top:10px">${rows}</div></ha-card>`;
  }

  _sec_status(d) {
    const c = d.central;
    const prob = (id, label, okText, badText, icon) => this._ok(id)
      ? `<div class="row">${this._icon(icon)}${label}<b style="color:var(--${this._on(id) ? "warning" : "success"}-color)">${this._on(id) ? badText : okText}</b></div>` : "";
    const change = c.mode_change_possible && this._ok(c.mode_change_possible)
      ? `<div class="row">${this._icon("mdi:shuffle-variant")}${this._t("mode_change")}<b>${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}</b></div>` : "";
    const html = prob(c.error_system, this._t("error"), this._t("no_error"), this._t("has_error"), "mdi:check-circle-outline") +
      prob(c.filter_device, this._t("filter_device"), this._t("ok"), this._t("change_due"), "mdi:air-filter") +
      prob(c.filter_recirculation, this._t("filter_recirc"), this._t("ok"), this._t("change_due"), "mdi:air-filter") + change;
    if (!html) return "";
    return `<ha-card>${this._header("mdi:shield-check-outline", this._t("status"))}${html.replace('class="row"', 'class="row first"')}</ha-card>`;
  }

  _sec_rooms(d) {
    const rooms = d.rooms;
    if (!rooms.length) return `<ha-card>${this._header("mdi:home-outline", this._t("rooms"))}<div class="note">${this._t("no_rooms")}</div></ha-card>`;
    if (this._room >= rooms.length) this._room = 0;
    const info = rooms.map((r) => {
      const s = this._state(r.climate) || { attributes: {}, state: "unavailable" };
      const cur = s.attributes.current_temperature, tgt = s.attributes.temperature;
      const heats = s.attributes.hvac_action ? s.attributes.hvac_action === "heating" : (tgt != null && cur != null && tgt - cur > 0.4);
      return { r, s, cur, tgt, heats, co2: this._num(r.co2), rf: this._num(r.rf), ptcA: this._on(r.ents.ptc_active), ptcE: r.ents.ptc_enable };
    });
    const heating = info.filter((i) => i.heats).length;
    const co2c = (v) => (v > 1000 ? "r" : v > 800 ? "w" : "g");
    let list;
    if (this._view === "tiles") {
      list = `<div class="tiles">${info.map((i, n) => `<button class="tile ${n === this._room ? "s" : ""}" data-act="room" data-v="${n}">
        <div class="n">${this._icon("mdi:door")}${i.r.name}</div><div class="t">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</div>
        <div class="chips"><span class="chip ${i.heats ? "w" : "g"}">${i.heats ? this._t("heats") : this._t("fine")}</span>
        ${i.ptcA ? `<span class="chip w">${this._icon("mdi:lightning-bolt", 'style="--mdc-icon-size:12px"')}PTC</span>` : ""}
        ${i.co2 != null ? `<span class="chip ${co2c(i.co2)}">${Math.round(i.co2)}</span>` : ""}</div></button>`).join("")}</div>`;
    } else {
      list = info.map((i, n) => `<div class="rw ${n === this._room ? "s" : ""}" data-act="room" data-v="${n}">
        <span>${i.r.name}</span><span class="lb">${[i.co2 != null ? `${Math.round(i.co2)} ppm` : "", i.rf != null ? `${Math.round(i.rf)} %` : ""].filter(Boolean).join(" · ")}</span>
        <span class="chip ${i.heats ? "w" : "g"}">${i.heats ? this._t("heats") : this._t("fine")}</span>
        <b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"} <span class="lb">→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</span></b></div>`).join("");
    }
    const sel = info[this._room];
    const a = sel.s.attributes;
    const unavailable = sel.s.state === "unavailable";
    const det = `<div class="det"><div class="dtop"><div class="cur"><div class="lb" style="font-weight:400">${sel.r.name} · ${this._t("actual")}</div>${sel.cur == null ? "–" : this._fmt(sel.cur) + "°"}</div>
      <div class="adj">${this._btn('data-act="down"', "round", this._icon("mdi:minus"), unavailable)}
      <div style="text-align:center"><div class="lb">${this._t("target")}</div><div style="font-size:22px;font-weight:500">${sel.tgt == null ? "–" : this._fmt(sel.tgt, 0) + "°"}</div></div>
      ${this._btn('data-act="up"', "round", this._icon("mdi:plus"), unavailable)}</div></div>
      ${a.min_temp != null ? `<div class="note">${this._t("adjustable")} ${this._fmt(a.min_temp, 0)}–${this._fmt(a.max_temp, 0)} °C</div>` : ""}
      <div class="dgrid">
        ${sel.co2 != null ? `<div class="k"><div class="lb">${this._t("co2")}</div><div class="v small">${Math.round(sel.co2)} ppm</div></div>` : ""}
        ${sel.rf != null ? `<div class="k"><div class="lb">${this._t("humidity")}</div><div class="v small">${Math.round(sel.rf)} %</div></div>` : ""}
        ${sel.r.ents.ptc_active ? `<div class="k"><div class="lb">${this._t("ptc")}</div><div class="v small">${sel.ptcA ? this._t("ptc_active") : this._t("ptc_off")}</div></div>` : ""}
        ${sel.ptcE ? `<div class="k" style="display:flex;align-items:center;gap:8px"><div><div class="lb">${this._t("ptc_enabled")}</div><div class="v small">${this._on(sel.ptcE) ? this._t("yes") : this._t("no")}</div></div>
          <span class="sp" style="margin-left:auto"><ha-switch data-act="ptc" ${this._on(sel.ptcE) ? "checked" : ""} ${this._ok(sel.ptcE) ? "" : "disabled"}></ha-switch></span></div>` : ""}
      </div></div>`;
    return `<ha-card><div class="h">${this._icon("mdi:home-outline")}${this._t("rooms")}<span class="lb" style="margin-left:6px">${heating} ${this._t("of")} ${rooms.length} ${this._t("heating_n")}</span>
      <span class="r"><button class="vbtn ${this._view === "tiles" ? "a" : ""}" data-act="view" data-v="tiles">${this._t("tiles")}</button>
      <button class="vbtn ${this._view === "list" ? "a" : ""}" data-act="view" data-v="list">${this._t("list")}</button></span></div>${list}${det}</ha-card>`;
  }

  // ---- interaction ------------------------------------------------------

  _click(ev) {
    const el = ev.composedPath().find((n) => n.dataset && n.dataset.act);
    if (!el || !this._d || el.disabled) return;
    const act = el.dataset.act, v = el.dataset.v, c = this._d.central, h = this._hass;
    const call = (domain, service, data) => h.callService(domain, service, data);
    switch (act) {
      case "mode": call("select", "select_option", { entity_id: c.operating_mode, option: v }); break;
      case "fan": call("select", "select_option", { entity_id: c.fan_stage, option: v });
        if (this._on(c.fan_auto)) call("switch", "turn_off", { entity_id: c.fan_auto }); break;
      case "fanauto": call("switch", this._on(c.fan_auto) ? "turn_off" : "turn_on", { entity_id: c.fan_auto }); break;
      case "autosw": call("switch", "toggle", { entity_id: c.fan_auto }); break;
      case "intensive": call("switch", "toggle", { entity_id: c.fan_intensive }); break;
      case "coolsw": call("switch", "toggle", { entity_id: c.cooling_enable }); break;
      case "ptc": call("switch", "toggle", { entity_id: this._d.rooms[this._room].ents.ptc_enable }); break;
      case "view": this._view = v; this._sig = ""; this._update(); break;
      case "room": this._room = Number(v); this._sig = ""; this._update(); break;
      case "up": case "down": {
        const id = this._d.rooms[this._room].climate, a = this._state(id).attributes;
        const step = a.target_temp_step || 1;
        const next = Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 18, (a.temperature ?? a.current_temperature ?? 21) + (act === "up" ? step : -step)));
        call("climate", "set_temperature", { entity_id: id, temperature: next });
        break;
      }
    }
  }
}

if (!customElements.get("proxon-fwt-card")) {
  customElements.define("proxon-fwt-card", ProxonFwtCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "proxon-fwt-card",
  name: "Proxon FWT",
  description: "Dashboard card for the Proxon FWT (Modbus) integration: operating mode, air paths, ventilation, heat pump, rooms.",
});

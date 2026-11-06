/*
 * Proxon FWT - dashboard card and side panel, shipped with the proxon_modbus
 * integration (one file, two custom elements):
 *
 *   custom:proxon-fwt-card   a card for any dashboard
 *   proxon-fwt-panel         the full-page side panel (sidebar entry "Proxon FWT")
 *
 * All entities are discovered automatically from the integration.
 */
const DEFAULT_SECTIONS = ["mode", "air", "fan", "heatpump", "refrigerant", "status", "rooms"];
const ALL_SECTIONS = [...DEFAULT_SECTIONS, "schema", "kpi", "alerts", "history"];
const GRID_SECTIONS = ["fan", "heatpump", "refrigerant", "status"];

const TEXT = {
  de: {
    mode: "Betriebsart", air: "Luftwege", fan: "Lüftung", heatpump: "Wärmepumpe",
    refrigerant: "Kältekreis", diagnostic: "Diagnose", status: "Status und Wartung",
    rooms: "Räume", tiles: "Kacheln", list: "Liste", schema: "Anlagenschema",
    kpi: "Kennzahlen", history: "Verlauf 24 h", heatmap: "Farbe = Abweichung vom Soll",
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
    bypass_open: "Bypass offen (automatisch)", bypass_closed: "Bypass geschlossen (automatisch)",
    probes: "Punkte = Temperaturfühler im Luftstrom", flip: "Außenseite rechts",
    auto: "Auto", stage: "Stufe", automatic: "automatisch",
    fan_note: "Lüfterstufe nur in Eco Sommer und Eco Winter wählbar.",
    intensive: "Intensivlüftung", fan_auto: "Lüfter-Automatik",
    fan_restore: "Stufe nach Wärmepumpe wiederherstellen", fan_pref: "Wunschstufe", fan_pref_none: "noch nicht erfasst", fan_restored: "zuletzt zurückgesetzt",
    supply_fan: "Zuluft", extract_fan: "Abluft",
    compressor: "Kompressor", power: "Leistung", power_long: "Leistungsaufnahme",
    hp_heating: "Wärmepumpe heizt", hp_idle: "Wärmepumpe aus", hp_cooling: "Kühlbetrieb", hp_continuous: "Dauerbetrieb",
    cooling_available: "Kühlen verfügbar", cooling_enable: "Kühlung freigegeben",
    evaporator: "Verdampfer", condenser: "Kondensator", outside: "Außen", supply_t: "Zuluft",
    efficiency: "Rückwärmzahl", bypass_short: "bypass",
    pre_evaporator: "vor Verdampfer", post_preheat: "nach Vorwärme", pre_condenser: "vor Kondensator",
    pre_evap_s: "vor Verd.", pre_cond_s: "vor Kond.", post_preheat_s: "nach Vorwärme",
    evap_s: "Verd.", cond_s: "Kond.",
    error: "Systemfehler", no_error: "Kein Fehler", has_error: "Fehler",
    filter_device: "Gerätefilter", filter_recirc: "Umluftfilter",
    change_due: "Wechsel fällig", ok: "OK",
    mode_change: "Betriebsartwechsel", possible: "möglich", not_possible: "nicht möglich",
    write_error: "Letzter Schreibfehler",
    heating_n: "heizen", of: "von", heats: "heizt", fine: "ok",
    actual: "Ist", target: "Soll", adjustable: "Einstellbar",
    ptc: "PTC-Element", ptc_active: "aktiv", ptc_off: "aus", ptc_enabled: "PTC freigegeben",
    yes: "ja", no: "nein", co2: "CO₂", humidity: "Feuchte",
    none: "Keine Anlage gefunden. Ist die Integration „Proxon FWT (Modbus)“ eingerichtet?",
    no_rooms: "Keine Räume konfiguriert.", no_history: "Keine Verlaufsdaten.",
  },
  en: {
    mode: "Operating mode", air: "Air paths", fan: "Ventilation", heatpump: "Heat pump",
    refrigerant: "Refrigerant circuit", diagnostic: "Diagnostics", status: "Status and maintenance",
    rooms: "Rooms", tiles: "Tiles", list: "List", schema: "System diagram",
    kpi: "Key figures", history: "History 24 h", heatmap: "Colour = deviation from target",
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
    bypass_open: "Bypass open (automatic)", bypass_closed: "Bypass closed (automatic)",
    probes: "Dots = temperature sensors in the air stream", flip: "Outdoor side right",
    auto: "Auto", stage: "Stage", automatic: "automatic",
    fan_note: "Fan stage can only be chosen in Eco summer and Eco winter.",
    intensive: "Intensive ventilation", fan_auto: "Fan automatic",
    fan_restore: "Restore stage after heat pump", fan_pref: "Preferred stage", fan_pref_none: "not learned yet", fan_restored: "last restored",
    supply_fan: "Supply", extract_fan: "Extract",
    compressor: "Compressor", power: "Power", power_long: "Power consumption",
    hp_heating: "Heat pump heating", hp_idle: "Heat pump off", hp_cooling: "Cooling", hp_continuous: "Continuous",
    cooling_available: "Cooling available", cooling_enable: "Cooling enabled",
    evaporator: "Evaporator", condenser: "Condenser", outside: "Outside", supply_t: "Supply",
    efficiency: "Heat recovery", bypass_short: "bypass",
    pre_evaporator: "before evaporator", post_preheat: "after preheater", pre_condenser: "before condenser",
    pre_evap_s: "bef. evap.", pre_cond_s: "bef. cond.", post_preheat_s: "after preheat",
    evap_s: "Evap.", cond_s: "Cond.",
    error: "System error", no_error: "No error", has_error: "Error",
    filter_device: "Unit filter", filter_recirc: "Recirculation filter",
    change_due: "Replace soon", ok: "OK",
    mode_change: "Mode change", possible: "possible", not_possible: "not possible",
    write_error: "Last write error",
    heating_n: "heating", of: "of", heats: "heating", fine: "ok",
    actual: "Actual", target: "Target", adjustable: "Adjustable",
    ptc: "PTC element", ptc_active: "active", ptc_off: "off", ptc_enabled: "PTC enabled",
    yes: "yes", no: "no", co2: "CO₂", humidity: "Humidity",
    none: "No unit found. Is the \"Proxon FWT (Modbus)\" integration set up?",
    no_rooms: "No rooms configured.", no_history: "No history data.",
  },
};

const MODE_META = {
  off: { icon: "mdi:power", color: "#8a8f98" },
  eco_summer: { icon: "mdi:weather-sunny", color: "#f2a516" },
  eco_winter: { icon: "mdi:snowflake", color: "#3d8be0" },
  comfort: { icon: "mdi:sofa", color: "#3fa660" },
  furnace: { icon: "mdi:fireplace", color: "#e0562b" },
};
const FAN_STAGES = [
  ["off", "mdi:fan-off", "0"], ["stage_1", "mdi:fan-speed-1", "1"], ["stage_2", "mdi:fan-speed-2", "2"],
  ["stage_3", "mdi:fan-speed-3", "3"], ["stage_4", "mdi:fan-plus", "4"],
];
const ROOM_ICONS = [
  [/wohn|living/i, "mdi:sofa"], [/küche|kueche|kitchen/i, "mdi:silverware-fork-knife"],
  [/schlaf|bed/i, "mdi:bed"], [/kind|child|kid/i, "mdi:teddy-bear"], [/bad|bath|dusche|wc/i, "mdi:shower"],
  [/büro|buero|office|arbeit/i, "mdi:desk"], [/flur|diele|hall/i, "mdi:door-open"],
  [/keller|cellar/i, "mdi:stairs-down"], [/gäste|gaeste|guest/i, "mdi:bed-double"], [/ess|dining/i, "mdi:table-furniture"],
];
const BLUE = "#378ADD", CORAL = "#D85A30", AMBER = "#f2a516", GREEN = "#3fa660";
const BAD = ["unavailable", "unknown", undefined, null, ""];

const CSS = `
:host { display: block; color: var(--primary-text-color); }
* { box-sizing: border-box; }
.stack { display: grid; gap: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.top { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 12px; align-items: start; }
.col { display: grid; gap: 12px; min-width: 0; }
.stack > *, .grid > *, .top > * { min-width: 0; }
ha-card { padding: 14px 16px; display: block; }
.h { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; margin-bottom: 12px; flex-wrap: wrap; }
.h > ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.h .r { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); display: flex; gap: 6px; align-items: center; }
.lb { font-size: 12px; color: var(--secondary-text-color); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 4px; }
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 3px 10px; border-radius: 99px;
  background: var(--secondary-background-color); color: var(--secondary-text-color); white-space: nowrap; }
.chip ha-icon { --mdc-icon-size: 14px; }
.chip.g { background: color-mix(in srgb, #3fa660 20%, transparent); color: #3fa660; }
.chip.w { background: color-mix(in srgb, #f2a516 22%, transparent); color: #c98400; }
.chip.r { background: color-mix(in srgb, #db4437 20%, transparent); color: #db4437; }
.chip.a { background: color-mix(in srgb, var(--primary-color) 20%, transparent); color: var(--primary-color); }
.banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 500; }
.banner ha-icon { --mdc-icon-size: 20px; }
.banner.w { background: color-mix(in srgb, #f2a516 18%, transparent); color: #b87900; }
.banner.r { background: color-mix(in srgb, #db4437 16%, transparent); color: #c5392d; }
.alerts { display: grid; gap: 8px; }
.seg { display: grid; gap: 6px; }
.seg button { font: inherit; font-size: 13px; padding: 10px 4px 8px; border: 1.5px solid transparent; border-radius: 12px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--primary-text-color); transition: background .15s, border-color .15s; }
.seg button ha-icon { display: block; margin: 0 auto 3px; --mdc-icon-size: 24px; color: var(--mc, var(--secondary-text-color)); }
.seg button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--mc, var(--primary-color)) 45%, transparent); }
.seg button.a { background: color-mix(in srgb, var(--mc, var(--primary-color)) 18%, transparent); border-color: var(--mc, var(--primary-color)); font-weight: 600; }
.seg button:disabled { opacity: .4; cursor: default; }
.row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 7px 0; border-top: 1px solid var(--divider-color); }
.row.first { border-top: 0; padding-top: 0; }
.row > ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.row b { margin-left: auto; font-weight: 500; }
.row .sp { margin-left: auto; }
.bar { height: 6px; width: 110px; margin-left: auto; border-radius: 3px; background: var(--secondary-background-color); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; background: var(--primary-color); }
.k { background: var(--secondary-background-color); border-radius: 12px; padding: 10px 12px; }
.k .v { font-size: 18px; font-weight: 500; }
.k .v.small { font-size: 15px; }
.kgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.kpi .k { display: flex; gap: 10px; align-items: center; }
.kpi .ic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none;
  background: color-mix(in srgb, var(--kc) 18%, transparent); color: var(--kc); }
.kpi .ic ha-icon { --mdc-icon-size: 20px; }
.kpi .v { font-size: 22px; font-weight: 500; line-height: 1.15; }
.kpi .v small { font-size: 12px; color: var(--secondary-text-color); font-weight: 400; }
.note { font-size: 12px; color: var(--secondary-text-color); margin-top: 8px; }
.hp { display: flex; align-items: center; gap: 16px; }
.big { font-size: 26px; font-weight: 500; }
.big small { font-size: 14px; color: var(--secondary-text-color); font-weight: 400; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.tile { font: inherit; text-align: left; cursor: pointer; border: 2px solid transparent; border-radius: 12px; padding: 10px 12px;
  background: color-mix(in srgb, var(--hc, transparent) var(--ha, 0%), var(--secondary-background-color)); color: var(--primary-text-color); }
.tile.s { border-color: var(--primary-color); }
.tile .n { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
.tile .n ha-icon { --mdc-icon-size: 18px; color: var(--hc, var(--secondary-text-color)); }
.tile .t { font-size: 24px; font-weight: 500; margin: 6px 0 2px; }
.tile .lb { margin-bottom: 4px; }
.tile .chips { margin: 0; gap: 4px; }
.rw { display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; align-items: center; padding: 9px 8px;
  border-top: 1px solid var(--divider-color); cursor: pointer; border-radius: 8px; }
.rw > span:first-child { display: flex; align-items: center; gap: 8px; }
.rw ha-icon { --mdc-icon-size: 18px; color: var(--hc, var(--secondary-text-color)); }
.rw.s { background: var(--secondary-background-color); }
.vbtn { font: inherit; font-size: 13px; padding: 5px 12px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--secondary-text-color); display: inline-flex; gap: 4px; align-items: center; }
.vbtn ha-icon { --mdc-icon-size: 16px; }
.vbtn.a { background: var(--primary-color); color: var(--text-primary-color, #fff); }
.det { margin-top: 12px; border-top: 1px solid var(--divider-color); padding-top: 12px; }
.dtop { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.dtop .cur { flex: 1; min-width: 150px; font-size: 32px; font-weight: 500; line-height: 1.1; }
.adj { display: flex; align-items: center; gap: 12px; }
.round { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--divider-color); cursor: pointer; padding: 0;
  background: var(--card-background-color); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; }
.round:hover { border-color: var(--primary-color); color: var(--primary-color); }
.dgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 12px; }
.fl { stroke-dasharray: 6 5; animation: fl 1s linear infinite; }
.sp-rot { transform-box: fill-box; transform-origin: center; animation: rot 1.2s linear infinite; }
.off .fl, .off .sp-rot { animation: none; }
@keyframes fl { to { stroke-dashoffset: -16; } }
@keyframes rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .fl, .sp-rot { animation: none; } }
svg text { fill: var(--primary-text-color); font-family: inherit; }
svg .st { font-size: 12px; fill: var(--secondary-text-color); }
svg .sh { font-size: 13px; font-weight: 500; }
.empty { padding: 16px; color: var(--secondary-text-color); }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--secondary-text-color); margin-top: 6px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.panel { padding: 16px; max-width: 1500px; margin: 0 auto; }
.bar-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.bar-top .title { font-size: 20px; font-weight: 500; display: flex; align-items: center; gap: 10px; }
.bar-top .title ha-icon { --mdc-icon-size: 26px; color: var(--primary-color); }
.bar-top .grow { flex: 1; }
.menu { display: none; }
:host([narrow]) .menu { display: inline-flex; }
`;

class ProxonFwtBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._view = "tiles";
    this._room = 0;
    this._sig = "";
    this._config = {};
    this.shadowRoot.addEventListener("click", (ev) => this._click(ev));
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
  }

  disconnectedCallback() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
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
    if (!h) return;
    const d = this._discover();
    this._d = d;
    const centralId = d && this._config.device_id ? this._config.device_id : d && d.central && Object.keys(d.central).length ? (h.entities[d.central.operating_mode] || {}).device_id : null;
    if (d && centralId && this._settingsFor !== centralId) this._loadSettings(centralId);
    const ids = d
      ? [...Object.values(d.central), ...d.rooms.flatMap((r) => [r.climate, r.co2, r.rf, ...Object.values(r.ents)]),
        this._opt("power_entity"), this._opt("outdoor_entity")]
      : [];
    const sig = ids.filter(Boolean).map((i) => {
      const s = h.states[i];
      return s ? `${s.state}|${s.attributes.temperature}|${s.attributes.current_temperature}|${s.attributes.preferred_stage}|${s.attributes.last_restore}` : "-";
    }).join(",") + `|${this._view}|${this._room}|${h.language}|${this._flip()}|${this._histStamp || 0}|${this._wb || 0}|${this._settingsStamp || 0}`;
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
    if (d && this._wantsHistory() && !this._histBusy && Date.now() - (this._histStamp || 0) > 300000) this._loadHistory();
  }

  _wantsHistory() {
    return false;
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
    this._settingsFor = centralId;
    try {
      const all = await this._hass.callWS({ type: "proxon_modbus/settings" });
      this._settings = all.find((e) => e.device_id === centralId) || all[0] || {};
    } catch (err) {
      this._settings = {};
    }
    this._settingsStamp = Date.now();
    this._update();
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

  _efficiency() {
    const c = this._d.central;
    const f = this._num(c.temp_fresh_air), e = this._num(c.temp_extract_air), s = this._num(c.temp_supply_air);
    if (f === null || e === null || s === null || Math.abs(e - f) < 3) return null;
    return Math.max(0, Math.min(100, Math.round(((s - f) / (e - f)) * 100)));
  }

  // ---- sections ---------------------------------------------------------

  _sec_mode(d) {
    const c = d.central;
    if (!c.operating_mode) return "";
    const sel = this._state(c.operating_mode);
    const cur = sel && !BAD.includes(sel.state) ? sel.state : null;
    const detail = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    const readonly = !cur && detail && !Object.keys(MODE_META).includes(detail);
    const unavail = !!sel && sel.state === "unavailable";
    const changeOk = c.mode_change_possible ? this._on(c.mode_change_possible) || !this._ok(c.mode_change_possible) : true;
    const locked = readonly || unavail || !changeOk;
    const opts = (sel && sel.attributes.options) || Object.keys(MODE_META);
    const banner = readonly
      ? `<div class="banner ${detail === "emergency" ? "r" : "w"}" style="margin-bottom:10px">${this._icon("mdi:alert-outline")}${this._t(detail)} – ${this._t("locked")}</div>`
      : "";
    const buttons = opts.map((o) => {
      const meta = MODE_META[o] || { icon: "mdi:cog", color: "#8a8f98" };
      return this._btn(`data-act="mode" data-v="${o}"`, cur === o && !locked ? "a" : "",
        `${this._icon(meta.icon)}${this._t(o)}`, locked, `--mc:${meta.color}`);
    }).join("");
    const desc = readonly ? this._t("readonly") : cur ? this._t(`d_${cur}`) : "";
    return `<ha-card>${this._header("mdi:tune-variant", this._t("mode"), readonly ? this._t(detail) : cur ? this._t(cur) : "")}
      ${banner}<div class="seg" style="grid-template-columns:repeat(auto-fit,minmax(96px,1fr))">${buttons}</div>
      <div class="note">${desc}</div></ha-card>`;
  }

  _sec_alerts(d) {
    const c = d.central;
    const out = [];
    if (this._on(c.error_system)) out.push(["r", "mdi:alert-circle-outline", this._t("error")]);
    if (this._on(c.filter_device)) out.push(["w", "mdi:air-filter", `${this._t("filter_device")}: ${this._t("change_due")}`]);
    if (this._on(c.filter_recirculation)) out.push(["w", "mdi:air-filter", `${this._t("filter_recirc")}: ${this._t("change_due")}`]);
    const det = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    if (det === "emergency" || det === "frost_protection") out.push([det === "emergency" ? "r" : "w", "mdi:alert-outline", this._t(det)]);
    if (this._ok(c.last_write_error) && this._state(c.last_write_error).state !== "none") {
      out.push(["w", "mdi:pencil-off", `${this._t("write_error")}: ${this._state(c.last_write_error).state}`]);
    }
    if (!out.length) return "";
    return `<div class="alerts">${out.map(([k, i, t]) => `<div class="banner ${k}">${this._icon(i)}${t}</div>`).join("")}</div>`;
  }

  _sec_kpi(d) {
    const c = d.central;
    const tile = (icon, color, label, value, unit = "") => value === null || value === undefined ? "" :
      `<div class="k" style="--kc:${color}"><div class="ic">${this._icon(icon)}</div><div><div class="lb">${label}</div><div class="v">${value}${unit ? ` <small>${unit}</small>` : ""}</div></div></div>`;
    const eff = this._efficiency();
    const bypass = this._on(c.bypass_active);
    const power = this._num(this._powerId());
    const html = tile("mdi:thermometer", CORAL, this._t("supply_t"), this._temp(c.temp_supply_air)) +
      tile("mdi:percent-circle-outline", GREEN, this._t("efficiency"), bypass ? this._t("bypass_short") : eff === null ? null : `${eff} %`) +
      tile("mdi:flash", AMBER, this._t("power"), power === null ? null : this._fmt(power, power % 1 ? 1 : 0),
        (this._state(this._powerId()) || { attributes: {} }).attributes.unit_of_measurement || "W") +
      tile("mdi:weather-partly-cloudy", BLUE, this._t("outside"), this._temp(this._outdoorId()));
    if (!html) return "";
    return `<ha-card>${this._header("mdi:gauge", this._t("kpi"))}<div class="kpi">${html}</div></ha-card>`;
  }

  _sec_air(d) {
    const c = d.central;
    if (!["temp_fresh_air", "temp_exhaust_air", "temp_extract_air", "temp_supply_air"].some((k) => c[k])) return "";
    const flip = this._flip();
    const out = flip ? 530 : 20, inn = flip ? 20 : 530;
    const xo = flip ? 375 : 305, xi = flip ? 305 : 375, sg = flip ? -1 : 1;
    const ln = (x1, y1, x2, y2, col, anim, arrow) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2" ${anim ? 'class="fl"' : ""} ${arrow ? 'marker-end="url(#pa)"' : ""}/>`;
    const box = (x, y, col, label, id) => {
      const v = this._temp(id);
      return `<rect x="${x}" y="${y}" width="130" height="46" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".6" stroke-width=".7"/>
        <text class="st" x="${x + 65}" y="${y + 15}" text-anchor="middle">${label}</text>
        <text class="sh" x="${x + 65}" y="${y + 34}" text-anchor="middle">${v === null ? "–" : `${v}C`}</text>`;
    };
    const svg = `<svg width="100%" viewBox="0 0 680 220" role="img" aria-label="${this._t("exchanger")}">
      <defs><marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
      <text class="st" x="${out + 65}" y="22" text-anchor="middle">${this._t("outdoor_side")}</text>
      <text class="st" x="${inn + 65}" y="22" text-anchor="middle">${this._t("room_side")}</text>
      <polygon points="340,40 410,110 340,180 270,110" fill="var(--secondary-background-color)" stroke="var(--divider-color)"/>
      ${ln(xo, 75, 340, 110, BLUE, 1)}${ln(340, 110, xi, 145, CORAL, 1)}${ln(xi, 75, 340, 110, CORAL, 1)}${ln(340, 110, xo, 145, BLUE, 1)}
      ${ln(out + (flip ? 0 : 130), 75, xo - sg * 2, 75, BLUE, 0, 1)}${ln(xo - sg * 2, 145, out + (flip ? 0 : 130), 145, BLUE, 0, 1)}
      ${ln(inn + (flip ? 130 : 0), 75, xi + sg * 2, 75, CORAL, 0, 1)}${ln(xi + sg * 2, 145, inn + (flip ? 130 : 0), 145, CORAL, 0, 1)}
      ${box(out, 52, BLUE, this._t("fresh"), c.temp_fresh_air)}${box(out, 122, BLUE, this._t("exhaust"), c.temp_exhaust_air)}
      ${box(inn, 52, CORAL, this._t("extract"), c.temp_extract_air)}${box(inn, 122, CORAL, this._t("supply"), c.temp_supply_air)}
      <text class="st" x="340" y="205" text-anchor="middle">${this._t("exchanger")}</text></svg>`;
    const bypass = c.bypass_active && this._ok(c.bypass_active) ? this._t(this._on(c.bypass_active) ? "bypass_open" : "bypass_closed") : "";
    return `<ha-card>${this._header("mdi:swap-horizontal", this._t("air"), bypass)}${svg}</ha-card>`;
  }

  _sec_schema(d) {
    const c = d.central;
    const flip = this._flip();
    const X = (x) => (flip ? 680 - x : x);
    const run = !(this._ok(c.operating_mode_state) && this._state(c.operating_mode_state).state === "off");
    const bypass = this._on(c.bypass_active);
    const cool = this._on(c.heat_pump_cooling);
    const T = (id) => this._temp(id);
    const L = (pts, col, anim, arrow) => `<polyline points="${pts.map(([x, y]) => `${X(x)},${y}`).join(" ")}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" ${anim && run ? 'class="fl"' : ""} ${arrow ? 'marker-end="url(#sa)"' : ""}/>`;
    const pill = (cx, cy, label, id, col) => `<rect x="${X(cx) - 44}" y="${cy - 22}" width="88" height="44" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".6" stroke-width=".7"/>
      <text class="st" x="${X(cx)}" y="${cy - 4}" text-anchor="middle">${label}</text><text class="sh" x="${X(cx)}" y="${cy + 13}" text-anchor="middle">${T(id) || "–"}</text>`;
    const coil = (cx, col, label, id) => `<rect x="${X(cx) - 8}" y="123" width="16" height="44" rx="3" fill="${col}" fill-opacity=".3" stroke="${col}"/>
      <text class="st" x="${X(cx)}" y="112" text-anchor="middle">${label}${T(id) ? " " + T(id) : ""}</text>`;
    const fan = (cx, id) => {
      const rpm = this._num(id);
      return `<circle cx="${X(cx)}" cy="145" r="16" fill="var(--card-background-color)" stroke="var(--divider-color)"/>
        <g class="${run ? "sp-rot" : ""}"><path d="M${X(cx) - 12} 145H${X(cx) + 12}M${X(cx)} 133V157" stroke="var(--secondary-text-color)" stroke-width="2.5" stroke-linecap="round"/></g>
        <text class="st" x="${X(cx)}" y="180" text-anchor="middle">${rpm === null ? "" : rpm.toLocaleString(this._hass.language) + " rpm"}</text>`;
    };
    const probe = (cx, cy, ty, txt, id, col) => T(id) ? `<circle cx="${X(cx)}" cy="${cy}" r="3.5" fill="${col}" stroke="var(--card-background-color)" stroke-width="1.5"/>
      <text class="st" x="${X(cx)}" y="${ty}" text-anchor="middle">${txt} ${T(id)}</text>` : "";
    const rpm = this._num(c.compressor_speed);
    const preheat = c.temp_post_preheat && this._ok(c.temp_post_preheat)
      ? `<rect x="${X(150) - 8}" y="61" width="16" height="28" rx="3" fill="${CORAL}" fill-opacity=".25" stroke="${CORAL}"/>
         <path d="M${X(150) - 4} 66L${X(150) + 4} 71L${X(150) - 4} 76L${X(150) + 4} 81" fill="none" stroke="${CORAL}" stroke-width="1.2"/>` : "";
    const outdoor = this._temp(this._outdoorId());
    const svg = `<svg width="100%" viewBox="0 0 680 340" role="img" aria-label="${this._t("schema")}" class="${run ? "" : "off"}">
      <defs><marker id="sa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
      <rect x="100" y="14" width="480" height="312" rx="16" fill="var(--secondary-background-color)" stroke="var(--divider-color)" stroke-dasharray="4 4"/>
      <polygon points="${[[340, 40], [410, 110], [340, 180], [270, 110]].map(([x, y]) => `${X(x)},${y}`).join(" ")}" fill="var(--card-background-color)" stroke="var(--divider-color)"/>
      <g ${bypass ? 'opacity=".25"' : ""}>${L([[305, 75], [340, 110]], BLUE, 1)}${L([[340, 110], [375, 145]], CORAL, 1)}${L([[375, 75], [340, 110]], CORAL, 1)}${L([[340, 110], [305, 145]], BLUE, 1)}</g>
      ${L([[92, 75], [303, 75]], BLUE, 0, 1)}${L([[588, 75], [377, 75]], CORAL, 0, 1)}${L([[377, 145], [588, 145]], CORAL, 0, 1)}${L([[303, 145], [92, 145]], BLUE, 0, 1)}
      ${bypass ? L([[250, 75], [250, 48], [430, 48], [430, 143]], BLUE, 1, 1) : ""}
      ${preheat}
      <text class="st" x="${X(340)}" y="198" text-anchor="middle">${this._t("exchanger")}</text>
      ${cool ? coil(190, CORAL, this._t("cond_s"), c.temp_condenser) + coil(490, BLUE, this._t("evap_s"), c.temp_evaporator)
        : coil(190, BLUE, this._t("evap_s"), c.temp_evaporator) + coil(490, CORAL, this._t("cond_s"), c.temp_condenser)}
      ${fan(130, c.fan_speed_extract)}${fan(550, c.fan_speed_supply)}
      ${probe(190, 75, 56, this._t("post_preheat_s"), c.temp_post_preheat, BLUE)}${probe(cool ? 428 : 252, 145, 165, this._t("pre_evap_s"), c.temp_pre_evaporator, BLUE)}${probe(cool ? 252 : 428, 145, 165, this._t("pre_cond_s"), c.temp_pre_condenser, CORAL)}
      ${cool
        ? L([[314, 245], [180, 245], [180, 169]], CORAL, 1) + L([[200, 169], [200, 305], [326, 305]], CORAL, 1) + L([[354, 305], [480, 305], [480, 169]], BLUE, 1) + L([[500, 169], [500, 245], [366, 245]], BLUE, 1)
        : L([[366, 245], [500, 245], [500, 169]], CORAL, 1) + L([[480, 169], [480, 305], [354, 305]], CORAL, 1) + L([[326, 305], [200, 305], [200, 169]], BLUE, 1) + L([[180, 169], [180, 245], [314, 245]], BLUE, 1)}
      <polygon points="${[[354, 305], [340, 297], [326, 305], [340, 313]].map(([x, y]) => `${X(x)},${y}`).join(" ")}" fill="var(--card-background-color)" stroke="var(--divider-color)"/>
      <circle cx="${X(340)}" cy="245" r="26" fill="var(--card-background-color)" stroke="${BLUE}" stroke-width="1.5"/>
      <text class="sh" x="${X(340)}" y="243" text-anchor="middle">${rpm === null ? "–" : rpm.toLocaleString(this._hass.language)}</text><text class="st" x="${X(340)}" y="258" text-anchor="middle">rpm</text>
      <text class="st" x="${X(340)}" y="281" text-anchor="middle">${this._t("compressor")}${T(c.temp_compressor) ? " " + T(c.temp_compressor) : ""}</text>
      ${pill(48, 75, this._t("fresh"), c.temp_fresh_air, BLUE)}${pill(48, 145, this._t("exhaust"), c.temp_exhaust_air, BLUE)}
      ${pill(632, 75, this._t("extract"), c.temp_extract_air, CORAL)}${pill(632, 145, this._t("supply"), c.temp_supply_air, CORAL)}
      ${outdoor ? `<text class="sh" x="${X(48)}" y="38" text-anchor="middle">${this._t("outside")} ${outdoor}</text>` : ""}</svg>`;
    const hp = this._on(c.heat_pump_heating) || cool;
    const chips = `${c.bypass_active && this._ok(c.bypass_active) ? `<span class="chip ${bypass ? "a" : ""}">${this._icon("mdi:routes")}${this._t(bypass ? "bypass_open" : "bypass_closed")}</span>` : ""}
      ${c.heat_pump_heating ? `<span class="chip ${cool ? "a" : hp ? "g" : ""}">${this._icon(cool ? "mdi:snowflake" : hp ? "mdi:fire" : "mdi:pause")}${this._t(cool ? "hp_cooling" : hp ? "hp_heating" : "hp_idle")}</span>` : ""}`;
    return `<ha-card>${this._header("mdi:sitemap-outline", this._t("schema"), chips)}${svg}<div class="note">${this._t("probes")}</div></ha-card>`;
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
    let buttons = FAN_STAGES.map(([opt, icon, label], i) =>
      this._btn(`data-act="fan" data-v="${opt}"`, stageOk && !autoOn && sel.state === opt ? "a" : "",
        `${this._icon(icon)}${label}`, !stageOk || !selectable(i), `--mc:${BLUE}`)).join("");
    buttons += this._btn(`data-act="fanauto"`, autoOn ? "a" : "", `${this._icon("mdi:fan-auto")}${this._t("auto")}`, !this._ok(c.fan_auto), `--mc:${GREEN}`);
    const current = autoOn ? this._t("auto") : stageOk ? `${this._t("stage")} ${FAN_STAGES.find(([o]) => o === sel.state)?.[2] ?? ""}` : this._t("automatic");
    const bar = (id, label, icon) => {
      const v = this._num(id);
      if (v === null) return "";
      const pct = Math.min(100, Math.round((v / (this._config.max_fan_rpm || 3000)) * 100));
      return `<div class="row first">${this._icon(icon)}${label} ${v.toLocaleString(this._hass.language)} rpm<span class="bar"><i style="width:${pct}%"></i></span></div>`;
    };
    const sw = (id, label, icon, act) => id ? `<div class="row">${this._icon(icon)}${label}<span class="sp">
      <ha-switch data-act="${act}" ${this._on(id) ? "checked" : ""} ${this._ok(id) ? "" : "disabled"}></ha-switch></span></div>` : "";
    let restore = "";
    if (c.fan_stage_restore) {
      const rs = this._state(c.fan_stage_restore);
      const pref = rs?.attributes?.preferred_stage;
      const prefLabel = FAN_STAGES.find(([o]) => o === pref)?.[2];
      const last = rs?.attributes?.last_restore;
      const when = last ? new Date(last).toLocaleString(this._hass.language, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
      restore = `${sw(c.fan_stage_restore, this._t("fan_restore"), "mdi:fan-clock", "restoresw")}
        <div class="note" style="margin-top:2px">${this._t("fan_pref")}: ${prefLabel ? `${this._t("stage")} ${prefLabel}` : this._t("fan_pref_none")}${when ? ` · ${this._t("fan_restored")} ${when}` : ""}</div>`;
    }
    return `<ha-card>${this._header("mdi:fan", this._t("fan"), current)}
      <div class="seg" style="grid-template-columns:repeat(6,1fr)">${buttons}</div>
      ${stageOk ? "" : `<div class="note">${this._t("fan_note")}</div>`}
      <div style="margin-top:8px">${bar(c.fan_speed_supply, this._t("supply_fan"), "mdi:arrow-top-right")}${bar(c.fan_speed_extract, this._t("extract_fan"), "mdi:arrow-bottom-left")}</div>
      ${sw(c.fan_intensive, this._t("intensive"), "mdi:rocket-launch-outline", "intensive")}
      ${sw(c.fan_auto, this._t("fan_auto"), "mdi:fan-auto", "autosw")}${restore}</ha-card>`;
  }

  _sec_heatpump(d) {
    const c = d.central;
    const rpm = this._num(c.compressor_speed);
    const powerId = this._powerId();
    const power = this._num(powerId);
    if (rpm === null && power === null && !c.heat_pump_heating) return "";
    const frac = rpm === null ? 0 : Math.min(1, rpm / (this._config.max_compressor_rpm || 6000));
    const circ = 2 * Math.PI * 44;
    const ring = `<svg width="104" height="104" viewBox="0 0 110 110" role="img" aria-label="${this._t("compressor")}">
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--divider-color)" stroke-width="9"/>
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--primary-color)" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 55 55)"/>
      <text x="55" y="50" text-anchor="middle" dominant-baseline="central" style="font-size:19px;font-weight:500">${rpm === null ? "–" : rpm.toLocaleString(this._hass.language)}</text>
      <text class="st" x="55" y="70" text-anchor="middle" style="font-size:11px">rpm</text></svg>`;
    const unit = (this._state(powerId) || { attributes: {} }).attributes.unit_of_measurement || "W";
    const chip = (id, icon, label, cls) => (id && this._ok(id)) ? `<span class="chip ${this._on(id) ? cls : ""}">${this._icon(icon)}${label}</span>` : "";
    const cool = c.cooling_enable
      ? `<div class="row">${this._icon("mdi:snowflake")}${this._t("cooling_enable")}<span class="sp"><ha-switch data-act="coolsw" ${this._on(c.cooling_enable) ? "checked" : ""} ${this._ok(c.cooling_enable) ? "" : "disabled"}></ha-switch></span></div>` : "";
    return `<ha-card>${this._header("mdi:heat-pump", this._t("heatpump"))}
      <div class="hp">${ring}<div style="flex:1"><div class="lb">${this._t("compressor")}</div>
      ${power === null ? "" : `<div style="margin-top:6px"><div class="lb">${this._t("power_long")}</div><div class="big">${this._fmt(power, power % 1 ? 1 : 0)} <small>${unit}</small></div></div>`}</div></div>
      <div class="chips">${chip(c.heat_pump_heating, "mdi:fire", this._t("hp_heating"), "g")}${chip(c.heat_pump_cooling, "mdi:snowflake", this._t("hp_cooling"), "a")}${chip(c.heat_pump_continuous, "mdi:autorenew", this._t("hp_continuous"), "a")}${chip(c.cooling_available, "mdi:snowflake-check", this._t("cooling_available"), "g")}</div>
      ${cool}</ha-card>`;
  }

  _sec_refrigerant(d) {
    const c = d.central;
    const tile = (label, id, sub = "") => this._ok(id)
      ? `<div class="k"><div class="lb">${label}${sub}</div><div class="v">${this._temp(id)}</div></div>` : "";
    const row = (label, id) => this._ok(id) ? `<div class="row"><span class="lb">${label}</span><b>${this._temp(id)}</b></div>` : "";
    const tiles = tile(this._t("evaporator"), c.temp_evaporator) + tile(this._t("condenser"), c.temp_condenser) +
      tile(this._t("compressor"), c.temp_compressor) + tile(this._t("outside"), this._outdoorId(), this._opt("outdoor_entity") ? " ·" : "");
    const rows = row(this._t("pre_evaporator"), c.temp_pre_evaporator) + row(this._t("post_preheat"), c.temp_post_preheat) +
      row(this._t("pre_condenser"), c.temp_pre_condenser);
    if (!tiles && !rows) return "";
    return `<ha-card>${this._header("mdi:thermometer", this._t("refrigerant"), this._t("diagnostic"))}
      <div class="kgrid">${tiles}</div><div style="margin-top:10px">${rows}</div></ha-card>`;
  }

  _sec_status(d) {
    const c = d.central;
    const prob = (id, label, okText, badText, icon) => this._ok(id)
      ? `<div class="row">${this._icon(icon)}${label}<b style="color:${this._on(id) ? "#c98400" : GREEN}">${this._on(id) ? badText : okText}</b></div>` : "";
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
      const dev = cur != null && tgt != null ? cur - tgt : 0;
      const heats = s.attributes.hvac_action ? s.attributes.hvac_action === "heating" : (tgt != null && cur != null && tgt - cur > 0.4);
      return { r, s, cur, tgt, dev, heats, co2: this._num(r.co2), rf: this._num(r.rf), ptcA: this._on(r.ents.ptc_active), ptcE: r.ents.ptc_enable };
    });
    const heating = info.filter((i) => i.heats).length;
    const co2c = (v) => (v > 1000 ? "r" : v > 800 ? "w" : "g");
    const tint = (i) => {
      const a = Math.min(Math.abs(i.dev) / 1.5, 1) * 32;
      return Math.abs(i.dev) <= 0.3 ? "--hc:#3fa660;--ha:6%" : `--hc:${i.dev < 0 ? BLUE : CORAL};--ha:${Math.round(a)}%`;
    };
    let list;
    if (this._view === "tiles") {
      list = `<div class="tiles">${info.map((i, n) => `<button class="tile ${n === this._room ? "s" : ""}" style="${tint(i)}" data-act="room" data-v="${n}">
        <div class="n">${this._icon(this._roomIcon(i.r.name))}${i.r.name}</div><div class="t">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</div>
        <div class="lb">${this._t("target")} ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</div>
        <div class="chips"><span class="chip ${i.heats ? "w" : "g"}">${this._icon(i.heats ? "mdi:fire" : "mdi:check")}${i.heats ? this._t("heats") : this._t("fine")}</span>
        ${i.ptcA ? `<span class="chip w">${this._icon("mdi:lightning-bolt")}PTC</span>` : ""}
        ${i.co2 != null ? `<span class="chip ${co2c(i.co2)}">${this._icon("mdi:molecule-co2")}${Math.round(i.co2)}</span>` : ""}</div></button>`).join("")}</div>`;
    } else {
      list = info.map((i, n) => `<div class="rw ${n === this._room ? "s" : ""}" style="${tint(i)}" data-act="room" data-v="${n}">
        <span>${this._icon(this._roomIcon(i.r.name))}${i.r.name}</span><span class="lb">${[i.co2 != null ? `${Math.round(i.co2)} ppm` : "", i.rf != null ? `${Math.round(i.rf)} %` : ""].filter(Boolean).join(" · ")}</span>
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
      <span class="r"><span class="lb">${this._t("heatmap")}</span>
      <button class="vbtn ${this._view === "tiles" ? "a" : ""}" data-act="view" data-v="tiles">${this._icon("mdi:view-grid-outline")}${this._t("tiles")}</button>
      <button class="vbtn ${this._view === "list" ? "a" : ""}" data-act="view" data-v="list">${this._icon("mdi:format-list-bulleted")}${this._t("list")}</button></span></div>${list}${det}</ha-card>`;
  }

  _sec_history(d) {
    const series = this._series || [];
    const body = series.some((s) => s.pts.length > 1) ? this._chart(series) : `<div class="note">${this._t("no_history")}</div>`;
    return `<ha-card>${this._header("mdi:chart-line", this._t("history"))}${body}</ha-card>`;
  }

  _chart(series) {
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 170, pl = 34, pr = 8, pt = 8, pb = 18;
    const all = series.flatMap((s) => s.pts);
    const t0 = Math.min(...all.map((p) => p[0])), t1 = Math.max(...all.map((p) => p[0]));
    let lo = Math.min(...all.map((p) => p[1])), hi = Math.max(...all.map((p) => p[1]));
    lo = Math.floor(lo - 1); hi = Math.ceil(hi + 1);
    const x = (t) => pl + ((t - t0) / Math.max(1, t1 - t0)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - pt - pb);
    const grid = [0, 1, 2, 3].map((i) => {
      const v = lo + ((hi - lo) * i) / 3;
      return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--divider-color)" stroke-width=".6"/><text class="st" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" style="font-size:11px">${Math.round(v)}°</text>`;
    }).join("");
    const lines = series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" points="${s.pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`).join("");
    const hours = [0, 6, 12, 18, 24].map((h) => {
      const t = t0 + ((t1 - t0) * h) / 24;
      return `<text class="st" x="${x(t)}" y="${H - 3}" text-anchor="middle" style="font-size:11px">${new Date(t * 1000).toLocaleTimeString(this._hass.language, { hour: "2-digit", minute: "2-digit" })}</text>`;
    }).join("");
    const legend = series.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("");
    return `<svg style="max-width:100%" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("history")}">${grid}${lines}${hours}</svg><div class="legend">${legend}</div>`;
  }

  async _loadHistory() {
    const c = this._d && this._d.central;
    if (!c) return;
    this._histBusy = true;
    const defs = [
      [c.temp_supply_air, this._t("supply_t"), CORAL],
      [c.temp_extract_air, this._t("extract"), AMBER],
      [c.temp_fresh_air, this._t("fresh"), BLUE],
    ].filter(([id]) => id);
    const out = this._outdoorId();
    if (out && !defs.some(([id]) => id === out)) defs.push([out, this._t("outside"), "#7e57c2"]);
    try {
      const end = new Date(), start = new Date(end.getTime() - 24 * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: defs.map(([id]) => id), minimal_response: true, no_attributes: true, significant_changes_only: false,
      });
      this._series = defs.map(([id, label, color]) => ({
        label, color,
        pts: (res[id] || []).map((p) => [p.lu ?? Date.parse(p.last_updated) / 1000, Number(p.s ?? p.state)]).filter(([t, v]) => !isNaN(t) && !isNaN(v)),
      }));
    } catch (err) {
      this._series = [];
    }
    this._histBusy = false;
    this._histStamp = Date.now();
    this._update();
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
      case "restoresw": call("switch", "toggle", { entity_id: c.fan_stage_restore }); break;
      case "intensive": call("switch", "toggle", { entity_id: c.fan_intensive }); break;
      case "coolsw": call("switch", "toggle", { entity_id: c.cooling_enable }); break;
      case "ptc": call("switch", "toggle", { entity_id: this._d.rooms[this._room].ents.ptc_enable }); break;
      case "view": this._view = v; this._sig = ""; this._update(); break;
      case "room": this._room = Number(v); this._sig = ""; this._update(); break;
      case "menu": this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); break;
      case "flip": this._toggleFlip(); break;
      case "up": case "down": {
        const id = this._d.rooms[this._room].climate, a = this._state(id).attributes;
        const step = a.target_temp_step || 1;
        const next = Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 18, (a.temperature ?? a.current_temperature ?? 21) + (act === "up" ? step : -step)));
        call("climate", "set_temperature", { entity_id: id, temperature: next });
        break;
      }
    }
  }

  _toggleFlip() {}
}

class ProxonFwtCard extends ProxonFwtBase {
  static getStubConfig() {
    return { type: "custom:proxon-fwt-card" };
  }

  static getConfigElement() {
    return document.createElement("proxon-fwt-card-editor");
  }

  setConfig(config) {
    const sections = config.sections || DEFAULT_SECTIONS;
    if (!Array.isArray(sections) || sections.some((s) => !ALL_SECTIONS.includes(s))) {
      throw new Error(`sections must be a list of: ${ALL_SECTIONS.join(", ")}`);
    }
    if (config.outdoor_side && !["left", "right"].includes(config.outdoor_side)) {
      throw new Error("outdoor_side must be 'left' or 'right'");
    }
    this._config = { max_fan_rpm: 3000, max_compressor_rpm: 6000, ...config, sections };
    this._sig = "";
    if (this._hass) this._update();
  }

  getCardSize() {
    return 14;
  }

  _wantsHistory() {
    return this._config.sections.includes("history");
  }

  _render() {
    const d = this._d;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else {
      const out = [];
      let cluster = [];
      const flush = () => {
        if (cluster.length) out.push(`<div class="grid">${cluster.join("")}</div>`);
        cluster = [];
      };
      for (const s of this._config.sections) {
        const html = this[`_sec_${s}`](d);
        if (!html) continue;
        if (GRID_SECTIONS.includes(s)) cluster.push(html);
        else { flush(); out.push(html); }
      }
      flush();
      body = `<div class="stack">${out.join("")}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${body}`;
  }
}

class ProxonFwtPanel extends ProxonFwtBase {
  constructor() {
    super();
    let flip = null;
    try {
      const v = localStorage.getItem("proxon_fwt_outdoor_right");
      if (v !== null) flip = v === "1";
    } catch (e) { /* ignore */ }
    this._config = { max_fan_rpm: 3000, max_compressor_rpm: 6000 };
    if (flip !== null) this._config.outdoor_side = flip ? "right" : "left";
  }

  set narrow(v) {
    this.toggleAttribute("narrow", !!v);
  }

  set panel(p) {
    this._panel = p;
  }

  set route(r) {
    this._route = r;
  }

  _wantsHistory() {
    return true;
  }

  _toggleFlip() {
    const right = !this._flip();
    this._config.outdoor_side = right ? "right" : "left";
    try { localStorage.setItem("proxon_fwt_outdoor_right", right ? "1" : "0"); } catch (e) { /* ignore */ }
    this._sig = "";
    this._update();
  }

  _render() {
    const d = this._d;
    const head = `<div class="bar-top">
      <button class="round menu" data-act="menu" aria-label="Menu">${this._icon("mdi:menu")}</button>
      <div class="title">${this._icon("mdi:heat-pump")}Proxon FWT</div><div class="grow"></div>
      <button class="vbtn ${this._flip() ? "a" : ""}" data-act="flip">${this._icon("mdi:swap-horizontal")}${this._t("flip")}</button></div>`;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else {
      const grid = ["heatpump", "refrigerant", "status"].map((s) => this[`_sec_${s}`](d)).filter(Boolean).join("");
      body = `<div class="stack">${this._sec_mode(d)}${this._sec_alerts(d)}
        <div class="top"><div class="col">${this._sec_schema(d)}${this._sec_fan(d)}</div><div class="col">${this._sec_kpi(d)}${this._sec_rooms(d)}</div></div>
        <div class="grid">${grid}</div>${this._sec_history(d)}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="panel">${head}${body}</div>`;
  }
}

class ProxonFwtCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _label(name) {
    const lang = ((this._hass && this._hass.language) || "en").split("-")[0];
    const T = TEXT[lang] || TEXT.en;
    const labels = lang === "de"
      ? { sections: "Bereiche", outdoor_side: "Außenseite des Wärmetauschers", power_entity: "Leistungssensor (optional)",
          outdoor_entity: "Außentemperatursensor (optional)", max_fan_rpm: "Lüfter-Drehzahl für volle Balken (rpm)",
          max_compressor_rpm: "Kompressor-Drehzahl für vollen Ring (rpm)" }
      : { sections: "Sections", outdoor_side: "Outdoor side of the heat exchanger", power_entity: "Power sensor (optional)",
          outdoor_entity: "Outdoor temperature sensor (optional)", max_fan_rpm: "Fan speed for full bars (rpm)",
          max_compressor_rpm: "Compressor speed for full ring (rpm)" };
    return labels[name] || T[name] || name;
  }

  _render() {
    if (!this._config) return;
    const lang = ((this._hass && this._hass.language) || "en").split("-")[0];
    const T = TEXT[lang] || TEXT.en;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        const cfg = { ...ev.detail.value };
        if (cfg.outdoor_side === "auto") delete cfg.outdoor_side;
        for (const k of Object.keys(cfg)) if (cfg[k] === "" || cfg[k] === undefined || cfg[k] === null) delete cfg[k];
        this._config = cfg;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.computeLabel = (s) => this._label(s.name);
    this._form.schema = [
      { name: "sections", selector: { select: { multiple: true, mode: "list", options: ALL_SECTIONS.map((v) => ({ value: v, label: T[v] || v })) } } },
      { name: "outdoor_side", selector: { select: { mode: "dropdown", options: [
        { value: "auto", label: lang === "de" ? "Wie in der Integration" : "As set in the integration" },
        { value: "left", label: lang === "de" ? "Links" : "Left" }, { value: "right", label: lang === "de" ? "Rechts" : "Right" }] } } },
      { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
      { name: "outdoor_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      { name: "max_fan_rpm", selector: { number: { min: 500, max: 10000, step: 100, mode: "box" } } },
      { name: "max_compressor_rpm", selector: { number: { min: 500, max: 20000, step: 100, mode: "box" } } },
    ];
    this._form.data = { sections: DEFAULT_SECTIONS, outdoor_side: "auto", max_fan_rpm: 3000, max_compressor_rpm: 6000, ...this._config };
  }
}

for (const [name, cls] of [["proxon-fwt-card", ProxonFwtCard], ["proxon-fwt-panel", ProxonFwtPanel], ["proxon-fwt-card-editor", ProxonFwtCardEditor]]) {
  if (!customElements.get(name)) customElements.define(name, cls);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "proxon-fwt-card")) {
  window.customCards.push({
    type: "proxon-fwt-card",
    name: "Proxon FWT",
    description: "Dashboard card for the Proxon FWT (Modbus) integration: operating mode, air paths, ventilation, heat pump, rooms.",
  });
}

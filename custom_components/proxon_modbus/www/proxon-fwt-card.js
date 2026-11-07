/*
 * Proxon FWT - dashboard card and side panel, shipped with the proxon_modbus
 * integration (one file, two custom elements):
 *
 *   custom:proxon-fwt-card   a card for any dashboard
 *   proxon-fwt-panel         the full-page side panel (sidebar entry "Proxon FWT")
 *
 * All entities are discovered automatically from the integration.
 */
// "mode" and "fan" are the older separate sections; "operation" shows both in one card and is the default.
const DEFAULT_SECTIONS = ["operation", "air", "heatpump", "refrigerant", "status", "rooms"];
const ALL_SECTIONS = ["operation", "mode", "fan", "air", "heatpump", "refrigerant", "status", "rooms", "quick", "schema", "kpi", "alerts", "history", "runtime", "energy"];
const GRID_SECTIONS = ["fan", "heatpump", "refrigerant", "status"];

const TEXT = {
  de: {
    mode: "Betriebsart", air: "Luftwege", fan: "Lüftung", heatpump: "Wärmepumpe",
    refrigerant: "Kältekreis", diagnostic: "Diagnose", status: "Status und Wartung",
    rooms: "Räume", tiles: "Kacheln", list: "Liste", schema: "Anlagenschema",
    kpi: "Kennzahlen", history: "Verlauf", hist_24: "24 h", hist_7: "7 Tage", hp_runs: "Wärmepumpe läuft", hp_per_day: "Wärmepumpen-Laufzeit pro Tag", hp_starts: "Starts", hp_no_data: "Keine Daten zur Wärmepumpe.", heatmap: "Farbe = Abweichung vom Soll",
    off: "Aus", eco_summer: "Eco Sommer", eco_winter: "Eco Winter", comfort: "Komfort",
    furnace: "Ofenbetrieb", emergency: "Notbetrieb", frost_protection: "Einfrierschutz",
    commissioning: "Einregulierung", not_used: "Nicht belegt",
    ms_off: "Aus", ms_eco_summer: "Sommer", ms_eco_winter: "Winter", ms_comfort: "Komfort", ms_furnace: "Ofen", operation: "Betrieb", fan_stage_l: "Lüfterstufe",
    d_off: "Anlage ausgeschaltet.",
    d_eco_summer: "Sparbetrieb im Sommer. Lüfterstufe frei wählbar.",
    d_eco_winter: "Sparbetrieb im Winter. Lüfterstufe frei wählbar.",
    d_comfort: "Komfortbetrieb. Intensivlüftung verfügbar.",
    d_furnace: "Betrieb bei laufendem Kaminofen.",
    readonly: "Dieser Zustand wird nur gemeldet und lässt sich nicht schreiben.",
    locked: "Betriebsart derzeit nicht wählbar",
    outdoor_side: "Außenseite", room_side: "Raumseite", exchanger: "Kreuzgegenstrom-Wärmetauscher",
    fresh: "Frischluft", exhaust: "Fortluft", extract: "Abluft", supply: "Zuluft",
    bypass_open: "Bypass offen (automatisch)", bypass_closed: "Bypass geschlossen (automatisch)",
    probes: "Punkte = Temperaturfühler im Luftstrom",
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
    heating_n: "PTC aktiv", of: "von", heats: "PTC", fine: "ok",
    actual: "Ist", target: "Soll", adjustable: "Einstellbar",
    ptc: "PTC-Element", ptc_active: "aktiv", ptc_off: "aus", ptc_enabled: "PTC freigegeben",
    yes: "ja", no: "nein", co2: "CO₂", humidity: "Feuchte",
    none: "Keine Anlage gefunden. Ist die Integration „Proxon FWT (Modbus)“ eingerichtet?",
    no_rooms: "Keine Räume konfiguriert.", no_history: "Keine Verlaufsdaten.",
    tab_overview: "Übersicht", tab_rooms: "Räume", tab_history: "Verlauf", tab_diag: "Diagnose",
    live_lost: "Keine Verbindung zur Anlage", since: "seit", hints: "Hinweise", dismiss: "Ausblenden", hidden_n: "{0} ausgeblendet", show_again: "anzeigen", hidden_note: "Ausgeblendete Hinweise kommen nach 24 Stunden oder bei neuer Ursache wieder.",
    go_maint: "Zur Wartung", go_hist: "Verlauf ansehen", go_diag: "Diagnose",
    ins_filter_now: "{0}: Wechsel fällig", ins_filter_now_d: "Die Anlage meldet einen fälligen Filterwechsel. Beide Filtereinschübe tauschen (Frischluft und Abluft).",
    ins_filter_soon: "{0} bald fällig", ins_filter_soon_d: "Tag {0} von {1}. Zwei neue Filter bereithalten (Frischluft und Abluft).",
    ins_shutdown_d: "Die Anlage schaltet in {0} zwangsweise ab. Nach dem Wechsel „Filter getauscht“ drücken.", d_one: "1 Tag", d_n: "{0} Tagen",
    f_age: "Tag {0} von {1} · noch {2} Tage", f_unknown: "Tauschdatum unbekannt – nach dem nächsten Wechsel „Filter getauscht“ drücken.",
    f_shutdown: "Zwangsabschaltung in {0}", f_age: "Alter", f_day_of: "Tag {0} von {1}", f_btn: "Filter getauscht", f_confirm: "Gerätefilter als getauscht markieren? Alter und Frist beginnen neu.",
    ins_cycle_t: "Wärmepumpe taktet häufig", ins_cycle_d: "{0} Starts seit 0 Uhr. Häufiges Takten belastet den Kompressor.",
    ins_eff_t: "Rückwärmzahl niedrig", ins_eff_d: "Nur {0} %. Wärmetauscher und Filter prüfen.",
    ins_co2_t: "CO₂ erhöht", ins_co2_d: "{0}: {1} ppm. Lüften oder Lüfterstufe erhöhen.",
    ins_ok_t: "Alles unauffällig", ins_ok_eff: "Rückwärmzahl {0} %.", ins_ok_d: "Keine Fehler, Filter in Ordnung.",
    quick: "Schnellaktionen", boost: "Stoßlüften", boost_end: "Stoßlüften beenden", boost_d_i: "Intensivlüftung ein", boost_d_s: "Stufe 4, bis du es beendest", boost_d_t: "Dann automatisch zurück", boost_until: "bis {0} Uhr, dann automatisch zurück", boost_min: "{0} Min.",
    all_up: "Alle Räume +1 °C", all_down: "Alle Räume −1 °C",
    measure: "Messwerte", g_air: "Luft", g_circuit: "Kältekreis", g_drive: "Antriebe",
    maint: "Wartung und Statistik", rt_today: "Laufzeit heute", rt_total: "Laufzeit gesamt", starts_today: "Starts heute", starts_total: "Starts gesamt",
    hist_30: "30 Tage", m_temp: "Temperaturen", runtime: "Wärmepumpen-Laufzeit", energy: "Energie pro Tag", day: "Tag",
    energy_note: "Näherung aus der mittleren Tagesleistung (Ø W × 24 h).",
    no_stats: "Für diesen Zeitraum liegen keine Langzeitstatistiken vor.",
    year: "Jahresübersicht", year_sub: "12 Monate", y_runtime: "Laufzeit", y_energy: "Energie", y_starts: "Starts", y_note: "Die Monatswerte entstehen aus der Langzeitstatistik und füllen sich mit der Zeit. Energie ist eine Näherung aus der mittleren Leistung.", y_filter: "Filter getauscht", y_month: "Monat",
    legend_cool: "kühler als Soll", legend_ok: "im Soll", legend_warm: "wärmer als Soll", close: "Schließen",
    rv_cards: "Karten", rv_cmp: "Vergleich", rv_list: "Liste", rf_all: "Alle", rf_heat: "PTC aktiv", rf_ena: "PTC freigegeben", rf_dev: "Abweichung", rf_co2: "CO₂ hoch",
    rs_avg: "Ø Raumtemperatur", rs_heat: "PTC", rs_active: "aktiv", rs_enabled: "freigegeben", rs_co2: "CO₂ am höchsten", rs_rf: "Ø Feuchte", rs_none: "Keine Räume für diesen Filter.",
    st_cool: "Unter Soll", st_warm: "Über Soll", st_ok: "Im Soll", st_heat: "PTC heizt", r_t24: "Temperatur 24 h", r_ago: "vor 24 h", r_now: "jetzt", r_details: "Details",
    r_tapnote: "Raum antippen für Details", r_noh: "Kein Verlauf verfügbar", r_set: "Soll {0}°",
    tip_hx: "Kreuzgegenstrom-Wärmetauscher: Warme Abluft heizt die kalte Frischluft vor, ohne dass sich beide mischen. Rückwärmzahl {0}.",
    tip_comp: "Kompressor – Details unter Diagnose", tip_fan: "Lüfter",
    eff_info: "Anteil der Abluftwärme, der an die Frischluft übertragen wird: (Zuluft − Frischluft) ÷ (Abluft − Frischluft). Über 85 % ist gut.",
  },
  en: {
    mode: "Operating mode", air: "Air paths", fan: "Ventilation", heatpump: "Heat pump",
    refrigerant: "Refrigerant circuit", diagnostic: "Diagnostics", status: "Status and maintenance",
    rooms: "Rooms", tiles: "Tiles", list: "List", schema: "System diagram",
    kpi: "Key figures", history: "History", hist_24: "24 h", hist_7: "7 days", hp_runs: "Heat pump running", hp_per_day: "Heat pump runtime per day", hp_starts: "starts", hp_no_data: "No heat pump data.", heatmap: "Colour = deviation from target",
    off: "Off", eco_summer: "Eco summer", eco_winter: "Eco winter", comfort: "Comfort",
    furnace: "Stove mode", emergency: "Emergency", frost_protection: "Frost protection",
    commissioning: "Commissioning", not_used: "Not used",
    ms_off: "Off", ms_eco_summer: "Summer", ms_eco_winter: "Winter", ms_comfort: "Comfort", ms_furnace: "Furnace", operation: "Operation", fan_stage_l: "Fan stage",
    d_off: "Unit switched off.",
    d_eco_summer: "Economy mode for summer. Fan stage can be chosen freely.",
    d_eco_winter: "Economy mode for winter. Fan stage can be chosen freely.",
    d_comfort: "Comfort mode. Intensive ventilation available.",
    d_furnace: "Operation while a stove is running.",
    readonly: "This state is only reported and cannot be written.",
    locked: "Operating mode cannot be changed right now",
    outdoor_side: "Outdoor side", room_side: "Indoor side", exchanger: "Cross-counterflow heat exchanger",
    fresh: "Fresh air", exhaust: "Exhaust air", extract: "Extract air", supply: "Supply air",
    bypass_open: "Bypass open (automatic)", bypass_closed: "Bypass closed (automatic)",
    probes: "Dots = temperature sensors in the air stream",
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
    heating_n: "PTC on", of: "of", heats: "PTC", fine: "ok",
    actual: "Actual", target: "Target", adjustable: "Adjustable",
    ptc: "PTC element", ptc_active: "active", ptc_off: "off", ptc_enabled: "PTC enabled",
    yes: "yes", no: "no", co2: "CO₂", humidity: "Humidity",
    none: "No unit found. Is the \"Proxon FWT (Modbus)\" integration set up?",
    no_rooms: "No rooms configured.", no_history: "No history data.",
    tab_overview: "Overview", tab_rooms: "Rooms", tab_history: "History", tab_diag: "Diagnostics",
    live_lost: "No connection to the unit", since: "for", hints: "Hints", dismiss: "Dismiss", hidden_n: "{0} hidden", show_again: "show", hidden_note: "Hidden hints return after 24 hours or when the cause is new.",
    go_maint: "Maintenance", go_hist: "Show history", go_diag: "Diagnostics",
    ins_filter_now: "{0}: replace now", ins_filter_now_d: "The unit reports that a filter change is due. Replace both filter drawers (fresh air and extract).",
    ins_filter_soon: "{0} due soon", ins_filter_soon_d: "Day {0} of {1}. Keep two new filters ready (fresh air and extract).",
    ins_shutdown_d: "The unit shuts down by force in {0}. Press \"Filter changed\" after the replacement.", d_one: "1 day", d_n: "{0} days",
    f_age: "Day {0} of {1} · {2} days left", f_unknown: "Change date unknown – press \"Filter changed\" after the next replacement.",
    f_shutdown: "Forced shutdown in {0}", f_age: "Age", f_day_of: "Day {0} of {1}", f_btn: "Filter changed", f_confirm: "Mark the device filter as replaced? Age and deadline start over.",
    ins_cycle_t: "Heat pump cycling often", ins_cycle_d: "{0} starts since midnight. Frequent cycling stresses the compressor.",
    ins_eff_t: "Heat recovery low", ins_eff_d: "Only {0} %. Check the heat exchanger and filters.",
    ins_co2_t: "CO₂ elevated", ins_co2_d: "{0}: {1} ppm. Ventilate or raise the fan stage.",
    ins_ok_t: "All clear", ins_ok_eff: "Heat recovery {0} %.", ins_ok_d: "No errors, filters fine.",
    quick: "Quick actions", boost: "Boost ventilation", boost_end: "End boost ventilation", boost_d_i: "Intensive ventilation on", boost_d_s: "Stage 4 until you end it", boost_d_t: "Then back automatically", boost_until: "until {0}, then back automatically", boost_min: "{0} min",
    all_up: "All rooms +1 °C", all_down: "All rooms −1 °C",
    measure: "Measurements", g_air: "Air", g_circuit: "Refrigerant circuit", g_drive: "Drives",
    maint: "Maintenance and statistics", rt_today: "Runtime today", rt_total: "Runtime total", starts_today: "Starts today", starts_total: "Starts total",
    hist_30: "30 days", m_temp: "Temperatures", runtime: "Heat pump runtime", energy: "Energy per day", day: "day",
    energy_note: "Estimated from the mean daily power (avg W × 24 h).",
    no_stats: "No long-term statistics for this period.",
    year: "Yearly overview", year_sub: "12 months", y_runtime: "Runtime", y_energy: "Energy", y_starts: "Starts", y_note: "Monthly values come from the long-term statistics and fill up over time. Energy is estimated from the mean power.", y_filter: "Filter changed", y_month: "month",
    legend_cool: "cooler than target", legend_ok: "on target", legend_warm: "warmer than target", close: "Close",
    rv_cards: "Cards", rv_cmp: "Compare", rv_list: "List", rf_all: "All", rf_heat: "PTC on", rf_ena: "PTC enabled", rf_dev: "Deviation", rf_co2: "High CO₂",
    rs_avg: "Avg. room temperature", rs_heat: "PTC", rs_active: "on", rs_enabled: "enabled", rs_co2: "Highest CO₂", rs_rf: "Avg. humidity", rs_none: "No rooms match this filter.",
    st_cool: "Below target", st_warm: "Above target", st_ok: "On target", st_heat: "PTC heating", r_t24: "Temperature 24 h", r_ago: "24 h ago", r_now: "now", r_details: "Details",
    r_tapnote: "Tap a room for details", r_noh: "No history available", r_set: "Target {0}°",
    tip_hx: "Cross-counterflow heat exchanger: warm extract air preheats the cold fresh air without mixing them. Heat recovery {0}.",
    tip_comp: "Compressor – details under Diagnostics", tip_fan: "Fan",
    eff_info: "Share of the extract air heat transferred to the fresh air: (supply − fresh) ÷ (extract − fresh). Above 85 % is good.",
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
const METRIC_META = {
  temp: { icon: "mdi:thermometer", unit: "°", label: "m_temp" },
  power: { icon: "mdi:flash", unit: " W", label: "power" },
  comp: { icon: "mdi:engine-outline", unit: " rpm", label: "compressor" },
  eff: { icon: "mdi:percent-circle-outline", unit: " %", label: "efficiency" },
  co2: { icon: "mdi:molecule-co2", unit: " ppm", label: "co2" },
  rf: { icon: "mdi:water-percent", unit: " %", label: "humidity" },
};
const BLUE = "#378ADD", CORAL = "#D85A30", AMBER = "#f2a516", GREEN = "#3fa660";
const BAD = ["unavailable", "unknown", undefined, null, ""];

const CSS = `
:host { display: block; color: var(--primary-text-color); }
* { box-sizing: border-box; }
.ov { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 12px; align-items: start; }
@media (max-width: 1180px) { .ov { grid-template-columns: minmax(0, 1fr); } .ov > .col:last-child { order: -1; } }
.stack { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.top { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 12px; align-items: start; }
.col { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; }
.stack > *, .grid > *, .top > * { min-width: 0; }
ha-card { padding: 14px 16px; display: block; }
.h { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; margin-bottom: 12px; flex-wrap: wrap; }
.h > ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.h .r { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; align-items: center; min-width: 0; }
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
.opw { container-type: inline-size; }
.lbl2 { font-size: 12px; color: var(--secondary-text-color); margin: 12px 0 6px; display: flex; gap: 8px; align-items: center; }
.opw .lbl2:first-of-type { margin-top: 0; }
.seg.cmp { background: var(--secondary-background-color); border-radius: 12px; padding: 4px; gap: 4px; }
.seg.cmp button { display: flex; gap: 6px; align-items: center; justify-content: center; padding: 8px 4px; border-radius: 9px; background: transparent; white-space: nowrap; }
.seg.cmp button ha-icon { display: inline-block; margin: 0; --mdc-icon-size: 18px; }
.seg.cmp button.a { background: var(--card-background-color); box-shadow: 0 1px 3px #0002; border-color: transparent; color: var(--mc, var(--primary-color)); }
.seg.cmp .ls { display: none; }
@container (max-width: 560px) { .seg.cmp.mo button { flex-direction: column; gap: 2px; font-size: 12px; padding: 6px 2px; } .seg.cmp .lf { display: none; } .seg.cmp .ls { display: inline; } }
.oinline { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; font-size: 13px; color: var(--secondary-text-color); }
.oinline .rp { display: inline-flex; gap: 10px; align-items: center; } .oinline .tg { margin-left: auto; display: inline-flex; gap: 8px; align-items: center; color: var(--primary-text-color); }
.tag { font-size: 11px; background: color-mix(in srgb, var(--amber, #e8a13a) 18%, transparent); border-radius: 99px; padding: 2px 8px; }

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
.kpiw { container-type: inline-size; }
.kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
@container (max-width: 640px) { .kpi { grid-template-columns: repeat(2, 1fr); } }
@container (max-width: 520px) { .kpi .ic { width: 30px; height: 30px; } .kpi .k { gap: 8px; } }
.kpi .k { display: flex; gap: 10px; align-items: center; min-width: 0; }
.kpi .k > div:last-child { min-width: 0; }
.kpi .lb { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--divider-color); margin: 0 0 14px; overflow-x: auto; }
.tabbtn { font: inherit; font-size: 14px; display: inline-flex; gap: 6px; align-items: center; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent;
  background: none; color: var(--secondary-text-color); cursor: pointer; white-space: nowrap; }
.tabbtn ha-icon { --mdc-icon-size: 20px; }
.tabbtn.a { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 500; }
.badge { min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #f2a516; color: #fff; font-size: 11px; display: inline-grid; place-items: center; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.logo { width: 38px; height: 38px; border-radius: 11px; background: #fff; display: grid; place-items: center; flex: none; border: 1px solid var(--divider-color); overflow: hidden; }
.logo img { width: 30px; height: 30px; display: block; }
.bt h1 { font-size: 20px; font-weight: 500; margin: 0; line-height: 1.2; }
.sub { font-size: 13px; color: var(--secondary-text-color); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.sub b { font-weight: 500; color: var(--primary-text-color); }
.sub .sep { opacity: .5; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dc, #8a8f98); flex: none; }
.ins { display: flex; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 12px; border-left: 4px solid var(--ic);
  background: color-mix(in srgb, var(--ic) 12%, transparent); }
.ins > ha-icon { --mdc-icon-size: 22px; color: var(--ic); flex: none; }
.ins .it { flex: 1; min-width: 0; display: grid; gap: 2px; }
.ins .it b { font-size: 14px; font-weight: 500; }
.ins .it small { font-size: 12px; color: var(--secondary-text-color); }
.ins .x { font: inherit; border: 0; background: transparent; color: var(--secondary-text-color); cursor: pointer; border-radius: 50%; width: 30px; height: 30px; display: grid; place-items: center; flex: none; }
.ins .x:hover { background: color-mix(in srgb, var(--primary-text-color) 10%, transparent); } .ins .x ha-icon { --mdc-icon-size: 18px; }
.hid { font-size: 12px; color: var(--secondary-text-color); margin: 8px 2px 0; } .hid .lnk { font: inherit; border: 0; background: none; color: var(--primary-color); cursor: pointer; padding: 0; }
.ins.r { --ic: #db4437; } .ins.w { --ic: #f2a516; } .ins.i { --ic: #3d8be0; } .ins.o { --ic: #3fa660; }
.qgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.qa { font: inherit; text-align: left; display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1.5px solid transparent; border-radius: 12px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--primary-text-color); }
.qa ha-icon { --mdc-icon-size: 22px; color: var(--primary-color); flex: none; }
.qa span { display: grid; gap: 1px; } .qa b { font-weight: 500; font-size: 13px; } .qa small { font-size: 11px; color: var(--secondary-text-color); }
.qa.bst { cursor: default; grid-column: span 2; } .qa.bst:hover { border-color: transparent; } .bch { display: flex !important; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.qa:hover { border-color: var(--primary-color); } .qa.a { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
.mchips { display: flex; gap: 6px; flex-wrap: wrap; margin: -2px 0 10px; }
.chw { position: relative; }
.tip { position: absolute; top: 4px; pointer-events: none; z-index: 2; font-size: 12px; padding: 6px 10px; border-radius: 8px; white-space: nowrap;
  background: var(--card-background-color); border: 1px solid var(--divider-color); box-shadow: 0 2px 8px rgba(0,0,0,.18); }
.tip b { font-weight: 600; } .tip > b { display: block; margin-bottom: 2px; }
.tip i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.sk { border-radius: 10px; background: linear-gradient(90deg, var(--secondary-background-color) 25%, color-mix(in srgb, var(--divider-color) 60%, var(--secondary-background-color)) 50%, var(--secondary-background-color) 75%);
  background-size: 200% 100%; animation: sk 1.3s linear infinite; }
@keyframes sk { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
.mtgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 4px 24px; }
.mg { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); margin: 4px 0; }
.mr { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 6px 0; border-top: 1px solid var(--divider-color); }
.mr b { font-weight: 500; font-variant-numeric: tabular-nums; }
.mrow { margin-bottom: 14px; } .mh { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.mh > span { display: flex; align-items: center; gap: 8px; } .mh ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); } .mh b { margin-left: auto; font-weight: 500; }
.pbar { height: 8px; border-radius: 4px; background: var(--secondary-background-color); overflow: hidden; margin-bottom: 4px; }
.pbar i { display: block; height: 100%; border-radius: 4px; }
.msep { border-top: 1px solid var(--divider-color); padding-top: 8px; margin-top: 4px; }
.rtop { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.rtop .grow { flex: 1; }
.rseg { display: inline-flex; background: var(--secondary-background-color); border-radius: 10px; padding: 3px; gap: 2px; }
.rseg button { font: inherit; font-size: 13px; border: 0; background: none; color: var(--secondary-text-color); padding: 6px 12px; border-radius: 8px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.rseg button.a { background: var(--card-background-color); color: var(--primary-text-color); font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
.rseg ha-icon, .fchip ha-icon { --mdc-icon-size: 16px; }
.rfil { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
.fchip { font: inherit; font-size: 13px; cursor: pointer; display: inline-flex; gap: 5px; align-items: center; padding: 5px 12px; border-radius: 99px;
  border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
.fchip.a { background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color)); border-color: var(--primary-color); color: var(--primary-color); }
.rfil .grow { flex: 1; }
.rsum { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 14px; }
.rs { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; background: var(--secondary-background-color); }
.rs .ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none;
  background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); --mdc-icon-size: 22px; }
.rs small { display: block; color: var(--secondary-text-color); font-size: 12px; }
.rs b { font-size: 19px; font-weight: 500; } .rs b span { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
.rgrid { display: grid; grid-template-columns: repeat(var(--rc, 3), minmax(0, 1fr)); gap: 12px; }
.rc { border-radius: 18px; padding: 14px; background: var(--secondary-background-color); border: 1px solid transparent; min-width: 0; container-type: inline-size; }
@container (min-width: 330px) { .rc .rb { flex-direction: row; justify-content: space-around; } }
.rc:hover { border-color: color-mix(in srgb, var(--primary-color) 40%, transparent); }
.rc.open { grid-column: span 2; }
.rh { display: flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0; }
.rh .ri { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; flex: none; background: var(--card-background-color); color: var(--secondary-text-color); --mdc-icon-size: 18px; }
.rh b { font-weight: 500; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rh .st { margin-left: auto; font-size: 12px; display: inline-flex; gap: 3px; align-items: center; padding: 2px 9px; border-radius: 99px; flex: none;
  background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); --mdc-icon-size: 14px; }
.rh .chev { color: var(--secondary-text-color); --mdc-icon-size: 18px; transition: transform .2s; flex: none; }
.rc.open .chev { transform: rotate(180deg); }
.rb { display: flex; flex-direction: column; gap: 8px; align-items: center; margin-top: 6px; }
.rc.open .rb { flex-direction: row; justify-content: space-around; flex-wrap: wrap; }
.ring { position: relative; width: 140px; height: 140px; flex: none; }
.ring svg { width: 100%; height: 100%; display: block; }
.ring .c { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.ring .c b { display: block; font-size: 28px; font-weight: 500; line-height: 1.1; }
.ring .c small { display: block; color: var(--secondary-text-color); font-size: 12px; }
.rctl { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.stp { display: flex; align-items: center; gap: 6px; justify-content: center; }
.stp .t { min-width: 70px; text-align: center; } .stp .t small { display: block; color: var(--secondary-text-color); font-size: 11px; } .stp .t b { font-size: 18px; font-weight: 500; }
.mp { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.mp .chip { margin: 0; }
.rmore { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
.rmore h4 { margin: 0 0 6px; font-size: 12px; font-weight: 500; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .04em; }
.rmore .f { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--divider-color); font-size: 13px; }
.rmore .f:first-of-type { border-top: 0; } .rmore .f b { font-weight: 500; }
.rcmp { display: grid; }
.crow { display: grid; grid-template-columns: 150px minmax(0, 1fr) 110px; gap: 14px; align-items: center; padding: 10px 0; border-top: 1px solid var(--divider-color); cursor: pointer; }
.crow.first { border-top: 0; }
.crow .n { display: flex; gap: 8px; align-items: center; font-weight: 500; min-width: 0; --mdc-icon-size: 18px; }
.crow .n ha-icon { color: var(--secondary-text-color); flex: none; }
.crow .v { text-align: right; } .crow .v b { font-weight: 500; font-size: 16px; } .crow .v small { color: var(--secondary-text-color); margin-left: 4px; }
.axis { position: relative; height: 26px; }
.axis:before { content: ""; position: absolute; left: 0; right: 0; top: 12px; height: 2px; background: var(--divider-color); }
.axis .zero { position: absolute; left: 50%; top: 2px; bottom: 2px; width: 2px; background: var(--secondary-text-color); opacity: .5; }
.axis .bar { position: absolute; top: 7px; height: 12px; border-radius: 6px; background: var(--c); }
.axis .dot { position: absolute; top: 4px; width: 18px; height: 18px; border-radius: 50%; background: var(--c); border: 3px solid var(--card-background-color); transform: translateX(-50%); }
.cscale { display: grid; grid-template-columns: 150px minmax(0, 1fr) 110px; gap: 14px; font-size: 11px; color: var(--secondary-text-color); padding-bottom: 4px; }
.cscale div:nth-child(2) { display: flex; justify-content: space-between; }
.cx { padding: 4px 0 8px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; border-top: 0; }
.cx .rspark { flex: 1; min-width: 220px; max-width: 360px; }
.lrow { display: flex; align-items: center; gap: 10px; }
.lrow .t2 { margin-left: auto; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.lcard { border-radius: 14px; padding: 8px 14px; background: var(--secondary-background-color); margin-bottom: 8px; }
@media (max-width: 640px) {
  .rgrid { grid-template-columns: minmax(0, 1fr); } .rc.open { grid-column: auto; } .rmore { grid-template-columns: 1fr; }
  .rc .rb { flex-direction: row; justify-content: space-around; } .ring { width: 118px; height: 118px; }
  .crow, .cscale { grid-template-columns: 96px minmax(0, 1fr) 66px; gap: 8px; } .crow .v small { display: none; }
  .rsum { grid-template-columns: 1fr 1fr; }
}
.rlegend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--secondary-text-color); margin: 10px 0 0; align-items: center; }
.rlegend span { display: inline-flex; gap: 4px; align-items: center; } .rlegend ha-icon { --mdc-icon-size: 14px; }
.tile .dv { --mdc-icon-size: 14px; }
.hot { cursor: pointer; }
.hot:hover polygon, .hot:hover circle { stroke: var(--primary-color); }
.info { --mdc-icon-size: 14px; vertical-align: -2px; color: var(--secondary-text-color); cursor: help; }
button:focus-visible, [role="button"]:focus-visible, .hot:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 8px; }
@media (max-width: 640px) {
  .panel { padding: 12px 12px 84px; }
  .tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; margin: 0; justify-content: space-around; overflow: visible;
    background: var(--card-background-color); border-top: 1px solid var(--divider-color); border-bottom: 0; padding-bottom: env(safe-area-inset-bottom, 0); }
  .tabbtn { flex: 1; flex-direction: column; gap: 2px; font-size: 11px; padding: 8px 2px 6px; border-bottom: 0; border-top: 2px solid transparent; position: relative; }
  .tabbtn.a { border-top-color: var(--primary-color); }
  .badge { position: absolute; top: 2px; left: 55%; }
  .hm { display: none; }
  .bar-top .vbtn { font-size: 0; padding: 6px 8px; gap: 0; }
  .bt h1 { font-size: 18px; }
}
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
    }).join(",") + `|${this._view}|${this._room}|${h.language}|${this._flip()}|${this._hver || 0}|${this._histRange || "24h"}|${this._metric || ""}|${this._ymetric || ""}|${this._tab || ""}|${this._rview || ""}|${this._rfilter || ""}|${[...(this._ropen || [])].join("+")}|${this._boost ? 1 : 0}|${this._wb || 0}|${this._settingsStamp || 0}|${Object.keys(this._dismissed || {}).join("+")}`;
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
    this._bindChart();
  }

  _wantsHistory() {
    return false;
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
    this._settingsFor = centralId;
    try {
      const all = await this._hass.callWS({ type: "proxon_modbus/settings" });
      this._settings = all.find((e) => e.device_id === centralId) || all[0] || {};
    } catch (err) {
      this._settings = {};
    }
    this._settingsStamp = Date.now();
    if (!this._dismissedLoaded) this._loadDismissed();
    this._update();
  }

  // ---- helpers ----------------------------------------------------------

  _t(key, ...args) {
    const lang = ((this._hass && this._hass.language) || "en").split("-")[0];
    const txt = (TEXT[lang] || TEXT.en)[key] ?? TEXT.en[key] ?? key;
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

  _efficiency() {
    // Exhaust side after the exchanger (before the evaporator): not influenced by the heat pump.
    const c = this._d.central;
    if (this._on(c.bypass_active)) return null; // summer bypass: the exchanger is bypassed, the value would be meaningless
    const f = this._num(c.temp_fresh_air), e = this._num(c.temp_extract_air), x = this._num(c.temp_pre_evaporator);
    if (f === null || e === null || x === null || Math.abs(e - f) < 3) return null;
    return Math.max(0, Math.min(100, Math.round(((e - x) / (e - f)) * 100)));
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
    if (!this._drawerMode && this._on(c.filter_device)) {
      const f = this._filterInfo(c);
      out.push([f.left !== null && f.left <= 7 ? "r" : "w", "mdi:air-filter", `${this._t("filter_device")}: ${this._t("change_due")}${f.left !== null ? ` · ${this._t("f_shutdown", this._days(f.left))}` : ""}`]);
    }
    if (!this._drawerMode && this._recirc() && this._on(c.filter_recirculation)) out.push(["w", "mdi:air-filter", `${this._t("filter_recirc")}: ${this._t("change_due")}`]);
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
      tile("mdi:percent-circle-outline", GREEN, this._t("efficiency"), bypass ? this._t("bypass_short") : eff === null ? null : `${eff} % <span title="${this._t("eff_info")}">${this._icon("mdi:information-outline", 'class="info"')}</span>`) +
      tile("mdi:flash", AMBER, this._t("power"), power === null ? null : this._fmt(power, power % 1 ? 1 : 0),
        (this._state(this._powerId()) || { attributes: {} }).attributes.unit_of_measurement || "W") +
      tile("mdi:weather-partly-cloudy", BLUE, this._t("outside"), this._temp(this._outdoorId()));
    if (!html) return "";
    return `<ha-card>${this._header("mdi:gauge", this._t("kpi"))}<div class="kpiw"><div class="kpi">${html}</div></div></ha-card>`;
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
    // Both fans sit upstream of the exchanger (fresh-air fan after the preheater, extract fan in the extract stream).
    const fan = (cx, id) => {
      const rpm = this._num(id);
      return `<circle cx="${X(cx)}" cy="75" r="15" fill="var(--card-background-color)" stroke="var(--divider-color)"/>
        <g class="${run ? "sp-rot" : ""}"><path d="M${X(cx) - 11} 75H${X(cx) + 11}M${X(cx)} 64V86" stroke="var(--secondary-text-color)" stroke-width="2.5" stroke-linecap="round"/></g>
        <text class="st" x="${X(cx)}" y="50" text-anchor="middle">${rpm === null ? "" : rpm.toLocaleString(this._hass.language) + " rpm"}</text>`;
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
      <g><title>${this._t("tip_hx", this._efficiency() === null ? "–" : this._efficiency() + " %")}</title><polygon points="${[[340, 40], [410, 110], [340, 180], [270, 110]].map(([x, y]) => `${X(x)},${y}`).join(" ")}" fill="var(--card-background-color)" stroke="var(--divider-color)"/></g>
      <g ${bypass ? 'opacity=".25"' : ""}>${L([[305, 75], [340, 110]], BLUE, 1)}${L([[340, 110], [375, 145]], CORAL, 1)}${L([[375, 75], [340, 110]], CORAL, 1)}${L([[340, 110], [305, 145]], BLUE, 1)}</g>
      ${bypass ? L([[92, 75], [250, 75]], BLUE, 0) + `<g opacity=".25">${L([[250, 75], [303, 75]], BLUE, 0, 1)}${L([[377, 145], [430, 145]], CORAL, 0)}</g>` + L([[430, 145], [588, 145]], CORAL, 0, 1)
        : L([[92, 75], [303, 75]], BLUE, 0, 1) + L([[377, 145], [588, 145]], CORAL, 0, 1)}${L([[588, 75], [377, 75]], CORAL, 0, 1)}${L([[303, 145], [92, 145]], BLUE, 0, 1)}
      ${bypass ? L([[250, 75], [250, 48], [430, 48], [430, 143]], BLUE, 1, 1) : ""}
      ${preheat}
      <text class="st" x="${X(340)}" y="198" text-anchor="middle">${this._t("exchanger")}</text>
      ${cool ? coil(190, CORAL, this._t("cond_s"), c.temp_condenser) + coil(490, BLUE, this._t("evap_s"), c.temp_evaporator)
        : coil(190, BLUE, this._t("evap_s"), c.temp_evaporator) + coil(490, CORAL, this._t("cond_s"), c.temp_condenser)}
      ${fan(215, c.fan_speed_supply)}${fan(500, c.fan_speed_extract)}
      ${probe(190, 75, 34, this._t("post_preheat_s"), c.temp_post_preheat, BLUE)}${probe(cool ? 428 : 252, 145, 165, this._t("pre_evap_s"), c.temp_pre_evaporator, BLUE)}${probe(cool ? 252 : 428, 145, 165, this._t("pre_cond_s"), c.temp_pre_condenser, CORAL)}
      ${cool
        ? L([[314, 245], [180, 245], [180, 169]], CORAL, 1) + L([[200, 169], [200, 305], [326, 305]], CORAL, 1) + L([[354, 305], [480, 305], [480, 169]], BLUE, 1) + L([[500, 169], [500, 245], [366, 245]], BLUE, 1)
        : L([[366, 245], [500, 245], [500, 169]], CORAL, 1) + L([[480, 169], [480, 305], [354, 305]], CORAL, 1) + L([[326, 305], [200, 305], [200, 169]], BLUE, 1) + L([[180, 169], [180, 245], [314, 245]], BLUE, 1)}
      <polygon points="${[[354, 305], [340, 297], [326, 305], [340, 313]].map(([x, y]) => `${X(x)},${y}`).join(" ")}" fill="var(--card-background-color)" stroke="var(--divider-color)"/>
      <g class="hot" data-act="tab" data-v="diag" role="button" tabindex="0" aria-label="${this._t("tip_comp")}"><title>${this._t("tip_comp")}</title><circle cx="${X(340)}" cy="245" r="26" fill="var(--card-background-color)" stroke="${BLUE}" stroke-width="1.5"/></g>
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

  // Panel only: operating mode and fan stages in one card (the dashboard card keeps them as separate sections).
  _sec_operation(d) {
    const c = d.central;
    if (!c.operating_mode && !c.fan_stage && !c.fan_auto && !c.fan_intensive) return "";
    // operating mode
    let modeHtml = "", desc = "", cur = null, detail = null, readonly = false;
    if (c.operating_mode) {
      const sel = this._state(c.operating_mode);
      cur = sel && !BAD.includes(sel.state) ? sel.state : null;
      detail = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
      readonly = !cur && detail && !Object.keys(MODE_META).includes(detail);
      const unavail = !!sel && sel.state === "unavailable";
      const changeOk = c.mode_change_possible ? this._on(c.mode_change_possible) || !this._ok(c.mode_change_possible) : true;
      const locked = readonly || unavail || !changeOk;
      const opts = (sel && sel.attributes.options) || Object.keys(MODE_META);
      const banner = readonly
        ? `<div class="banner ${detail === "emergency" ? "r" : "w"}" style="margin-bottom:10px">${this._icon("mdi:alert-outline")}${this._t(detail)} – ${this._t("locked")}</div>` : "";
      const buttons = opts.map((o) => {
        const meta = MODE_META[o] || { icon: "mdi:cog", color: "#8a8f98" };
        return this._btn(`data-act="mode" data-v="${o}"`, cur === o && !locked ? "a" : "",
          `${this._icon(meta.icon)}<span class="lf">${this._t(o)}</span><span class="ls">${this._t(`ms_${o}`)}</span>`, locked, `--mc:${meta.color}`);
      }).join("");
      desc = readonly ? this._t("readonly") : cur ? this._t(`d_${cur}`) : "";
      modeHtml = `${banner}<div class="seg cmp mo" style="grid-template-columns:repeat(${opts.length},1fr)">${buttons}</div>`;
    }
    // fan stages
    let fanHtml = "", current = "";
    if (c.fan_stage || c.fan_auto) {
      const fsel = this._state(c.fan_stage);
      const stageOk = !!fsel && !BAD.includes(fsel.state);
      const autoOn = this._on(c.fan_auto);
      const selectable = (n) => {
        const k = n === 0 ? "fan_off_selectable" : `fan_stage_${n}_selectable`;
        return !c[k] || !this._ok(c[k]) || this._on(c[k]);
      };
      let buttons = FAN_STAGES.map(([opt, , label], i) =>
        this._btn(`data-act="fan" data-v="${opt}"`, stageOk && !autoOn && fsel.state === opt ? "a" : "", label, !stageOk || !selectable(i), `--mc:${BLUE}`)).join("");
      buttons += this._btn(`data-act="fanauto"`, autoOn ? "a" : "", this._t("auto"), !this._ok(c.fan_auto), `--mc:${GREEN}`);
      current = autoOn ? this._t("auto") : stageOk ? `${this._t("stage")} ${FAN_STAGES.find(([o]) => o === fsel.state)?.[2] ?? ""}` : "";
      fanHtml = `<div class="lbl2">${this._t("fan_stage_l")}${!stageOk && c.fan_stage ? `<span class="tag">${this._t("fan_note")}</span>` : ""}</div>
        <div class="seg cmp fs" style="grid-template-columns:repeat(6,1fr)">${buttons}</div>`;
    }
    const rpm = (id, ic) => this._num(id) === null ? "" : `<span>${this._icon(ic, 'class="info"')} ${this._num(id).toLocaleString(this._hass.language)}</span>`;
    const rp = rpm(c.fan_speed_supply, "mdi:arrow-top-right") + rpm(c.fan_speed_extract, "mdi:arrow-bottom-left");
    const intensive = c.fan_intensive ? `<span class="tg">${this._t("intensive")}<ha-switch data-act="intensive" ${this._on(c.fan_intensive) ? "checked" : ""} ${this._ok(c.fan_intensive) ? "" : "disabled"}></ha-switch></span>` : "";
    const inline = rp || intensive ? `<div class="oinline">${rp ? `<span class="rp">${rp}<span>rpm</span></span>` : ""}${intensive}</div>` : "";
    let restore = "";
    if (c.fan_stage_restore) {
      const rs = this._state(c.fan_stage_restore), pref = rs?.attributes?.preferred_stage;
      const prefLabel = FAN_STAGES.find(([o]) => o === pref)?.[2];
      restore = `<div class="row">${this._icon("mdi:fan-clock")}${this._t("fan_restore")}<span class="sp"><ha-switch data-act="restoresw" ${this._on(c.fan_stage_restore) ? "checked" : ""} ${this._ok(c.fan_stage_restore) ? "" : "disabled"}></ha-switch></span></div>
        <div class="note" style="margin-top:2px">${this._t("fan_pref")}: ${prefLabel ? `${this._t("stage")} ${prefLabel}` : this._t("fan_pref_none")}</div>`;
    }
    const hp = this._on(c.heat_pump_cooling) ? this._t("hp_cooling") : this._on(c.heat_pump_heating) ? this._t("hp_heating") : this._t("hp_idle");
    const right = [c.heat_pump_heating ? hp : "", current].filter(Boolean).join(" · ");
    return `<ha-card class="opw">${this._header("mdi:tune-variant", this._t("operation"), right)}
      ${c.operating_mode ? `<div class="lbl2">${this._t("mode")}</div>` : ""}${modeHtml}${fanHtml}${inline}
      ${desc ? `<div class="note">${desc}</div>` : ""}${restore}</ha-card>`;
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

  // Filter age and forced-shutdown deadline as extra lines under the filter row of the status section.
  _filterDetail(c) {
    const f = this._filterInfo(c);
    if (!f.known && f.left === null) return "";
    const age = f.known ? `<div class="row">${this._icon("mdi:calendar-clock")}${this._t("f_age")}<b>${this._t("f_day_of", String(Math.round(f.age)), String(f.iv))}</b></div>` : "";
    const left = f.left !== null ? `<div class="row">${this._icon("mdi:timer-alert-outline")}${this._t("f_shutdown", this._days(f.left))}</div>` : "";
    const btn = c.filter_changed && (f.due || f.known) ? `<div class="row"><button class="vbtn" data-act="filterchg">${this._icon("mdi:check")}${this._t("f_btn")}</button></div>` : "";
    return age + left + btn;
  }

  _sec_status(d) {
    const c = d.central;
    const prob = (id, label, okText, badText, icon) => this._ok(id)
      ? `<div class="row">${this._icon(icon)}${label}<b style="color:${this._on(id) ? "#c98400" : GREEN}">${this._on(id) ? badText : okText}</b></div>` : "";
    const change = c.mode_change_possible && this._ok(c.mode_change_possible)
      ? `<div class="row">${this._icon("mdi:shuffle-variant")}${this._t("mode_change")}<b>${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}</b></div>` : "";
    const html = prob(c.error_system, this._t("error"), this._t("no_error"), this._t("has_error"), "mdi:check-circle-outline") +
      prob(c.filter_device, this._t("filter_device"), this._t("ok"), this._t("change_due"), "mdi:air-filter") + this._filterDetail(c) +
      (this._recirc() ? prob(c.filter_recirculation, this._t("filter_recirc"), this._t("ok"), this._t("change_due"), "mdi:air-filter") : "") + change;
    if (!html) return "";
    return `<ha-card>${this._header("mdi:shield-check-outline", this._t("status"))}${html.replace('class="row"', 'class="row first"')}</ha-card>`;
  }

  _roomDetail(sel) {
    const a = sel.s.attributes;
    const unavailable = sel.s.state === "unavailable";
    return `<div class="det"><div class="dtop"><div class="cur"><div class="lb" style="font-weight:400">${sel.r.name} · ${this._t("actual")}</div>${sel.cur == null ? "–" : this._fmt(sel.cur) + "°"}</div>
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
  }

  _sec_rooms(d) {
    const rooms = d.rooms;
    if (!rooms.length) return `<ha-card>${this._header("mdi:home-outline", this._t("rooms"))}<div class="note">${this._t("no_rooms")}</div></ha-card>`;
    if (this._room >= rooms.length) this._room = 0;
    const info = rooms.map((r) => {
      const s = this._state(r.climate) || { attributes: {}, state: "unavailable" };
      const cur = s.attributes.current_temperature, tgt = s.attributes.temperature;
      const dev = cur != null && tgt != null ? cur - tgt : 0;
      const heats = this._on(r.ents.ptc_active); // rooms are not heated or cooled individually, only by the PTC element
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
        <div class="n">${this._icon(this._roomIcon(i.r.name))}${i.r.name}${Math.abs(i.dev) > 0.3 ? this._icon(i.dev < 0 ? "mdi:arrow-down" : "mdi:arrow-up", 'class="dv"') : ""}</div><div class="t">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</div>
        <div class="lb">${this._t("target")} ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</div>
        <div class="chips"><span class="chip ${i.heats ? "w" : "g"}">${this._icon(i.heats ? "mdi:fire" : "mdi:check")}${i.heats ? this._t("heats") : this._t("fine")}</span>
        ${i.ptcA ? `<span class="chip w">${this._icon("mdi:lightning-bolt")}PTC</span>` : ""}
        ${i.co2 != null ? `<span class="chip ${co2c(i.co2)}">${this._icon("mdi:molecule-co2")}${Math.round(i.co2)}</span>` : ""}</div></button>`).join("")}</div>`;
    } else {
      list = info.map((i, n) => `<div class="rw ${n === this._room ? "s" : ""}" style="${tint(i)}" role="button" tabindex="0" data-act="room" data-v="${n}">
        <span>${this._icon(this._roomIcon(i.r.name))}${i.r.name}</span><span class="lb">${[i.co2 != null ? `${Math.round(i.co2)} ppm` : "", i.rf != null ? `${Math.round(i.rf)} %` : ""].filter(Boolean).join(" · ")}</span>
        <span class="chip ${i.heats ? "w" : "g"}">${i.heats ? this._t("heats") : this._t("fine")}</span>
        <b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"} <span class="lb">→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</span></b></div>`).join("");
    }
    const det = this._drawerMode ? "" : this._roomDetail(info[this._room]);
    return `<ha-card><div class="h">${this._icon("mdi:home-outline")}${this._t("rooms")}<span class="lb" style="margin-left:6px">${heating} ${this._t("of")} ${rooms.length} ${this._t("heating_n")}</span>
      <span class="r"><span class="lb">${this._t("heatmap")}</span>
      <button class="vbtn ${this._view === "tiles" ? "a" : ""}" data-act="view" data-v="tiles">${this._icon("mdi:view-grid-outline")}${this._t("tiles")}</button>
      <button class="vbtn ${this._view === "list" ? "a" : ""}" data-act="view" data-v="list">${this._icon("mdi:format-list-bulleted")}${this._t("list")}</button></span></div>${list}<div class="rlegend"><span>${this._icon("mdi:arrow-down")}${this._t("legend_cool")}</span><span>${this._icon("mdi:check")}${this._t("legend_ok")}</span><span>${this._icon("mdi:arrow-up")}${this._t("legend_warm")}</span></div>${det}</ha-card>`;
  }

  // Merge the "on" periods of one or more binary sensors into [start, end] intervals (seconds).
  _intervals(res, ids, t1) {
    const all = [];
    for (const id of ids) {
      let on = null;
      for (const p of res[id] || []) {
        const t = p.lu ?? Date.parse(p.last_updated) / 1000, st = p.s ?? p.state;
        if (isNaN(t)) continue;
        if (st === "on" && on === null) on = t;
        else if (st !== "on" && on !== null) { all.push([on, t]); on = null; }
      }
      if (on !== null) all.push([on, t1]);
    }
    all.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of all) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }
    return merged;
  }

  // Heat pump runtime and starts per day for the last 7 days, from the recorder history.
  _hpBars() {
    const iv = this._hpIv;
    if (!iv) return `<div class="note">${this._t("hp_no_data")}</div>`;
    const lang = this._hass.language, now = Date.now() / 1000;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - i);
      const a = d0.getTime() / 1000, b = Math.min(now, a + 86400);
      let sec = 0, starts = 0;
      for (const [s0, s1] of iv) {
        sec += Math.max(0, Math.min(s1, b) - Math.max(s0, a));
        if (s0 >= a && s0 < a + 86400 && s0 > this._hpT0 + 60) starts++;
      }
      days.push({ label: d0.toLocaleDateString(lang, { weekday: "short" }), h: sec / 3600, starts });
    }
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 150, pt = 22, pb = 34;
    const max = Math.max(4, Math.ceil(Math.max(...days.map((d) => d.h))));
    const slot = (W - 16) / days.length, bw = Math.min(46, slot * 0.6);
    const bars = days.map((d, i) => {
      const cx = 8 + slot * (i + 0.5), bh = (d.h / max) * (H - pt - pb), y = H - pb - bh;
      return `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(bh, d.h > 0 ? 2 : 0)}" rx="4" fill="#3fa660" opacity="${i === days.length - 1 ? 1 : 0.7}"/>
        <text class="st" x="${cx}" y="${y - 5}" text-anchor="middle" style="font-size:11px">${d.h.toLocaleString(lang, { maximumFractionDigits: 1 })} h</text>
        <text class="st" x="${cx}" y="${H - 18}" text-anchor="middle" style="font-size:11px">${d.label}</text>
        <text class="st" x="${cx}" y="${H - 5}" text-anchor="middle" style="font-size:10px;opacity:.75">${d.starts}×</text>`;
    }).join("");
    return `<svg style="max-width:100%" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("hp_per_day")}">
      <line x1="8" x2="${W - 8}" y1="${H - pb}" y2="${H - pb}" stroke="var(--divider-color)" stroke-width=".8"/>${bars}</svg>
      <div class="legend"><span><i style="background:#3fa660"></i>${this._t("hp_per_day")} · ${this._t("hp_starts")}</span></div>`;
  }

  // ---- history: data ----------------------------------------------------

  // Cached async loader: returns the cached value, `undefined` while the first load runs, `null` on failure.
  _hget(key, loader) {
    const cache = (this._hc = this._hc || {});
    const e = cache[key];
    if (e && (e.busy || Date.now() - e.t < 300000)) return e.v;
    cache[key] = { t: e ? e.t : 0, v: e ? e.v : undefined, busy: true };
    const done = (v) => {
      cache[key] = { t: Date.now(), v };
      this._hver = (this._hver || 0) + 1;
      this._update();
    };
    loader().then(done, () => done(null));
    return cache[key].v;
  }

  _metricDefs(d, m) {
    const c = d.central, out = this._outdoorId();
    const pal = ["#3d8be0", "#e0562b", "#3fa660", "#f2a516", "#7e57c2", "#14998e", "#d6336c", "#8a8f98"];
    const keep = (arr) => arr.filter(([id], i, a) => id && a.findIndex((x) => x[0] === id) === i);
    switch (m) {
      case "temp": return keep([[c.temp_supply_air, this._t("supply_t"), CORAL], [c.temp_extract_air, this._t("extract"), AMBER],
        [c.temp_fresh_air, this._t("fresh"), BLUE], [out, this._t("outside"), "#7e57c2"]]);
      case "power": return keep([[this._powerId(), this._t("power"), AMBER]]);
      case "comp": return keep([[c.compressor_speed, this._t("compressor"), "#3d8be0"]]);
      case "eff": return c.temp_pre_evaporator && c.temp_extract_air && c.temp_fresh_air
        ? [[c.temp_pre_evaporator, "s", CORAL], [c.temp_extract_air, "e", AMBER], [c.temp_fresh_air, "f", BLUE]] : [];
      case "co2": return d.rooms.filter((r) => r.co2).map((r, i) => [r.co2, r.name, pal[i % pal.length]]);
      case "rf": return d.rooms.filter((r) => r.rf).map((r, i) => [r.rf, r.name, pal[i % pal.length]]);
    }
    return [];
  }

  static _down(pts, n) {
    if (pts.length <= n) return pts;
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0], w = (t1 - t0) / n || 1;
    const buckets = new Map();
    for (const [t, v] of pts) {
      const k = Math.min(n - 1, Math.floor((t - t0) / w)), b = buckets.get(k) || [0, 0, 0];
      b[0] += t; b[1] += v; b[2]++; buckets.set(k, b);
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => [b[0] / b[2], b[1] / b[2]]);
  }

  static _at(pts, t) {
    if (!pts.length) return null;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= t) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi];
    if (t <= a[0]) return a[1];
    if (t >= b[0]) return b[1];
    return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0] || 1);
  }

  async _loadSeries(range, metric, defs) {
    const ms = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 }[range];
    const end = new Date(), start = new Date(end.getTime() - ms), ids = defs.map(([id]) => id);
    let raw;
    if (range === "30d") {
      const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        statistic_ids: ids, period: "hour", types: ["mean"] });
      raw = defs.map(([id]) => (res[id] || []).map((r) => [r.start / 1000, Number(r.mean)]).filter(([t, v]) => !isNaN(t) && !isNaN(v)));
    } else {
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      raw = defs.map(([id]) => (res[id] || []).map((p) => [p.lu ?? Date.parse(p.last_updated) / 1000, Number(p.s ?? p.state)]).filter(([t, v]) => !isNaN(t) && !isNaN(v)));
    }
    if (metric === "eff") {
      const [S, E, F] = raw, pts = [];
      for (const [t, s] of S) {
        const e = ProxonFwtBase._at(E, t), f = ProxonFwtBase._at(F, t);
        if (e === null || f === null || Math.abs(e - f) < 3) continue;
        const v = ((e - s) / (e - f)) * 100;
        if (v >= 0 && v <= 110) pts.push([t, v]);
      }
      return [{ label: this._t("efficiency"), color: GREEN, pts: ProxonFwtBase._down(pts, 360) }];
    }
    return defs.map(([, label, color], i) => ({ label, color, pts: ProxonFwtBase._down(raw[i], 360) }));
  }

  async _loadHp(d) {
    const c = d.central, ids = [c.heat_pump_heating, c.heat_pump_cooling].filter(Boolean);
    if (!ids.length) { this._hpIv = null; return null; }
    const end = new Date(), start = new Date(end.getTime() - 7 * 864e5);
    const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
    this._hpT0 = start.getTime() / 1000;
    this._hpIv = this._intervals(res, ids, end.getTime() / 1000);
    return this._hpIv;
  }

  // Daily runtime, starts, outdoor temperature and mean power for 30 days from the long-term statistics.
  async _loadRun(d) {
    const c = d.central, out = this._outdoorId(), pw = this._powerId();
    const ids = [c.hp_runtime_total, c.hp_starts_total, out, pw].filter(Boolean);
    if (!ids.length) return null;
    const end = new Date(), start = new Date(end.getTime() - 30 * 864e5);
    const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      statistic_ids: ids, period: "day", types: ["mean", "change"] });
    const days = new Map();
    const put = (id, field, key) => {
      for (const r of res[id] || []) {
        const v = Number(r[field]);
        if (isNaN(v)) continue;
        const day = days.get(r.start) || { t: r.start / 1000 };
        day[key] = v; days.set(r.start, day);
      }
    };
    if (c.hp_runtime_total) put(c.hp_runtime_total, "change", "h");
    if (c.hp_starts_total) put(c.hp_starts_total, "change", "starts");
    if (out) put(out, "mean", "out");
    if (pw) put(pw, "mean", "w");
    return [...days.values()].sort((a, b) => a.t - b.t);
  }

  // Monthly runtime, starts, outdoor temperature and mean power for 12 months from the long-term statistics.
  async _loadYear(d) {
    const c = d.central, out = this._outdoorId(), pw = this._powerId();
    const ids = [c.hp_runtime_total, c.hp_starts_total, out, pw].filter(Boolean);
    if (!ids.length) return null;
    const end = new Date(), start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      statistic_ids: ids, period: "month", types: ["mean", "change"] });
    const months = new Map();
    const put = (id, field, key) => {
      for (const r of res[id] || []) {
        const v = Number(r[field]);
        if (isNaN(v)) continue;
        const m = months.get(r.start) || { t: r.start / 1000 };
        m[key] = v; months.set(r.start, m);
      }
    };
    if (c.hp_runtime_total) put(c.hp_runtime_total, "change", "h");
    if (c.hp_starts_total) put(c.hp_starts_total, "change", "starts");
    if (out) put(out, "mean", "out");
    if (pw) put(pw, "mean", "w");
    const list = [...months.values()].sort((a, b) => a.t - b.t), now = Date.now() / 1000;
    list.forEach((m, i) => {
      const next = i + 1 < list.length ? list[i + 1].t : now;
      if (m.w !== undefined) m.kwh = (m.w * Math.max(0, next - m.t)) / 3600 / 1000;
    });
    return list;
  }

  _sec_year(d) {
    const c = d.central;
    if (!c.hp_runtime_total && !c.hp_starts_total && !this._powerId()) return "";
    const months = this._hget("year", () => this._loadYear(d));
    if (months === null) return "";
    const avail = [["h", "y_runtime", "mdi:timer-outline", "#3fa660", "h"], ["kwh", "y_energy", "mdi:lightning-bolt-outline", AMBER, "kWh"], ["starts", "y_starts", "mdi:repeat", BLUE, ""]]
      .filter(([k]) => months === undefined || months.some((m) => m[k] !== undefined));
    if (months !== undefined && !avail.length) return `<ha-card>${this._header("mdi:calendar-month-outline", this._t("year"), this._t("year_sub"))}<div class="note">${this._t("no_stats")}</div></ha-card>`;
    const cur = avail.find(([k]) => k === this._ymetric) || avail[0];
    const chips = avail.length > 1 ? `<div class="mchips" role="group">${avail.map(([k, l, ic]) => `<button class="vbtn ${k === cur[0] ? "a" : ""}" data-act="ymetric" data-v="${k}">${this._icon(ic)}${this._t(l)}</button>`).join("")}</div>` : "";
    return `<ha-card>${this._header("mdi:calendar-month-outline", this._t("year"), this._t("year_sub"))}${chips}${months === undefined ? this._skel(190) : this._yearChart(months, cur, d)}</ha-card>`;
  }

  _yearChart(months, [key, label, , color, unit], d) {
    const lang = this._hass.language;
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 190, pl = 40, pr = 34, pt = 12, pb = 22;
    const vals = months.map((m) => m[key] || 0), max = Math.max(1, Math.ceil(Math.max(...vals) * 1.05));
    const outs = months.filter((m) => m.out !== undefined).map((m) => m.out);
    const oLo = outs.length ? Math.floor(Math.min(...outs) - 1) : 0, oHi = outs.length ? Math.ceil(Math.max(...outs) + 1) : 1;
    const slot = (W - pl - pr) / months.length, bw = Math.max(6, slot * 0.6);
    const X = (i) => pl + slot * (i + 0.5), Y = (v) => pt + (1 - v / max) * (H - pt - pb), Yo = (v) => pt + (1 - (v - oLo) / Math.max(1, oHi - oLo)) * (H - pt - pb);
    const mf = (t) => new Date(t * 1000).toLocaleDateString(lang, { month: "short" });
    const mfl = (t) => new Date(t * 1000).toLocaleDateString(lang, { month: "long", year: "numeric" });
    const fmt = (v) => v.toLocaleString(lang, { maximumFractionDigits: v < 10 ? 1 : 0 });
    // The month in which the device filter was last changed (age + now)
    const age = this._num(d.central.filter_age_days), chg = age === null ? null : Date.now() / 1000 - age * 86400;
    const bars = months.map((m, i) => {
      const v = m[key] || 0, f = chg !== null && chg >= m.t && (i + 1 >= months.length || chg < months[i + 1].t);
      return `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - pb - Y(v)).toFixed(1)}" rx="3" fill="${color}" opacity=".8">
        <title>${mfl(m.t)}: ${fmt(v)} ${unit}${m.out !== undefined ? ` · Ø ${m.out.toLocaleString(lang, { maximumFractionDigits: 1 })} °C` : ""}</title></rect>
        ${f ? `<g><title>${this._t("y_filter")}</title><circle cx="${X(i).toFixed(1)}" cy="${H - pb + 0}" r="4.5" fill="var(--card-background-color)" stroke="${CORAL}" stroke-width="1.6"/></g>` : ""}`;
    }).join("");
    const gl = [0, 1, 2, 3].map((i) => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" y2="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
      <text class="st" x="${pl - 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${Math.round(max * (1 - i / 3))}</text>
      ${outs.length ? `<text class="st" x="${W - pr + 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" style="font-size:11px">${Math.round(oHi - ((oHi - oLo) * i) / 3)}°</text>` : ""}`).join("");
    const xt = months.map((m, i) => `<text class="st" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" style="font-size:11px">${mf(m.t)}</text>`).join("");
    const pts = months.map((m, i) => m.out === undefined ? null : `${X(i).toFixed(1)},${Yo(m.out).toFixed(1)}`).filter(Boolean).join(" ");
    const sum = vals.reduce((a, b) => a + b, 0);
    return `<svg style="max-width:100%;height:auto" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("year")}">${gl}${bars}
      ${pts ? `<polyline fill="none" stroke="#7e57c2" stroke-width="1.8" stroke-linejoin="round" points="${pts}"/>` : ""}${xt}</svg>
      <div class="legend"><span><i style="background:${color}"></i>${this._t(label)}${unit ? ` (${unit})` : ""}</span>${outs.length ? `<span><i style="background:#7e57c2"></i>${this._t("outside")} (°C)</span>` : ""}
      ${chg !== null && chg >= months[0].t ? `<span><i style="background:none;border:2px solid ${CORAL}"></i>${this._t("y_filter")}</span>` : ""}
      <span>Σ ${fmt(sum)} ${unit}</span></div><div class="note">${this._t("y_note")}</div>`;
  }

  _skel(h) {
    return `<div class="sk" style="height:${h}px"></div>`;
  }

  // ---- history: sections ------------------------------------------------

  _range() {
    return this._histRange === "7d" || this._histRange === "30d" ? this._histRange : "24h";
  }

  _sec_history(d) {
    const range = this._range();
    const avail = Object.keys(METRIC_META).filter((m) => this._metricDefs(d, m).length);
    if (!avail.length) return "";
    const metric = avail.includes(this._metric) ? this._metric : avail[0];
    const defs = this._metricDefs(d, metric);
    this._hget("hp", () => this._loadHp(d));
    const series = this._hget(`s|${range}|${metric}`, () => this._loadSeries(range, metric, defs));
    let body;
    if (series === undefined) body = this._skel(190);
    else if (!series || !series.some((s) => s.pts.length > 1)) body = `<div class="note">${this._t(range === "30d" ? "no_stats" : "no_history")}</div>`;
    else body = this._chart(series, { range, unit: METRIC_META[metric].unit, bands: range !== "30d" });
    const rb = (v, l) => `<button class="vbtn ${range === v ? "a" : ""}" data-act="hrange" data-v="${v}">${l}</button>`;
    const chips = avail.length > 1 ? `<div class="mchips" role="group">${avail.map((m) => `<button class="vbtn ${m === metric ? "a" : ""}" data-act="metric" data-v="${m}">${this._icon(METRIC_META[m].icon)}${this._t(METRIC_META[m].label)}</button>`).join("")}</div>` : "";
    return `<ha-card><div class="h">${this._icon("mdi:chart-line")}${this._t("history")}
      <span class="r">${rb("24h", this._t("hist_24"))}${rb("7d", this._t("hist_7"))}${rb("30d", this._t("hist_30"))}</span></div>${chips}${body}</ha-card>`;
  }

  _sec_runtime(d) {
    const c = d.central;
    if (!c.heat_pump_heating && !c.hp_runtime_total) return "";
    let body, sub;
    if (this._range() === "30d") {
      const days = this._hget("run", () => this._loadRun(d));
      sub = this._t("hist_30");
      body = days === undefined ? this._skel(190)
        : days && days.some((x) => x.h !== undefined) ? this._runChart(days) : `<div class="note">${this._t("no_stats")}</div>`;
    } else {
      this._hget("hp", () => this._loadHp(d));
      sub = this._t("hist_7");
      body = this._hpBars();
    }
    return `<ha-card>${this._header("mdi:heat-pump-outline", this._t("runtime"), sub)}${body}</ha-card>`;
  }

  _sec_energy(d) {
    if (!this._powerId()) return "";
    const days = this._hget("run", () => this._loadRun(d));
    if (days === null || (days && !days.some((x) => x.w !== undefined))) return "";
    return `<ha-card>${this._header("mdi:lightning-bolt-outline", this._t("energy"), this._t("hist_30"))}${days === undefined ? this._skel(150) : this._energyChart(days)}</ha-card>`;
  }

  // ---- history: charts --------------------------------------------------

  _chart(series, o) {
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 190, pl = 42, pr = 10, pt = 10, pb = 22;
    const lang = this._hass.language;
    const ms = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 }[o.range] / 1000;
    const t1 = Date.now() / 1000, t0 = t1 - ms;
    const vals = series.flatMap((s) => s.pts.map((p) => p[1]));
    let mn = Math.min(...vals), mx = Math.max(...vals);
    const raw = Math.max(1e-6, mx - mn) / 3, p10 = 10 ** Math.floor(Math.log10(raw)), f = raw / p10;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p10;
    let lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step;
    if (hi - lo < step * 2) hi = lo + step * 2;
    const x = (t) => pl + ((t - t0) / (t1 - t0)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const dec = step < 1 ? 1 : 0;
    let grid = "";
    for (let v = lo; v <= hi + step / 2; v += step) {
      grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
        <text class="st" x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${v.toLocaleString(lang, { minimumFractionDigits: dec, maximumFractionDigits: dec })}</text>`;
    }
    const ticks = [];
    if (o.range === "24h") for (let i = 0; i <= 4; i++) ticks.push(t0 + ((t1 - t0) * i) / 4);
    else {
      const every = o.range === "7d" ? 1 : W < 420 ? 10 : 5;
      const dd = new Date(t0 * 1000); dd.setHours(24, 0, 0, 0);
      for (; dd.getTime() / 1000 <= t1; dd.setDate(dd.getDate() + every)) ticks.push(dd.getTime() / 1000);
    }
    const tl = (t) => o.range === "24h" ? new Date(t * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
      : o.range === "7d" ? new Date(t * 1000).toLocaleDateString(lang, { weekday: "short" })
        : new Date(t * 1000).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
    const xt = ticks.map((t) => `<text class="st" x="${x(t).toFixed(1)}" y="${H - 5}" text-anchor="${x(t) > W - 24 ? "end" : "middle"}" style="font-size:11px">${tl(t)}</text>`).join("");
    const bands = o.bands ? (this._hpIv || []).map(([a, b]) => {
      const s0 = Math.max(a, t0), s1 = Math.min(b, t1);
      return s1 > s0 ? `<rect x="${x(s0).toFixed(1)}" y="${pt}" width="${Math.max(1, x(s1) - x(s0)).toFixed(1)}" height="${H - pt - pb}" fill="#3fa660" opacity=".14"/>` : "";
    }).join("") : "";
    const lines = series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" points="${s.pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`).join("");
    const legend = series.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("");
    const showBands = o.bands && this._hpIv && this._hpIv.length;
    this._cm = { W, H, pl, pr, pt, pb, t0, t1, lo, hi, series, unit: o.unit, range: o.range, x, y };
    return `<div class="chw"><svg class="ch" style="max-width:100%;height:auto;touch-action:pan-y" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("history")}">
      ${bands}${grid}${lines}${xt}<line class="xl" y1="${pt}" y2="${H - pb}" stroke="var(--secondary-text-color)" stroke-width="1" stroke-dasharray="3 3" style="display:none"/><g class="xd"></g>
      <rect class="ov" x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent"/></svg><div class="tip" style="display:none"></div></div>
      <div class="legend">${legend}${showBands ? `<span><i style="background:#3fa660;opacity:.4"></i>${this._t("hp_runs")}</span>` : ""}</div>`;
  }

  _bindChart() {
    const svg = this.shadowRoot.querySelector("svg.ch"), m = this._cm;
    if (!svg || !m) return;
    const tip = svg.parentElement.querySelector(".tip"), xl = svg.querySelector(".xl"), xd = svg.querySelector(".xd");
    const lang = this._hass.language;
    const hide = () => { xl.style.display = "none"; xd.innerHTML = ""; tip.style.display = "none"; };
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (m.W / r.width);
      if (px < m.pl || px > m.W - m.pr) return hide();
      const t = m.t0 + ((px - m.pl) / (m.W - m.pl - m.pr)) * (m.t1 - m.t0);
      const rows = m.series.map((s) => {
        let best = null;
        for (const p of s.pts) if (best === null || Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
        return best && Math.abs(best[0] - t) < (m.t1 - m.t0) / 8 ? { s, p: best } : null;
      }).filter(Boolean);
      if (!rows.length) return hide();
      const fx = m.x(rows[0].p[0]);
      xl.setAttribute("x1", fx); xl.setAttribute("x2", fx); xl.style.display = "";
      xd.innerHTML = rows.map(({ s, p }) => `<circle cx="${fx}" cy="${m.y(p[1])}" r="3.5" fill="${s.color}" stroke="var(--card-background-color)" stroke-width="1.5"/>`).join("");
      const when = new Date(rows[0].p[0] * 1000);
      const wl = m.range === "24h" ? when.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
        : when.toLocaleString(lang, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      tip.innerHTML = `<b>${wl}</b>${rows.map(({ s, p }) => `<div><i style="background:${s.color}"></i>${s.label} <b>${p[1].toLocaleString(lang, { maximumFractionDigits: 1 })}${m.unit}</b></div>`).join("")}`;
      tip.style.display = "block";
      const left = (fx / m.W) * r.width;
      tip.style.left = `${Math.max(0, Math.min(r.width - tip.offsetWidth, left + 12))}px`;
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerdown", move);
    svg.addEventListener("pointerleave", hide);
  }

  // Bars for daily runtime with the mean outdoor temperature as a line on the right axis.
  _runChart(days) {
    const lang = this._hass.language;
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 190, pl = 34, pr = 34, pt = 12, pb = 22;
    const hs = days.map((x) => x.h || 0), maxH = Math.max(4, Math.ceil(Math.max(...hs)));
    const outs = days.filter((x) => x.out !== undefined).map((x) => x.out);
    const oLo = outs.length ? Math.floor(Math.min(...outs) - 1) : 0, oHi = outs.length ? Math.ceil(Math.max(...outs) + 1) : 1;
    const slot = (W - pl - pr) / days.length, bw = Math.max(3, slot * 0.62);
    const X = (i) => pl + slot * (i + 0.5), Yh = (v) => pt + (1 - v / maxH) * (H - pt - pb), Yo = (v) => pt + (1 - (v - oLo) / Math.max(1, oHi - oLo)) * (H - pt - pb);
    const df = (t) => new Date(t * 1000).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
    const bars = days.map((x, i) => `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Yh(x.h || 0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - pb - Yh(x.h || 0)).toFixed(1)}" rx="2" fill="#3fa660" opacity=".75">
      <title>${df(x.t)}: ${(x.h || 0).toLocaleString(lang, { maximumFractionDigits: 1 })} h${x.starts !== undefined ? ` · ${Math.round(x.starts)} ${this._t("hp_starts")}` : ""}${x.out !== undefined ? ` · Ø ${x.out.toLocaleString(lang, { maximumFractionDigits: 1 })} °C` : ""}</title></rect>`).join("");
    const pts = days.map((x, i) => x.out === undefined ? null : `${X(i).toFixed(1)},${Yo(x.out).toFixed(1)}`).filter(Boolean).join(" ");
    const gl = [0, 1, 2, 3].map((i) => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" y2="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
      <text class="st" x="${pl - 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${Math.round(maxH * (1 - i / 3))}</text>
      ${outs.length ? `<text class="st" x="${W - pr + 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" style="font-size:11px">${Math.round(oHi - ((oHi - oLo) * i) / 3)}°</text>` : ""}`).join("");
    const xt = days.map((x, i) => i % Math.ceil(days.length / (W < 420 ? 4 : 8)) === 0 ? `<text class="st" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" style="font-size:11px">${df(x.t)}</text>` : "").join("");
    const sumH = hs.reduce((a, b) => a + b, 0), avgO = outs.length ? outs.reduce((a, b) => a + b, 0) / outs.length : null;
    return `<svg style="max-width:100%;height:auto" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("runtime")}">${gl}${bars}
      ${pts ? `<polyline fill="none" stroke="#7e57c2" stroke-width="1.8" stroke-linejoin="round" points="${pts}"/>` : ""}${xt}</svg>
      <div class="legend"><span><i style="background:#3fa660"></i>${this._t("runtime")} (h)</span>${outs.length ? `<span><i style="background:#7e57c2"></i>${this._t("outside")} (°C)</span>` : ""}
      <span>Σ ${sumH.toLocaleString(lang, { maximumFractionDigits: 0 })} h${avgO === null ? "" : ` · Ø ${this._t("outside")} ${avgO.toLocaleString(lang, { maximumFractionDigits: 1 })} °C`}</span></div>`;
  }

  _energyChart(days) {
    const lang = this._hass.language;
    const data = days.filter((x) => x.w !== undefined).map((x) => ({ t: x.t, kwh: (x.w * 24) / 1000 }));
    if (!data.length) return `<div class="note">${this._t("no_stats")}</div>`;
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 150, pl = 34, pr = 10, pt = 12, pb = 22;
    const max = Math.max(1, Math.ceil(Math.max(...data.map((x) => x.kwh)))), slot = (W - pl - pr) / data.length, bw = Math.max(3, slot * 0.62);
    const X = (i) => pl + slot * (i + 0.5), Y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const df = (t) => new Date(t * 1000).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
    const bars = data.map((x, i) => `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(x.kwh).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - pb - Y(x.kwh)).toFixed(1)}" rx="2" fill="${AMBER}" opacity=".85">
      <title>${df(x.t)}: ${x.kwh.toLocaleString(lang, { maximumFractionDigits: 1 })} kWh</title></rect>`).join("");
    const gl = [0, 1, 2].map((i) => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ((H - pt - pb) * i) / 2).toFixed(1)}" y2="${(pt + ((H - pt - pb) * i) / 2).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
      <text class="st" x="${pl - 6}" y="${(pt + ((H - pt - pb) * i) / 2 + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${Math.round(max * (1 - i / 2))}</text>`).join("");
    const xt = data.map((x, i) => i % Math.ceil(data.length / (W < 420 ? 4 : 8)) === 0 ? `<text class="st" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" style="font-size:11px">${df(x.t)}</text>` : "").join("");
    const sum = data.reduce((a, b) => a + b.kwh, 0);
    return `<svg style="max-width:100%;height:auto" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("energy")}">${gl}${bars}${xt}</svg>
      <div class="legend"><span><i style="background:${AMBER}"></i>kWh</span><span>Σ ${sum.toLocaleString(lang, { maximumFractionDigits: 0 })} kWh · Ø ${(sum / data.length).toLocaleString(lang, { maximumFractionDigits: 1 })} kWh/${this._t("day")}</span></div>
      <div class="note">${this._t("energy_note")}</div>`;
  }

  // ---- panel-only sections ---------------------------------------------

  _subline(d) {
    if (!d) return "";
    const c = d.central, st = c.heat_pump_heating && this._state(c.heat_pump_heating);
    const mode = this._state(c.operating_mode);
    if (mode && mode.state === "unavailable") return `<span class="dot" style="--dc:#db4437"></span><b>${this._t("live_lost")}</b>`;
    const cool = this._on(c.heat_pump_cooling), heat = this._on(c.heat_pump_heating);
    const label = cool ? this._t("hp_cooling") : heat ? this._t("hp_heating") : this._t("hp_idle");
    const modeKey = mode && !BAD.includes(mode.state) ? mode.state : this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    let since = "";
    if ((cool || heat) && st && st.last_changed) {
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(st.last_changed)) / 60000));
      since = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    }
    return `<span class="dot" style="--dc:${cool ? BLUE : heat ? GREEN : "#8a8f98"}"></span><b>${label}</b>${modeKey ? `<span class="sep">·</span>${this._t(modeKey)}` : ""}${since ? `<span class="sep hm">·</span><span class="hm">${this._t("since")} ${since}</span>` : ""}`;
  }

  _insightsAll(d) {
    const c = d.central, out = [], f = this._filterInfo(c);
    if (f.due) {
      const near = f.left !== null && f.left <= 7;
      out.push({ key: "filter_now", lvl: near ? "r" : "w", icon: "mdi:air-filter", title: this._t("ins_filter_now", this._t("filter_device")),
        text: f.left !== null ? this._t("ins_shutdown_d", this._days(f.left)) : this._t("ins_filter_now_d"), tab: "diag", go: "go_maint" });
    } else if (f.known && f.age >= f.iv - 14) {
      out.push({ key: "filter_soon", lvl: "w", icon: "mdi:air-filter", title: this._t("ins_filter_soon", this._t("filter_device")),
        text: this._t("ins_filter_soon_d", String(Math.round(f.age)), String(f.iv)), tab: "diag", go: "go_maint" });
    }
    if (this._recirc() && this._on(c.filter_recirculation)) {
      out.push({ key: "filter_recirc", lvl: "w", icon: "mdi:air-filter", title: this._t("ins_filter_now", this._t("filter_recirc")), text: this._t("ins_filter_now_d"), tab: "diag", go: "go_maint" });
    }
    const starts = this._num(c.hp_starts_today);
    if (starts !== null && starts >= 8) out.push({ key: "cycle", lvl: "i", icon: "mdi:repeat", title: this._t("ins_cycle_t"), text: this._t("ins_cycle_d", String(Math.round(starts))), tab: "history", go: "go_hist" });
    const eff = this._efficiency();
    if (eff !== null && eff < 75 && !this._on(c.bypass_active)) out.push({ key: "eff", lvl: "w", icon: "mdi:percent-circle-outline", title: this._t("ins_eff_t"), text: this._t("ins_eff_d", String(eff)), tab: "diag", go: "go_diag" });
    const hi = d.rooms.map((r) => ({ r, v: this._num(r.co2) })).filter((x) => x.v !== null && x.v > 1000).sort((a, b) => b.v - a.v)[0];
    if (hi) out.push({ key: `co2|${hi.r.name}`, lvl: "w", icon: "mdi:molecule-co2", title: this._t("ins_co2_t"), text: this._t("ins_co2_d", hi.r.name, String(Math.round(hi.v))), tab: "rooms", go: "tab_rooms" });
    if (!out.length) {
      const bits = [eff !== null ? this._t("ins_ok_eff", String(eff)) : "", this._t("ins_ok_d")].filter(Boolean).join(" ");
      out.push({ lvl: "o", icon: "mdi:check-circle-outline", title: this._t("ins_ok_t"), text: bits });
    }
    const rank = { r: 0, w: 1, i: 2, o: 3 };
    return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]);
  }

  // ---- dismissing hints --------------------------------------------------
  // Warnings and infos can be hidden for 24 hours (kept in the Home Assistant user profile, so it
  // follows the user across devices); errors cannot. A hint whose cause went away is forgotten.

  _dismissable(i) {
    return !!i.key && i.lvl !== "r" && i.lvl !== "o";
  }

  _isHidden(i) {
    const ts = this._dismissed && this._dismissed[i.key];
    return this._dismissable(i) && ts !== undefined && Date.now() - ts < 864e5;
  }

  _insights(d) {
    const all = this._insightsAll(d);
    this._pruneDismissed(all);
    const vis = all.filter((i) => !this._isHidden(i));
    if (all.length !== vis.length && !vis.length) return [];
    return vis;
  }

  _hiddenInsights(d) {
    return this._insightsAll(d).filter((i) => this._isHidden(i));
  }

  _pruneDismissed(all) {
    if (!this._dismissed || !this._dismissedLoaded) return;
    const live = new Set(all.map((i) => i.key).filter(Boolean));
    let changed = false;
    for (const k of Object.keys(this._dismissed)) {
      if (!live.has(k) || Date.now() - this._dismissed[k] >= 864e5) { delete this._dismissed[k]; changed = true; }
    }
    if (changed) this._saveDismissed();
  }

  async _loadDismissed() {
    this._dismissed = {};
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "proxon_fwt_dismissed" });
      if (r && r.value && typeof r.value === "object") this._dismissed = { ...r.value };
    } catch (e) {
      try { this._dismissed = JSON.parse(localStorage.getItem("proxon_fwt_dismissed") || "{}"); } catch (e2) { /* ignore */ }
    }
    this._dismissedLoaded = true;
    this._sig = "";
    this._update();
  }

  _saveDismissed() {
    try { localStorage.setItem("proxon_fwt_dismissed", JSON.stringify(this._dismissed)); } catch (e) { /* ignore */ }
    this._hass.callWS({ type: "frontend/set_user_data", key: "proxon_fwt_dismissed", value: this._dismissed }).catch(() => {});
  }

  _sec_insights(d) {
    const ins = this._insights(d).slice(0, 3), hidden = this._hiddenInsights(d);
    const items = ins.map((i) => `<div class="ins ${i.lvl}">${this._icon(i.icon)}<div class="it"><b>${i.title}</b><small>${i.text}</small></div>
      ${i.tab ? `<button class="vbtn" data-act="tab" data-v="${i.tab}">${this._t(i.go)}</button>` : ""}
      ${this._dismissable(i) ? `<button class="x" data-act="dismiss" data-v="${i.key}" title="${this._t("dismiss")}" aria-label="${this._t("dismiss")}">${this._icon("mdi:close")}</button>` : ""}</div>`).join("");
    const more = hidden.length
      ? `<div class="hid"><span title="${this._t("hidden_note")}">${this._t("hidden_n", String(hidden.length))}</span> · <button class="lnk" data-act="undismiss">${this._t("show_again")}</button></div>` : "";
    if (!items && !more) return "";
    return `<ha-card>${this._header("mdi:lightbulb-on-outline", this._t("hints"))}<div class="alerts">${items}</div>${more}</ha-card>`;
  }

  _boostMode(c) {
    if (c.boost && this._state(c.boost) && this._state(c.boost).state !== "unavailable") return "timer"; // handled by the integration, with automatic return
    if (c.fan_intensive && this._on(c.intensive_ventilation_selectable)) return "intensive";
    const sel = this._state(c.fan_stage);
    if (c.fan_stage && sel && !BAD.includes(sel.state) && (!c.fan_stage_4_selectable || this._on(c.fan_stage_4_selectable))) return "stage";
    return null;
  }

  _sec_quick(d) {
    const c = d.central, mode = this._boostMode(c);
    const btns = [];
    if (mode) {
      let active, sub;
      if (mode === "timer") {
        const st = this._state(c.boost), until = st.attributes.until ? new Date(st.attributes.until) : null;
        active = st.state === "on";
        if (!active) {
          const dflt = Number(st.attributes.duration_minutes) || 30;
          const chips = [15, 30, 60].map((m) => `<button class="fchip ${m === dflt ? "a" : ""}" data-act="boostmin" data-v="${m}">${this._t("boost_min", String(m))}</button>`).join("");
          btns.push(`<div class="qa bst">${this._icon("mdi:weather-windy")}<span><b>${this._t("boost")}</b><small>${this._t("boost_d_t")}</small><span class="bch">${chips}</span></span></div>`);
          sub = null;
        } else {
          sub = until ? this._t("boost_until", until.toLocaleTimeString(this._hass.language, { hour: "2-digit", minute: "2-digit" })) : "";
        }
      } else {
        active = mode === "intensive" ? this._on(c.fan_intensive) : !!this._boost && this._state(c.fan_stage).state === "stage_4";
        sub = this._t(mode === "intensive" ? "boost_d_i" : "boost_d_s");
      }
      if (sub !== null) btns.push(`<button class="qa ${active ? "a" : ""}" data-act="boost">${this._icon("mdi:weather-windy")}<span><b>${this._t(active ? "boost_end" : "boost")}</b><small>${sub}</small></span></button>`);
    }
    if (d.rooms.length) {
      btns.push(`<button class="qa" data-act="allroom" data-v="1">${this._icon("mdi:thermometer-plus")}<span><b>${this._t("all_up")}</b></span></button>`);
      btns.push(`<button class="qa" data-act="allroom" data-v="-1">${this._icon("mdi:thermometer-minus")}<span><b>${this._t("all_down")}</b></span></button>`);
    }
    if (!btns.length) return "";
    return `<ha-card>${this._header("mdi:flash-outline", this._t("quick"))}<div class="qgrid">${btns.join("")}</div></ha-card>`;
  }

  _sec_measure(d) {
    const c = d.central, lang = this._hass.language;
    const t = (label, id) => this._ok(id) ? [label, this._temp(id)] : null;
    const n = (label, id, unit, dg = 0) => this._ok(id) && this._num(id) !== null ? [label, `${this._fmt(this._num(id), dg)} ${unit}`] : null;
    const groups = [
      [this._t("g_air"), [t(this._t("fresh"), c.temp_fresh_air), t(this._t("exhaust"), c.temp_exhaust_air), t(this._t("extract"), c.temp_extract_air),
        t(this._t("supply"), c.temp_supply_air), t(this._t("outside"), this._outdoorId())]],
      [this._t("g_circuit"), [t(this._t("pre_evaporator"), c.temp_pre_evaporator), t(this._t("evaporator"), c.temp_evaporator), t(this._t("post_preheat"), c.temp_post_preheat),
        t(this._t("pre_condenser"), c.temp_pre_condenser), t(this._t("condenser"), c.temp_condenser), t(this._t("compressor"), c.temp_compressor)]],
      [this._t("g_drive"), [n(this._t("compressor"), c.compressor_speed, "rpm"), n(this._t("supply_fan"), c.fan_speed_supply, "rpm"),
        n(this._t("extract_fan"), c.fan_speed_extract, "rpm"), n(this._t("power_long"), this._powerId(), "W", (this._num(this._powerId()) || 0) % 1 ? 1 : 0)]],
    ].map(([g, rows]) => [g, rows.filter(Boolean)]).filter(([, rows]) => rows.length);
    if (!groups.length) return "";
    return `<ha-card>${this._header("mdi:table", this._t("measure"))}<div class="mtgrid">${groups.map(([g, rows]) => `<div><div class="mg">${g}</div>
      ${rows.map(([l, v]) => `<div class="mr"><span>${l}</span><b>${v}</b></div>`).join("")}</div>`).join("")}</div></ha-card>`;
  }

  _sec_maint(d) {
    const c = d.central, f = this._filterInfo(c);
    const fbar = () => {
      if (!this._ok(c.filter_device) && !f.known) return "";
      const pct = f.known ? Math.min(100, Math.round((f.age / f.iv) * 100)) : (f.due ? 100 : 0);
      const near = f.due && f.left !== null && f.left <= 7;
      const col = near || (!f.due && pct >= 100) ? "#db4437" : f.due || pct >= 90 ? "#f2a516" : GREEN;
      const sub = f.due && f.left !== null ? `<b style="color:${near ? "#db4437" : "#c98400"}">${this._t("f_shutdown", this._days(f.left))}</b>`
        : f.known ? this._t("f_age", String(Math.round(f.age)), String(f.iv), String(Math.max(0, Math.round(f.iv - f.age)))) : this._t("f_unknown");
      const btn = c.filter_changed ? `<button class="vbtn" style="margin-top:8px" data-act="filterchg">${this._icon("mdi:check")}${this._t("f_btn")}</button>` : "";
      return `<div class="mrow"><div class="mh"><span>${this._icon("mdi:air-filter")}${this._t("filter_device")}</span><b style="color:${col}">${f.due ? this._t("change_due") : this._t("ok")}</b></div>
        <div class="pbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%;background:${col}"></i></div>
        <div class="lb">${sub}</div>${btn}</div>`;
    };
    const rbar = () => {
      if (!this._recirc() || !this._ok(c.filter_recirculation)) return "";
      const due = this._on(c.filter_recirculation);
      return `<div class="mrow"><div class="mh"><span>${this._icon("mdi:air-filter")}${this._t("filter_recirc")}</span><b style="color:${due ? "#c98400" : GREEN}">${due ? this._t("change_due") : this._t("ok")}</b></div></div>`;
    };
    const row = (icon, label, val) => val === null ? "" : `<div class="row">${this._icon(icon)}${label}<b>${val}</b></div>`;
    const hv = (id) => this._num(id) === null ? null : `${this._fmt(this._num(id), 1)} h`;
    const iv0 = (id) => this._num(id) === null ? null : this._fmt(this._num(id), 0);
    const err = this._ok(c.error_system) ? `<div class="row">${this._icon("mdi:check-circle-outline")}${this._t("error")}<b style="color:${this._on(c.error_system) ? "#db4437" : GREEN}">${this._on(c.error_system) ? this._t("has_error") : this._t("no_error")}</b></div>` : "";
    const chg = c.mode_change_possible && this._ok(c.mode_change_possible)
      ? `<div class="row">${this._icon("mdi:shuffle-variant")}${this._t("mode_change")}<b>${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}</b></div>` : "";
    const stats = row("mdi:heat-pump", this._t("rt_today"), hv(c.hp_runtime_today)) + row("mdi:counter", this._t("starts_today"), iv0(c.hp_starts_today)) +
      row("mdi:heat-pump-outline", this._t("rt_total"), hv(c.hp_runtime_total)) + row("mdi:counter", this._t("starts_total"), iv0(c.hp_starts_total));
    const filters = fbar() + rbar();
    const html = filters + (err || chg ? `<div class="msep">${(err + chg).replace('class="row"', 'class="row first"')}</div>` : "") + (stats ? `<div class="msep">${stats.replace('class="row"', 'class="row first"')}</div>` : "");
    if (!html) return "";
    return `<ha-card>${this._header("mdi:wrench-outline", this._t("maint"))}${html}</ha-card>`;
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
      case "hrange": this._histRange = v; this._update(); break;
      case "metric": this._metric = v; this._update(); break;
      case "ymetric": this._ymetric = v; this._sig = ""; this._update(); break;
      case "dismiss": this._dismissed = this._dismissed || {}; this._dismissed[v] = Date.now(); this._saveDismissed(); this._sig = ""; this._update(); break;
      case "undismiss": this._dismissed = {}; this._saveDismissed(); this._sig = ""; this._update(); break;
      case "tab": this._tab = v; this._sig = ""; this._update(); if (this.scrollIntoView) this.scrollIntoView({ block: "start" }); break;
      case "rview": this._rview = v; this._sig = ""; this._update(); break;
      case "rfilter": this._rfilter = v; this._sig = ""; this._update(); break;
      case "rtoggle": {
        const id = this._d.rooms[Number(v)].climate;
        this._ropen = this._ropen || new Set();
        if (this._ropen.has(id)) this._ropen.delete(id); else this._ropen.add(id);
        this._sig = ""; this._update(); break;
      }
      case "rstep": {
        const [n, dir] = v.split("|"), id = this._d.rooms[Number(n)].climate, a = (this._state(id) || {}).attributes || {};
        const step = a.target_temp_step || 1;
        call("climate", "set_temperature", { entity_id: id, temperature: Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 18, (a.temperature ?? a.current_temperature ?? 21) + Number(dir) * step)) });
        break;
      }
      case "rptc": call("switch", "toggle", { entity_id: this._d.rooms[Number(v)].ents.ptc_enable }); break;
      case "boost": this._toggleBoost(); break;
      case "boostmin": { const c = this._d.central; if (c.boost) this._hass.callService("proxon_modbus", "start_boost", { entity_id: c.boost, minutes: Number(v) }); break; }
      case "allroom": for (const r of this._d.rooms) {
        const a = (this._state(r.climate) || {}).attributes || {};
        if (a.temperature == null) continue;
        call("climate", "set_temperature", { entity_id: r.climate, temperature: Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 18, a.temperature + Number(v))) });
      } break;
      case "filterchg": if (c.filter_changed && window.confirm(this._t("f_confirm"))) call("button", "press", { entity_id: c.filter_changed }); break;
      case "restoresw": call("switch", "toggle", { entity_id: c.fan_stage_restore }); break;
      case "intensive": call("switch", "toggle", { entity_id: c.fan_intensive }); break;
      case "coolsw": call("switch", "toggle", { entity_id: c.cooling_enable }); break;
      case "ptc": call("switch", "toggle", { entity_id: this._d.rooms[this._room].ents.ptc_enable }); break;
      case "view": this._view = v; this._sig = ""; this._update(); break;
      case "room": this._room = Number(v); this._sig = ""; this._update(); break;
      case "menu": this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); break;
      case "up": case "down": {
        const id = this._d.rooms[this._room].climate, a = this._state(id).attributes;
        const step = a.target_temp_step || 1;
        const next = Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 18, (a.temperature ?? a.current_temperature ?? 21) + (act === "up" ? step : -step)));
        call("climate", "set_temperature", { entity_id: id, temperature: next });
        break;
      }
    }
  }

  _toggleBoost() {
    const c = this._d.central, h = this._hass;
    const mode = this._boostMode(c);
    if (mode === "timer") { h.callService("switch", this._on(c.boost) ? "turn_off" : "turn_on", { entity_id: c.boost }); return; }
    if (mode === "intensive") { h.callService("switch", this._on(c.fan_intensive) ? "turn_off" : "turn_on", { entity_id: c.fan_intensive }); return; }
    if (mode !== "stage") return;
    if (this._boost) {
      const b = this._boost;
      this._boost = null;
      try { localStorage.removeItem("proxon_fwt_boost"); } catch (e) { /* ignore */ }
      h.callService("select", "select_option", { entity_id: c.fan_stage, option: b.stage });
      if (b.auto) h.callService("switch", "turn_on", { entity_id: c.fan_auto });
    } else {
      this._boost = { stage: this._state(c.fan_stage).state, auto: this._on(c.fan_auto) };
      try { localStorage.setItem("proxon_fwt_boost", JSON.stringify(this._boost)); } catch (e) { /* ignore */ }
      if (this._boost.auto) h.callService("switch", "turn_off", { entity_id: c.fan_auto });
      h.callService("select", "select_option", { entity_id: c.fan_stage, option: "stage_4" });
    }
    this._sig = ""; this._update();
  }

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
    return this._config.sections.some((x) => ["history", "runtime", "energy"].includes(x));
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
    this._drawerMode = true;
    try { this._boost = JSON.parse(localStorage.getItem("proxon_fwt_boost") || "null"); } catch (e) { this._boost = null; }
    this._config = { max_fan_rpm: 3000, max_compressor_rpm: 6000 };
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

  // ---- rooms tab --------------------------------------------------------

  _roomInfo(r) {
    const s = this._state(r.climate) || { attributes: {}, state: "unavailable" };
    const a = s.attributes, cur = a.current_temperature, tgt = a.temperature;
    const dev = cur != null && tgt != null ? cur - tgt : 0;
    const heats = this._on(r.ents.ptc_active); // rooms are not heated or cooled individually, only by the PTC element
    const col = Math.abs(dev) <= 0.3 ? GREEN : dev < 0 ? BLUE : CORAL;
    const st = heats ? [this._t("st_heat"), "mdi:fire", CORAL] : Math.abs(dev) <= 0.3 ? [this._t("st_ok"), "mdi:check", GREEN]
      : dev < 0 ? [this._t("st_cool"), "mdi:arrow-down", BLUE] : [this._t("st_warm"), "mdi:arrow-up", CORAL];
    return { r, s, a, cur, tgt, dev, heats, col, st, down: s.state === "unavailable", co2: this._num(r.co2), rf: this._num(r.rf),
      ptcA: this._on(r.ents.ptc_active), ptcE: r.ents.ptc_enable };
  }

  _ring(i) {
    const R0 = 62, C = 2 * Math.PI * R0, arc = C * 0.75, f = (v) => Math.max(0, Math.min(1, (v - 16) / 12));
    const rot = "rotate(135 75 75)";
    const rad = ((i.tgt == null ? 0 : f(i.tgt)) * 270 + 135) * Math.PI / 180;
    const mark = i.tgt == null ? "" : `<circle cx="${75 + R0 * Math.cos(rad)}" cy="${75 + R0 * Math.sin(rad)}" r="7" fill="var(--card-background-color)" stroke="var(--primary-text-color)" stroke-width="2.5"/>`;
    return `<div class="ring"><svg viewBox="0 0 150 150" aria-hidden="true">
      <circle cx="75" cy="75" r="${R0}" fill="none" stroke="var(--card-background-color)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${arc} ${C}" transform="${rot}"/>
      ${i.cur == null ? "" : `<circle cx="75" cy="75" r="${R0}" fill="none" stroke="${i.col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${Math.max(0.1, arc * f(i.cur))} ${C}" transform="${rot}"/>`}${mark}</svg>
      <div class="c"><div><b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</b><small>${this._t("actual")}</small></div></div></div>`;
  }

  _stepper(n, i) {
    return `<div class="stp">${this._btn(`data-act="rstep" data-v="${n}|-1" aria-label="−"`, "round", this._icon("mdi:minus"), i.down)}
      <div class="t"><small>${this._t("target")}</small><b>${i.tgt == null ? "–" : this._fmt(i.tgt, i.tgt % 1 ? 1 : 0) + "°"}</b></div>
      ${this._btn(`data-act="rstep" data-v="${n}|1" aria-label="+"`, "round", this._icon("mdi:plus"), i.down)}</div>`;
  }

  _roomChips(i) {
    const c = (v) => (v > 1000 ? "r" : v > 800 ? "w" : "g");
    return `${i.co2 != null ? `<span class="chip ${c(i.co2)}">${this._icon("mdi:molecule-co2")}${Math.round(i.co2)}</span>` : ""}${i.rf != null ? `<span class="chip">${this._icon("mdi:water-percent")}${Math.round(i.rf)} %</span>` : ""}${i.ptcA ? `<span class="chip w">${this._icon("mdi:radiator")}PTC</span>` : ""}`;
  }

  // 24 h room temperature with target line, loaded on demand from the recorder history of the climate entity.
  _roomSpark(i) {
    const id = i.r.climate;
    const data = this._hget(`rt|${id}`, async () => {
      const end = new Date(), start = new Date(end.getTime() - 864e5);
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: [id], include_start_time_state: true, significant_changes_only: false });
      const pts = [], tg = [];
      for (const p of res[id] || []) {
        const t = p.lu ?? Date.parse(p.last_updated) / 1000, at = p.a || p.attributes || {};
        if (isNaN(t)) continue;
        if (at.current_temperature != null) pts.push([t, Number(at.current_temperature)]);
        if (at.temperature != null) tg.push([t, Number(at.temperature)]);
      }
      return { pts: ProxonFwtBase._down(pts, 120), tg, t0: start.getTime() / 1000, t1: end.getTime() / 1000 };
    });
    if (data === undefined) return this._skel(84);
    if (!data || data.pts.length < 2) return `<div class="note">${this._t("r_noh")}</div>`;
    const W = 300, H = 70, vals = data.pts.map((p) => p[1]).concat(i.tgt == null ? [] : [i.tgt]);
    const lo = Math.min(...vals) - 0.4, hi = Math.max(...vals) + 0.4, y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const x = (t) => ((t - data.t0) / (data.t1 - data.t0)) * W;
    const line = data.pts.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
    const last = data.pts[data.pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H + 14}" style="width:100%;height:auto" role="img" aria-label="${this._t("r_t24")}">
      ${i.tgt == null ? "" : `<line x1="0" x2="${W}" y1="${y(i.tgt)}" y2="${y(i.tgt)}" stroke="var(--secondary-text-color)" stroke-dasharray="4 4" opacity=".6"/><text x="${W}" y="${Math.max(10, y(i.tgt) - 4)}" text-anchor="end" font-size="10" fill="var(--secondary-text-color)">${this._t("r_set", this._fmt(i.tgt, 0))}</text>`}
      <polyline fill="none" stroke="${i.col}" stroke-width="2.2" stroke-linejoin="round" points="${line}"/>
      <circle cx="${x(last[0])}" cy="${y(last[1])}" r="4" fill="${i.col}"/>
      <text x="0" y="${H + 12}" font-size="10" fill="var(--secondary-text-color)">${this._t("r_ago")}</text><text x="${W}" y="${H + 12}" text-anchor="end" font-size="10" fill="var(--secondary-text-color)">${this._t("r_now")}</text></svg>`;
  }

  _roomFacts(n, i) {
    const a = i.a;
    return `<div><h4>${this._t("r_details")}</h4>
      ${a.min_temp != null ? `<div class="f"><span>${this._t("adjustable")}</span><b>${this._fmt(a.min_temp, 0)}–${this._fmt(a.max_temp, 0)} °C</b></div>` : ""}
      ${i.co2 != null ? `<div class="f"><span>${this._t("co2")}</span><b>${Math.round(i.co2)} ppm</b></div>` : ""}
      ${i.rf != null ? `<div class="f"><span>${this._t("humidity")}</span><b>${Math.round(i.rf)} %</b></div>` : ""}
      ${i.r.ents.ptc_active ? `<div class="f"><span>${this._t("ptc")}</span><b>${i.ptcA ? this._t("ptc_active") : this._t("ptc_off")}</b></div>` : ""}
      ${i.ptcE ? `<div class="f"><span>${this._t("ptc_enabled")}</span><ha-switch data-act="rptc" data-v="${n}" ${this._on(i.ptcE) ? "checked" : ""} ${this._ok(i.ptcE) ? "" : "disabled"}></ha-switch></div>` : ""}</div>`;
  }

  _roomCard(n, i) {
    const o = this._ropen.has(i.r.climate);
    return `<div class="rc ${o ? "open" : ""}"><div class="rh" role="button" tabindex="0" aria-expanded="${o}" data-act="rtoggle" data-v="${n}">
      <span class="ri">${this._icon(this._roomIcon(i.r.name))}</span><b>${i.r.name}</b>
      <span class="st" style="--c:${i.st[2]}">${this._icon(i.st[1])}${i.st[0]}</span><span class="chev">${this._icon("mdi:chevron-down")}</span></div>
      <div class="rb">${this._ring(i)}<div class="rctl">${this._stepper(n, i)}<div class="mp">${this._roomChips(i)}</div></div></div>
      ${o ? `<div class="rmore"><div><h4>${this._t("r_t24")}</h4>${this._roomSpark(i)}</div>${this._roomFacts(n, i)}</div>` : ""}</div>`;
  }

  _roomCmp(rows) {
    return `<div class="rcmp"><div class="cscale"><div></div><div><span>−2 °C</span><span>${this._t("target")}</span><span>+2 °C</span></div><div></div></div>
      ${rows.map(([n, i], k) => {
        const pct = Math.max(-1, Math.min(1, i.dev / 2)) * 50, o = this._ropen.has(i.r.climate);
        return `<div class="crow ${k === 0 ? "first" : ""}" style="--c:${i.col}" role="button" tabindex="0" aria-expanded="${o}" data-act="rtoggle" data-v="${n}">
          <div class="n">${this._icon(this._roomIcon(i.r.name))}${i.r.name}</div>
          <div class="axis"><div class="zero"></div><div class="bar" style="left:${pct < 0 ? 50 + pct : 50}%;width:${Math.abs(pct)}%"></div><div class="dot" style="left:${50 + pct}%"></div></div>
          <div class="v"><b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</b><small>→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</small></div></div>
          ${o ? `<div class="cx">${this._stepper(n, i)}<div class="rspark">${this._roomSpark(i)}</div><div class="mp">${this._roomChips(i)}</div></div>` : ""}`;
      }).join("")}</div>`;
  }

  _roomList(rows) {
    return rows.map(([n, i]) => {
      if (this._ropen.has(i.r.climate)) return `<div style="margin-bottom:8px;--rc:1" class="rgrid">${this._roomCard(n, i).replace('class="rc open"', 'class="rc open" style="grid-column:1/-1"')}</div>`;
      return `<div class="lcard"><div class="rh lrow" role="button" tabindex="0" aria-expanded="false" data-act="rtoggle" data-v="${n}"><span class="ri">${this._icon(this._roomIcon(i.r.name))}</span><b>${i.r.name}</b>
        <span class="t2">${this._roomChips(i)}<b style="color:${i.col}">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</b><span class="lb">→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</span></span></div></div>`;
    }).join("");
  }

  // Even rows: as many columns as fit, but never a short last row if fewer columns spread the cards better.
  _roomCols(n) {
    const w = (this.clientWidth || 900) - 32, max = Math.max(1, Math.min(6, Math.floor((w + 12) / 262)));
    return Math.ceil(n / Math.ceil(n / max)) || 1;
  }

  _sec_rooms(d) {
    if (!d.rooms.length) return `<ha-card>${this._header("mdi:home-outline", this._t("rooms"))}<div class="note">${this._t("no_rooms")}</div></ha-card>`;
    this._ropen = this._ropen || new Set();
    const view = ["cards", "cmp", "list"].includes(this._rview) ? this._rview : "cards";
    const filter = ["all", "heat", "ena", "dev", "co2"].includes(this._rfilter) ? this._rfilter : "all";
    const all = d.rooms.map((r, n) => [n, this._roomInfo(r)]);
    const temps = all.filter(([, i]) => i.cur != null), rfs = all.filter(([, i]) => i.rf != null), cos = all.filter(([, i]) => i.co2 != null);
    const avg = temps.length ? temps.reduce((a, [, i]) => a + i.cur, 0) / temps.length : null;
    const top = cos.sort((a, b) => b[1].co2 - a[1].co2)[0];
    const arf = rfs.length ? rfs.reduce((a, [, i]) => a + i.rf, 0) / rfs.length : null;
    const sum = (ic, c, label, val, unit) => `<div class="rs" style="--c:${c}"><span class="ic">${this._icon(ic)}</span><div><small>${label}</small><b>${val}<span>${unit}</span></b></div></div>`;
    const summary = `<div class="rsum">${avg === null ? "" : sum("mdi:thermometer", BLUE, this._t("rs_avg"), this._fmt(avg), " °C")}
      ${sum("mdi:fire", CORAL, this._t("rs_heat"), all.filter(([, i]) => i.heats).length, ` ${this._t("rs_active")} · ${all.filter(([, i]) => i.ptcE && this._on(i.ptcE)).length} ${this._t("rs_enabled")}`)}
      ${top ? sum("mdi:molecule-co2", AMBER, this._t("rs_co2"), Math.round(top[1].co2), ` ppm · ${top[1].r.name}`) : ""}
      ${arf === null ? "" : sum("mdi:water-percent", "var(--primary-color)", this._t("rs_rf"), Math.round(arf), " %")}</div>`;
    let rows = all.filter(([, i]) => filter === "all" || (filter === "heat" && i.heats) || (filter === "ena" && i.ptcE && this._on(i.ptcE)) || (filter === "dev" && Math.abs(i.dev) > 0.3) || (filter === "co2" && i.co2 != null && i.co2 > 800));
    if (filter === "dev") rows = rows.sort((a, b) => Math.abs(b[1].dev) - Math.abs(a[1].dev));
    const seg = [["cards", "mdi:view-grid-outline"], ["cmp", "mdi:chart-bar"], ["list", "mdi:format-list-bulleted"]]
      .map(([k, ic]) => `<button class="${k === view ? "a" : ""}" data-act="rview" data-v="${k}" aria-pressed="${k === view}">${this._icon(ic)}${this._t(`rv_${k}`)}</button>`).join("");
    const chips = [["all", ""], ["heat", "mdi:fire"], ["ena", "mdi:fire-circle"], ["dev", "mdi:swap-vertical"], ["co2", "mdi:molecule-co2"]]
      .map(([k, ic]) => `<button class="fchip ${k === filter ? "a" : ""}" data-act="rfilter" data-v="${k}" aria-pressed="${k === filter}">${ic ? this._icon(ic) : ""}${this._t(`rf_${k}`)}</button>`).join("");
    const body = !rows.length ? `<div class="note" style="text-align:center;padding:18px">${this._t("rs_none")}</div>`
      : view === "cards" ? `<div class="rgrid" style="--rc:${this._roomCols(rows.length)}">${rows.map(([n, i]) => this._roomCard(n, i)).join("")}</div>`
      : view === "cmp" ? this._roomCmp(rows) : this._roomList(rows);
    return `<ha-card><div class="rtop"><div class="h" style="margin:0">${this._icon("mdi:home-outline")}${this._t("rooms")}</div><span class="grow"></span><div class="rseg" role="group">${seg}</div></div>
      ${summary}<div class="rfil">${chips}<span class="grow"></span>
      <button class="fchip" data-act="allroom" data-v="-1">${this._icon("mdi:thermometer-minus")}${this._t("all_down")}</button>
      <button class="fchip" data-act="allroom" data-v="1">${this._icon("mdi:thermometer-plus")}${this._t("all_up")}</button></div>
      ${body}<div class="rlegend"><span style="color:${BLUE}">${this._icon("mdi:arrow-down")}${this._t("legend_cool")}</span><span style="color:${GREEN}">${this._icon("mdi:check")}${this._t("legend_ok")}</span><span style="color:${CORAL}">${this._icon("mdi:arrow-up")}${this._t("legend_warm")}</span><span>${this._icon("mdi:gesture-tap")}${this._t("r_tapnote")}</span></div></ha-card>`;
  }

  _render() {
    const d = this._d;
    const tab = ["overview", "rooms", "history", "diag"].includes(this._tab) ? this._tab : "overview";
    const bad = d ? this._insights(d).filter((i) => i.lvl === "r" || i.lvl === "w") : [];
    const warn = (k) => bad.filter((i) => i.tab === k).length; // each hint counts on the tab it leads to
    const tabs = [["overview", "mdi:view-dashboard-outline"], ["rooms", "mdi:home-outline"], ["history", "mdi:chart-line"], ["diag", "mdi:stethoscope"]]
      .map(([k, i]) => `<button class="tabbtn ${k === tab ? "a" : ""}" role="tab" aria-selected="${k === tab}" data-act="tab" data-v="${k}">${this._icon(i)}${this._t(`tab_${k}`)}${warn(k) ? `<span class="badge">${warn(k)}</span>` : ""}</button>`).join("");
    const head = `<div class="bar-top">
      <button class="round menu" data-act="menu" aria-label="Menu">${this._icon("mdi:menu")}</button>
      <div class="brand"><span class="logo"><img src="/proxon_modbus/icon.png" alt="" width="30" height="30"></span><div class="bt"><h1>Proxon FWT</h1><div class="sub">${this._subline(d)}</div></div></div><div class="grow"></div>
</div>
      <nav class="tabs" role="tablist">${tabs}</nav>`;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else if (tab === "overview") {
      body = `<div class="stack">${this._sec_alerts(d)}
        <div class="ov"><div class="col">${this._sec_schema(d)}${this._sec_kpi(d)}</div><div class="col">${this._sec_operation(d)}${this._sec_quick(d)}</div></div></div>`;
    } else if (tab === "rooms") {
      body = `<div class="stack">${this._sec_rooms(d)}</div>`;
    } else if (tab === "history") {
      body = `<div class="stack">${this._sec_history(d)}${this._sec_runtime(d)}${this._sec_energy(d)}${this._sec_year(d)}</div>`;
    } else {
      body = `<div class="stack"><div class="top"><div class="col">${this._sec_heatpump(d)}${this._sec_measure(d)}</div><div class="col">${this._sec_maint(d)}</div></div>${this._sec_insights(d)}</div>`;
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
    preview: false,
    documentationURL: "https://github.com/bertel2020/HA-Proxon_FWT#dashboard-karte",
  });
}

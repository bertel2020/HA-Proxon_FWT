// Shared constants and small helpers.
// The card's sections in their fixed order. Alerts are not a section: they show above everything whenever something is wrong.
export const SECTION_ORDER = ["overview", "operation", "schema", "rooms", "status", "refrigerant", "history", "runtime", "energy"];
// Older section names keep working: they map onto the current ones (null = gone).
export const SECTION_ALIASES = { heatpump: "overview", kpi: "overview", mode: "operation", fan: "operation", quick: "operation", air: "schema", alerts: null };
export const PRESETS = {
  compact: ["overview", "operation"],
  standard: ["overview", "operation", "schema", "rooms", "status"],
  all: SECTION_ORDER,
};
export const DEFAULT_SECTIONS = PRESETS.standard;
export const ALL_SECTIONS = [...SECTION_ORDER, ...Object.keys(SECTION_ALIASES)];
export const GRID_SECTIONS = ["status", "refrigerant"];
export const LAYOUTS = ["stacked", "tabs"];
// Tabs of the tabbed layout: which sections each one shows.
export const TAB_GROUPS = [
  ["overview", ["overview", "operation", "schema"], "mdi:gauge"],
  ["rooms", ["rooms"], "mdi:home-outline"],
  ["maintenance", ["status", "refrigerant"], "mdi:tools"],
  ["history", ["history", "runtime", "energy"], "mdi:chart-line"],
];

// The sections of a card config: an explicit list (custom), else the preset (standard by default); old names mapped, duplicates dropped, fixed order.
export function resolveSections(config) {
  const raw = config.sections !== undefined ? config.sections : PRESETS[config.preset] || DEFAULT_SECTIONS;
  if (!Array.isArray(raw) || raw.some((s) => !ALL_SECTIONS.includes(s))) {
    throw new Error(`sections must be a list of: ${ALL_SECTIONS.join(", ")}`);
  }
  const mapped = new Set(raw.map((s) => (s in SECTION_ALIASES ? SECTION_ALIASES[s] : s)).filter(Boolean));
  return SECTION_ORDER.filter((s) => mapped.has(s));
}

export const MODE_META = {
  off: { icon: "mdi:power", color: "#8a8f98" },
  eco_summer: { icon: "mdi:weather-sunny", color: "#f2a516" },
  eco_winter: { icon: "mdi:snowflake", color: "#3d8be0" },
  comfort: { icon: "mdi:sofa", color: "#3fa660" },
  furnace: { icon: "mdi:fireplace", color: "#e0562b" },
};
export const FAN_STAGES = [
  ["off", "mdi:fan-off", "0"], ["stage_1", "mdi:fan-speed-1", "1"], ["stage_2", "mdi:fan-speed-2", "2"],
  ["stage_3", "mdi:fan-speed-3", "3"], ["stage_4", "mdi:fan-plus", "4"],
];
export const ROOM_ICONS = [
  [/wohn|living/i, "mdi:sofa"], [/küche|kueche|kitchen/i, "mdi:silverware-fork-knife"],
  [/schlaf|bed/i, "mdi:bed"], [/kind|child|kid/i, "mdi:teddy-bear"], [/bad|bath|dusche|wc/i, "mdi:shower"],
  [/büro|buero|office|arbeit/i, "mdi:desk"], [/flur|diele|hall/i, "mdi:door-open"],
  [/keller|cellar/i, "mdi:stairs-down"], [/gäste|gaeste|guest/i, "mdi:bed-double"], [/ess|dining/i, "mdi:table-furniture"],
];
export const METRIC_META = {
  all: { icon: "mdi:chart-multiple", unit: "", label: "tw_all" },
  temp: { icon: "mdi:thermometer", unit: "°", label: "m_temp" },
  circuit: { icon: "mdi:thermometer-lines", unit: "°", label: "g_circuit" },
  drives: { icon: "mdi:engine-outline", unit: " rpm", label: "g_drive" },
  power: { icon: "mdi:flash", unit: " W", label: "power" },
  ptc: { icon: "mdi:radiator", unit: " W", label: "ptc_short" },
  eff: { icon: "mdi:percent-circle-outline", unit: " %", label: "efficiency" },
  co2: { icon: "mdi:molecule-co2", unit: " ppm", label: "co2" },
  rf: { icon: "mdi:water-percent", unit: " %", label: "humidity" },
};
export const BLUE = "#378ADD", CORAL = "#D85A30", AMBER = "#f2a516", GREEN = "#3fa660";
export const CHART_H = 300; // total height of every line chart (single curve groups and the hot water lanes)
export const SETTINGS_TTL = 60000;
export const UI_ACTS = new Set(["more", "ctab", "hcmp", "ser", "hsts", "hrange", "metric", "twmetric", "twcmp", "twhyst", "twrefs", "dismiss", "undismiss", "kpi", "tab", "rview", "rfilter", "rtoggle", "rclose", "noop", "rstep", "twstep", "up", "down", "view", "room", "menu"]);
export const WRITE_ERROR_SHOWN_MS = 3600000;
export const DISMISS_GRACE_MS = 1800000;
export const BAD = ["unavailable", "unknown", undefined, null, ""];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

export const RANGE_MS = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5, "1y": 365 * 864e5 };

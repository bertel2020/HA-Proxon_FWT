// Shared constants and small helpers.
export const DEFAULT_SECTIONS = ["operation", "air", "heatpump", "refrigerant", "status", "rooms"];
export const ALL_SECTIONS = ["operation", "mode", "fan", "air", "heatpump", "refrigerant", "status", "rooms", "quick", "schema", "kpi", "alerts", "history", "runtime", "energy"];
export const GRID_SECTIONS = ["fan", "heatpump", "refrigerant", "status"];

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
  temp: { icon: "mdi:thermometer", unit: "°", label: "m_temp" },
  power: { icon: "mdi:flash", unit: " W", label: "power" },
  comp: { icon: "mdi:engine-outline", unit: " rpm", label: "compressor" },
  eff: { icon: "mdi:percent-circle-outline", unit: " %", label: "efficiency" },
  co2: { icon: "mdi:molecule-co2", unit: " ppm", label: "co2" },
  rf: { icon: "mdi:water-percent", unit: " %", label: "humidity" },
};
export const BLUE = "#378ADD", CORAL = "#D85A30", AMBER = "#f2a516", GREEN = "#3fa660";
export const SETTINGS_TTL = 60000;
export const UI_ACTS = new Set(["hcmp", "hrange", "metric", "ymetric", "dismiss", "undismiss", "kpi", "tab", "rview", "rfilter", "rtoggle", "rclose", "noop", "rstep", "up", "down", "view", "room", "menu"]);
export const WRITE_ERROR_SHOWN_MS = 3600000;
export const DISMISS_GRACE_MS = 1800000;
export const BAD = ["unavailable", "unknown", undefined, null, ""];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

export const RANGE_MS = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5, "1y": 365 * 864e5 };

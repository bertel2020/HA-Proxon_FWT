import { PRESETS, SECTION_ORDER, resolveSections } from "./constants.js";
import { TEXT } from "./text.js";

// The sections in the editor, grouped by purpose.
const GROUPS = [["operate", ["operation", "rooms"]], ["plant", ["overview", "schema", "status"]], ["details", ["refrigerant", "history", "runtime", "energy"]]];
const HELPERS = GROUPS.map(([g]) => `sec_${g}`);

export class ProxonFwtCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  get _T() {
    const lang = ((this._hass && this._hass.language) || "en").split("-")[0];
    return TEXT[lang] || TEXT.en;
  }

  _label(name) {
    const T = this._T;
    return T[`ed_${name}`] || T[name] || name;
  }

  // The preset shown: an explicit list is "custom", else the chosen preset (standard by default).
  _preset(cfg) {
    if (cfg.sections !== undefined) return "custom";
    return PRESETS[cfg.preset] ? cfg.preset : "standard";
  }

  // What the form shows: the preset, the sections per group, the layout.
  _data(cfg) {
    const secs = resolveSections(cfg);
    const data = { preset: this._preset(cfg), outdoor_side: cfg.outdoor_side || "auto" };
    for (const [g, list] of GROUPS) data[`sec_${g}`] = secs.filter((s) => list.includes(s));
    return data;
  }

  // The form's value back into the card config: a changed preset replaces the list, changed sections make it "custom".
  _config_from(v) {
    const prev = this._data(this._config);
    const cfg = { ...this._config };
    for (const k of HELPERS) delete cfg[k];
    const picked = SECTION_ORDER.filter((s) => HELPERS.some((h) => (v[h] || []).includes(s)));
    const pickedBefore = SECTION_ORDER.filter((s) => HELPERS.some((h) => (prev[h] || []).includes(s)));
    if (v.preset !== prev.preset) {
      delete cfg.sections;
      if (v.preset === "custom") cfg.sections = pickedBefore;
      else if (v.preset === "standard") delete cfg.preset;
      else cfg.preset = v.preset;
    } else if (picked.join() !== pickedBefore.join()) {
      cfg.sections = picked;
      delete cfg.preset;
    }
    if (v.outdoor_side && v.outdoor_side !== "auto") cfg.outdoor_side = v.outdoor_side; else delete cfg.outdoor_side;
    for (const k of Object.keys(cfg)) if (cfg[k] === "" || cfg[k] === undefined || cfg[k] === null) delete cfg[k];
    return cfg;
  }

  _render() {
    if (!this._config) return;
    const T = this._T;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        const cfg = this._config_from(ev.detail.value);
        this._config = cfg;
        this._form.data = this._data(cfg);
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const sel = (name, options, extra = {}) => ({ name, selector: { select: { mode: "dropdown", options, ...extra } } });
    const opt = (value, label) => ({ value, label });
    this._form.hass = this._hass;
    this._form.computeLabel = (s) => (HELPERS.includes(s.name) ? T[`ed_g_${s.name.slice(4)}`] : this._label(s.name));
    this._form.schema = [
      sel("preset", ["compact", "standard", "all", "custom"].map((p) => opt(p, T[`ed_p_${p}`]))),
      { type: "expandable", name: "", title: T.ed_sections, flatten: true, schema: GROUPS.map(([g, list]) => (
        { name: `sec_${g}`, selector: { select: { multiple: true, mode: "list", options: list.map((s) => opt(s, T[`sec_${s}`])) } } })) },
      { type: "expandable", name: "", title: T.ed_advanced, flatten: true, schema: [
        sel("outdoor_side", [opt("auto", T.ed_side_auto), opt("left", T.ed_left), opt("right", T.ed_right)])] },
    ];
    // Sensors and the speed limits come from the integration options (or the YAML); they stay in the config untouched.
    this._form.data = this._data(this._config);
  }
}

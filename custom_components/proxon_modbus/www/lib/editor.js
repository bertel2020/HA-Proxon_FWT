import { DEFAULT_SECTIONS, ALL_SECTIONS } from "./constants.js";
import { TEXT } from "./text.js";

// Replaced by `operation` and `schema`; still valid in YAML, shown here only when a card uses them.
const LEGACY = ["mode", "fan", "quick", "air"];

export class ProxonFwtCardEditor extends HTMLElement {
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
      ? { sections: "Bereiche", outdoor_side: "Außenseite des Wärmetauschers" }
      : { sections: "Sections", outdoor_side: "Outdoor side of the heat exchanger" };
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
      { name: "sections", selector: { select: { multiple: true, mode: "list", options: ALL_SECTIONS.filter((v) => !LEGACY.includes(v) || (this._config.sections || []).includes(v)).map((v) => ({ value: v, label: T[v] || v })) } } },
      { name: "outdoor_side", selector: { select: { mode: "dropdown", options: [
        { value: "auto", label: lang === "de" ? "Wie in der Integration" : "As set in the integration" },
        { value: "left", label: lang === "de" ? "Links" : "Left" }, { value: "right", label: lang === "de" ? "Rechts" : "Right" }] } } },
    ];
    // Sensors and the speed limits come from the integration options (or the YAML); they stay in the config untouched.
    this._form.data = { sections: DEFAULT_SECTIONS, outdoor_side: "auto", ...this._config };
  }
}

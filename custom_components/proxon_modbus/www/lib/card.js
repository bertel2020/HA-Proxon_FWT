import { DEFAULT_SECTIONS, ALL_SECTIONS, GRID_SECTIONS } from "./constants.js";
import { ProxonFwtBase } from "./compose.js";

export class ProxonFwtCard extends ProxonFwtBase {
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
    this.shadowRoot.innerHTML = `${this._styleTag()}${body}`;
  }
}

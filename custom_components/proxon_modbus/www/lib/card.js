import { resolveSections, GRID_SECTIONS, PRESETS, LAYOUTS } from "./constants.js";
import { ProxonFwtBase } from "./compose.js";

export class ProxonFwtCard extends ProxonFwtBase {
  static getStubConfig() {
    return { type: "custom:proxon-fwt-card" };
  }

  static getConfigElement() {
    return document.createElement("proxon-fwt-card-editor");
  }

  setConfig(config) {
    const sections = resolveSections(config);
    if (config.preset && !PRESETS[config.preset] && config.preset !== "custom") {
      throw new Error(`preset must be one of: ${Object.keys(PRESETS).join(", ")}, custom`);
    }
    if (config.layout && !LAYOUTS.includes(config.layout)) {
      throw new Error(`layout must be one of: ${LAYOUTS.join(", ")}`);
    }
    if (config.outdoor_side && !["left", "right"].includes(config.outdoor_side)) {
      throw new Error("outdoor_side must be 'left' or 'right'");
    }
    this._config = { max_fan_rpm: 3000, max_compressor_rpm: 6000, ...config, sections };
    this._sig = "";
    if (this._hass) this._update();
  }

  getCardSize() {
    return this._config && this._config.sections && this._config.sections.length < 3 ? 6 : 12;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  // The sections as HTML. Overview and operation share one card: the operation controls sit under the overview figures.
  _sectionHtml(d, secs) {
    const out = [];
    for (const s of secs) {
      if (s === "operation" && secs.includes("overview") && out.merged) continue;
      let html;
      if (s === "overview") {
        const op = secs.includes("operation") ? this._sec_operation(d, { bare: true }) : "";
        html = this._sec_overview(d, op);
        out.merged = !!html && !!op;
      } else html = this[`_sec_${s}`](d);
      if (html) out.push([s, html]);
    }
    return out;
  }

  _render() {
    const d = this._d;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else {
      const parts = [];
      let cluster = [];
      const flush = () => {
        if (cluster.length) parts.push(`<div class="grid">${cluster.join("")}</div>`);
        cluster = [];
      };
      const alerts = this._sec_alerts(d);
      if (alerts) parts.push(alerts);
      for (const [s, html] of this._sectionHtml(d, this._config.sections)) {
        if (GRID_SECTIONS.includes(s)) cluster.push(html);
        else { flush(); parts.push(html); }
      }
      flush();
      body = `<div class="stack">${parts.join("")}</div>`;
    }
    this._paint(`${this._styleTag()}${body}`);
  }
}

import { resolveSections, GRID_SECTIONS, PRESETS, LAYOUTS, TAB_GROUPS } from "./constants.js";
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

  // Tabbed layout: one card, its head (state, mode, figures' title) stays; the tabs group the sections by purpose.
  _tabsHtml(d) {
    const secs = this._config.sections;
    const o = this._overviewParts(d);
    const tabs = [];
    for (const [id, list, icon] of TAB_GROUPS) {
      const mine = list.filter((s) => secs.includes(s));
      if (!mine.length) continue;
      let html = "";
      for (const s of mine) {
        if (s === "overview") html += o ? o.body : "";
        else if (s === "operation") html += this._sec_operation(d, { bare: true });
        else html += this[`_sec_${s}`](d);
      }
      if (html) tabs.push({ id, icon, label: this._t(`sec_${mine[0]}`), html });
    }
    if (!tabs.length) return "";
    const cur = tabs.find((t) => t.id === this._ctab) || tabs[0];
    const bar = tabs.length > 1 ? `<div class="ctabs" role="tablist">${tabs.map((t) => `<button class="ctab ${t.id === cur.id ? "a" : ""}" role="tab" aria-selected="${t.id === cur.id}" data-act="ctab" data-v="${t.id}" aria-label="${t.label}">${this._icon(t.icon)}<span>${t.label}</span></button>`).join("")}</div>` : "";
    return `<ha-card class="tabcard">${o ? o.head : `<div class="ovh"><b>${this._config.title || "Proxon FWT"}</b></div>`}${bar}<div class="cbody">${cur.html}</div></ha-card>`;
  }

  _render() {
    const d = this._d;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else if (this._config.layout === "tabs") {
      const alerts = this._sec_alerts(d);
      body = `<div class="stack">${alerts}${this._tabsHtml(d)}</div>`;
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

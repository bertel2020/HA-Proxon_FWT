import { METRIC_META } from "./constants.js";

export class HistorySectionsMethods {
  // ---- history: sections ------------------------------------------------

  _range() {
    return ["7d", "30d", "1y"].includes(this._histRange) ? this._histRange : "24h";
  }

  _sec_history(d) {
    const range = this._range();
    const avail = Object.keys(METRIC_META).filter((m) => this._metricDefs(d, m).length);
    if (!avail.length) return "";
    const metric = avail.includes(this._metric) ? this._metric : avail[0];
    const defs = this._metricDefs(d, metric);
    this._hget("hp", () => this._loadHp(d));
    let series = this._hget(`s|${range}|${metric}`, () => this._loadSeries(range, metric, defs));
    if (this._hcmp && series) {
      const prev = this._hget(`s|${range}|${metric}|prev`, () => this._loadSeries(range, metric, defs, true));
      if (prev) { const b = series.bypass; series = [...series, ...prev]; series.bypass = b; }
    }
    let body;
    if (series === undefined) body = this._skel(190);
    else if (!series || !series.some((s) => s.pts.length > 1)) body = `<div class="note">${this._t(range === "30d" || range === "1y" ? "no_stats" : "no_history")}</div>`;
    else body = this._chart(series, { range, unit: METRIC_META[metric].unit, bands: range === "24h" || range === "7d", bypass: series.bypass, energy: metric === "power" });
    const rb = (v, l) => `<button class="vbtn ${range === v ? "a" : ""}" data-act="hrange" data-v="${v}">${l}</button>`;
    const chips = avail.length > 1 ? `<div class="mchips" role="group">${avail.map((m) => `<button class="vbtn ${m === metric ? "a" : ""}" data-act="metric" data-v="${m}">${this._icon(METRIC_META[m].icon)}${this._t(METRIC_META[m].label)}</button>`).join("")}</div>` : "";
    return `<ha-card><div class="h">${this._icon("mdi:chart-line")}${this._t("history")}
      <span class="r rng"><button class="vbtn ${this._hcmp ? "a" : ""}" data-act="hcmp" aria-pressed="${!!this._hcmp}">${this._icon("mdi:compare-horizontal")}${this._t("prev_period")}</button>${rb("24h", this._t("hist_24"))}${rb("7d", this._t("hist_7"))}${rb("30d", this._t("hist_30"))}${rb("1y", this._t("hist_365"))}</span></div>${chips}${body}</ha-card>`;
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

}

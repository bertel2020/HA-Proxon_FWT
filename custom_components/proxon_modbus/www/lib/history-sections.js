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
      <span class="r rng"><button class="vbtn ${this._hcmp ? "a" : ""}" data-act="hcmp" aria-pressed="${!!this._hcmp}">${this._icon("mdi:compare-horizontal")}${this._t("prev_period")}</button>${this._isPanel ? "" : `${rb("24h", this._t("hist_24"))}${rb("7d", this._t("hist_7"))}${rb("30d", this._t("hist_30"))}${rb("1y", this._t("hist_365"))}`}</span></div>${chips}${body}</ha-card>`;
  }

  // When a cached history load last succeeded (ms), or 0.
  _hstamp(key) {
    const e = this._hc && this._hc[key];
    return e && e.v ? e.t : 0;
  }

  // One range switch for the whole history page.
  _histBar() {
    const range = this._range();
    return `<div class="seg cmp" role="group" style="grid-template-columns:repeat(4,1fr)">${[["24h", "hist_24"], ["7d", "hist_7"], ["30d", "hist_30"], ["1y", "hist_365"]].map(([v, l]) =>
      this._btn(`data-act="hrange" data-v="${v}" aria-pressed="${range === v}"`, range === v ? "a" : "", this._t(l))).join("")}</div>`;
  }

  // Header subtitle shared by the cards below the chart: the range and what one bar stands for.
  _rangeSub(range) {
    return `${this._t({ "24h": "hist_24", "7d": "hist_7", "30d": "hist_30", "1y": "hist_365" }[range])} · ${this._t(range === "24h" ? "per_hour" : range === "1y" ? "per_month" : "per_day")}`;
  }

  _sec_runtime(d) {
    const c = d.central;
    if (!c.hp_runtime_total && !c.hp_starts_total) return "";
    const range = this._range(), rows = this._hget(`b|${range}`, () => this._loadBuckets(d, range));
    const body = rows === undefined ? this._skel(190)
      : rows && rows.some((x) => x.h !== undefined) ? this._barChart(rows, { key: "h", label: "runtime", color: "#3fa660", unit: "h", range, out: true, stamp: this._hstamp(`b|${range}`) }) : `<div class="note">${this._t("no_stats")}</div>`;
    return `<ha-card>${this._header("mdi:heat-pump-outline", this._t("runtime"), this._rangeSub(range))}${body}</ha-card>`;
  }

  _sec_energy(d) {
    if (!this._powerId() && !this._energyId()) return "";
    const range = this._range(), rows = this._hget(`b|${range}`, () => this._loadBuckets(d, range));
    if (rows === null || (rows && !rows.some((x) => x.kwh !== undefined))) return "";
    return `<ha-card>${this._header("mdi:lightning-bolt-outline", this._t("energy"), this._rangeSub(range))}${rows === undefined ? this._skel(190)
      : this._barChart(rows, { key: "kwh", label: "energy", color: "#BA7517", unit: "kWh", range, stamp: this._hstamp(`b|${range}`), ref: `<div class="note">${this._t(rows.meter ? "energy_meter" : "energy_note")}</div>` })}</ha-card>`;
  }

}

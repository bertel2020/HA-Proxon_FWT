import { METRIC_META, BLUE } from "./constants.js";

export class HistorySectionsMethods {
  // ---- history: sections ------------------------------------------------

  _range() {
    return ["7d", "30d", "1y"].includes(this._histRange) ? this._histRange : "24h";
  }

  _sec_history(d) {
    const range = this._range();
    // "all": air, refrigerant circuit, drives and power as lanes on one time axis (only when at least two of them exist)
    const groups = ["temp", "eff", "circuit", "drives", "power"].filter((m) => this._metricDefs(d, m).length);
    const avail = Object.keys(METRIC_META).filter((m) => (m === "all" ? groups.length > 1 : this._metricDefs(d, m).length));
    if (!avail.length) return "";
    const metric = avail.includes(this._metric) ? this._metric : avail[0];
    const all = metric === "all", defs = this._metricDefs(d, metric);
    this._hget("hp", () => this._loadHp(d));
    let series = all ? undefined : this._hget(`s|${range}|${metric}`, () => this._loadSeries(range, metric, defs));
    if (this._hcmp && series && !all) {
      const prev = this._hget(`s|${range}|${metric}|prev`, () => this._loadSeries(range, metric, defs, true));
      if (prev) { const b = series.bypass; series = [...series, ...prev]; series.bypass = b; }
    }
    let body;
    if (all) body = this._allBody(d, range, groups);
    else if (series === undefined) body = this._skel(300);
    else if (!series || !series.some((s) => s.pts.length > 1)) body = `<div class="note">${this._t(range === "30d" || range === "1y" ? "no_stats" : "no_history")}</div>`;
    else body = this._chart(series, { range, unit: METRIC_META[metric].unit, bands: range === "24h" || range === "7d", bypass: series.bypass, energy: metric === "power", key: metric, off0: metric === "circuit" ? [this._t("compressor")] : [] });
    const rb = (v, l) => `<button class="vbtn ${range === v ? "a" : ""}" data-act="hrange" data-v="${v}">${l}</button>`;
    const chips = avail.length > 1 ? `<div class="mchips" role="group">${avail.map((m) => `<button class="vbtn ${m === metric ? "a" : ""}" data-act="metric" data-v="${m}">${this._icon(METRIC_META[m].icon)}${this._t(METRIC_META[m].label)}</button>`).join("")}</div>` : "";
    return `<ha-card><div class="h">${this._icon("mdi:chart-line")}${this._t("history")}
      <span class="r rng">${all ? "" : `<button class="vbtn ${this._hcmp ? "a" : ""}" data-act="hcmp" aria-pressed="${!!this._hcmp}">${this._icon("mdi:compare-horizontal")}${this._t("prev_period")}</button>`}${(g => this._isPanel ? `<span class="rgrp" role="group">${g}</span>` : g)(`${rb("24h", this._t("hist_24"))}${rb("7d", this._t("hist_7"))}${rb("30d", this._t("hist_30"))}${rb("1y", this._t("hist_365"))}`)}</span></div>${chips}${body}</ha-card>`;
  }

  // Overview chart: the groups one below the other (lanes) on one time axis with one crosshair. The compressor temperature stays out
  // (its own chip shows it): at about 50 degrees it would squash the other refrigerant circuit curves.
  _allBody(d, range, groups) {
    const loaded = groups.map((m) => ({ m, s: this._hget(`s|${range}|${m}`, () => this._loadSeries(range, m, this._metricDefs(d, m))) }));
    if (loaded.some((e) => e.s === undefined)) return this._skel(380);
    const nf = (v) => this._fmt(v, Math.abs(v) < 100 ? 1 : 0), comp = this._t("compressor");
    const fmt = { temp: (v) => `${nf(v)}°`, circuit: (v) => `${nf(v)}°`, drives: (v) => `${this._fmt(v, 0)} rpm`,
      eff: (v) => `${this._fmt(v, 0)} %`,
      power: (v) => (v >= 1000 ? `${this._fmt(v / 1000)} kW` : `${this._fmt(v, 0)} W`) };
    const h = { temp: 110, eff: 80, circuit: 110, drives: 100, power: 80 };
    const lanes = loaded.map(({ m, s }) => {
      const list = (s || []).filter((x) => x.pts.length > 1 && !(m === "circuit" && x.label === comp))
        .map((x) => ({ ...x, hkey: `${m}|${x.label}`, kind: "line", fmt: fmt[m], energy: m === "power" }));
      return list.length && { h: h[m], axis: true, series: list };
    }).filter(Boolean);
    if (!lanes.length) return `<div class="note">${this._t(range === "30d" || range === "1y" ? "no_stats" : "no_history")}</div>`;
    const hp = this._hp(), short = range === "24h" || range === "7d";
    const bypass = (loaded.map((e) => e.s && e.s.bypass).find((b) => b && b.length)) || [];
    const phases = [
      short && hp && hp.iv.length ? { iv: hp.iv, color: "#3fa660", label: this._t("hp_runs") } : null,
      short && bypass.length ? { iv: bypass, color: BLUE, label: this._t("bypass_open") } : null,
    ].filter(Boolean);
    return this._laneChart(lanes, { range, phases, gap: 20, key: "all" });
  }

  // When a cached history load last succeeded (ms), or 0.
  _hstamp(key) {
    const e = this._hc && this._hc[key];
    return e && e.v ? e.t : 0;
  }

  // Header subtitle shared by the cards below the chart: the range and what one bar stands for.
  _rangeSub(range) {
    return `${this._t({ "24h": "hist_24", "7d": "hist_7", "30d": "hist_30", "1y": "hist_365" }[range])} · ${this._t(range === "24h" ? "per_hour" : range === "1y" ? "per_month" : "per_day")}`;
  }

  _sec_runtime(d) {
    const c = d.central;
    if (!c.hp_runtime_total && !c.hp_starts_total) return "";
    const range = this._range(), rows = this._hget(`b|${range}`, () => this._loadBuckets(d, range));
    const body = rows === undefined ? this._skel(260)
      : rows && rows.some((x) => x.h !== undefined) ? this._barChart(rows, { key: "h", label: "runtime", color: "#3fa660", unit: "h", range, out: true, stamp: this._hstamp(`b|${range}`) }) : `<div class="note">${this._t("no_stats")}</div>`;
    return `<ha-card>${this._header("mdi:heat-pump-outline", this._t("runtime"), this._rangeSub(range))}${body}</ha-card>`;
  }

  _sec_energy(d) {
    if (!this._powerId() && !this._energyId()) return "";
    const range = this._range(), rows = this._hget(`b|${range}`, () => this._loadBuckets(d, range));
    if (rows === null || (rows && !rows.some((x) => x.kwh !== undefined))) return "";
    return `<ha-card>${this._header("mdi:lightning-bolt-outline", this._t("energy"), this._rangeSub(range))}${rows === undefined ? this._skel(260)
      : this._barChart(rows, { key: "kwh", label: "energy", color: "#BA7517", unit: "kWh", range, stamp: this._hstamp(`b|${range}`), ref: `<div class="note">${this._t(rows.meter ? "energy_meter" : "energy_note")}</div>` })}</ha-card>`;
  }

}

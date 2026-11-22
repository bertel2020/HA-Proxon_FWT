import { BLUE, CORAL, AMBER, GREEN, RANGE_MS } from "./constants.js";
import { ProxonFwtBase } from "./base.js";

export class HistoryDataMethods {
  // ---- history: data ----------------------------------------------------

  // Cached async loader: returns the cached value, `undefined` while the first load runs, `null` on failure.
  _hget(key, loader) {
    // History caches belong to one unit and its data sources; a changed scope drops them.
    const scope = [this._settingsFor || "", this._opt("power_entity") || "", this._opt("energy_entity") || "", this._opt("outdoor_entity") || "", this._opt("outdoor_side", "left")].join("|");
    if (this._hscope !== scope) { this._hc = {}; this._hscope = scope; }
    const cache = (this._hc = this._hc || {});
    const e = cache[key];
    // Statistics/history queries depend on the integration options: wait for them instead of loading twice.
    if (this._settingsFor && this._settings === undefined) return e ? e.v : undefined;
    if (e && (e.busy || Date.now() - e.t < 300000)) return e.v;
    cache[key] = { t: e ? e.t : 0, v: e ? e.v : undefined, busy: true };
    const scopeAtStart = scope;
    const done = (v) => {
      if (this._hscope !== scopeAtStart) return; // the data source changed while loading
      cache[key] = { t: v === null ? Date.now() - 300000 + 15000 : Date.now(), v }; // a failure is retried after 15 s
      this._hver = (this._hver || 0) + 1;
      this._update();
    };
    loader().then(done, () => done(null));
    return cache[key].v;
  }

  _metricDefs(d, m) {
    const c = d.central, out = this._outdoorId();
    const pal = ["#3d8be0", "#e0562b", "#3fa660", "#f2a516", "#7e57c2", "#14998e", "#d6336c", "#8a8f98"];
    const keep = (arr) => arr.filter(([id], i, a) => id && a.findIndex((x) => x[0] === id) === i);
    switch (m) {
      case "temp": return keep([[c.temp_supply_air, this._t("supply_t"), CORAL], [c.temp_extract_air, this._t("extract"), AMBER],
        [c.temp_fresh_air, this._t("fresh"), BLUE], [out, this._t("outside"), "#7e57c2"]]);
      case "circuit": return keep([[c.temp_pre_evaporator, this._t("pre_evaporator")], [c.temp_evaporator, this._t("evaporator")], [c.temp_post_preheat, this._t("post_preheat")],
        [c.temp_pre_condenser, this._t("pre_condenser")], [c.temp_condenser, this._t("condenser")], [c.temp_compressor, this._t("compressor")]])
        .map(([id, l], i) => [id, l, pal[i % pal.length]]);
      case "drives": return keep([[c.compressor_speed, this._t("compressor"), "#3d8be0"], [c.fan_speed_supply, this._t("supply_fan"), CORAL], [c.fan_speed_extract, this._t("extract_fan"), AMBER]]);
      case "power": return keep([[this._powerId(), this._t("power"), AMBER]]);
      case "ptc": return keep([[this._ptcP(), this._t("ptc_power"), CORAL]]);
      case "eff": return c.temp_pre_evaporator && c.temp_extract_air && c.temp_fresh_air
        ? [[c.temp_pre_evaporator, "s", CORAL], [c.temp_extract_air, "e", AMBER], [c.temp_fresh_air, "f", BLUE]] : [];
      case "co2": return d.rooms.filter((r) => r.co2).map((r, i) => [r.co2, r.name, pal[i % pal.length]]);
      case "rf": return d.rooms.filter((r) => r.rf).map((r, i) => [r.rf, r.name, pal[i % pal.length]]);
    }
    return [];
  }

  // Staircase: the last value holds until the next one (a sensor that only reports changes does not ramp between them).
  static _stairs(pts) {
    const out = [];
    pts.forEach((p, i) => { if (i) out.push([p[0], pts[i - 1][1]]); out.push(p); });
    return out;
  }

  static _down(pts, n) {
    if (pts.length <= n) return pts;
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0], w = (t1 - t0) / n || 1;
    const buckets = new Map();
    for (const [t, v] of pts) {
      const k = Math.min(n - 1, Math.floor((t - t0) / w)), b = buckets.get(k) || [0, 0, 0];
      b[0] += t; b[1] += v; b[2]++; buckets.set(k, b);
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => [b[0] / b[2], b[1] / b[2]]);
  }

  static _at(pts, t) {
    if (!pts.length) return null;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= t) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi];
    if (t <= a[0]) return a[1];
    if (t >= b[0]) return b[1];
    return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0] || 1);
  }

  async _loadSeries(range, metric, defs, prev) {
    const ms = RANGE_MS[range];
    const end = new Date(Date.now() - (prev ? ms : 0)), start = new Date(end.getTime() - ms), ids = defs.map(([id]) => id);
    let raw;
    // Long ranges: the integration's heat recovery sensor has real long-term statistics (once it has collected some).
    const hrId = this._d && this._d.central.heat_recovery;
    if (metric === "eff" && hrId && (range === "30d" || range === "1y")) {
      const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        statistic_ids: [hrId], period: range === "1y" ? "day" : "hour", types: ["mean"] });
      const pts = (res[hrId] || []).map((r) => [r.start / 1000, Number(r.mean)]).filter(([t, v]) => !isNaN(t) && !isNaN(v));
      if (pts.length > 24) {
        const o = [{ label: this._t("efficiency"), color: GREEN, pts: ProxonFwtBase._down(pts, 360) }];
        o.bypass = [];
        if (prev) { for (const x of o) { x.pts = x.pts.map(([t, v]) => [t + ms / 1000, v]); x.prev = true; x.label = `${x.label} · ${this._t("prev_period")}`; } }
        return o;
      }
    }
    if (range === "30d" || range === "1y") {
      const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        statistic_ids: ids, period: range === "1y" ? "day" : "hour", types: ["mean"] });
      raw = defs.map(([id]) => (res[id] || []).map((r) => [r.start / 1000, Number(r.mean)]).filter(([t, v]) => !isNaN(t) && !isNaN(v)));
    } else {
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      raw = defs.map(([id]) => (res[id] || []).map((p) => [p.lu ?? Date.parse(p.last_updated) / 1000, Number(p.s ?? p.state)]).filter(([t, v]) => !isNaN(t) && !isNaN(v)));
    }
    const pscale = this._pscale();
    if (pscale !== 1) raw = raw.map((pts, i) => (ids[i] === this._powerId() ? pts.map(([t, v]) => [t, v * pscale]) : pts));
    const ptcId = this._ptcP();
    if (ptcId && this._wscale(ptcId) !== 1) raw = raw.map((pts, i) => (ids[i] === ptcId ? pts.map(([t, v]) => [t, v * this._wscale(ptcId)]) : pts));
    // Phases with the summer bypass open (exchanger bypassed): shown as a band and left out of the heat recovery rate.
    let bypass = [];
    const byId = this._d && this._d.central.bypass_active;
    if (byId && range !== "30d" && range !== "1y") {
      try {
        const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
          entity_ids: [byId], minimal_response: true, no_attributes: true, significant_changes_only: false });
        bypass = this._intervals(res, [byId], end.getTime() / 1000);
      } catch (err) { bypass = []; }
    }
    const inBypass = (t) => bypass.some(([a, b]) => t >= a && t <= b);
    let out;
    if (metric === "eff") {
      const [S, E, F] = raw, pts = [];
      for (const [t, s] of S) {
        const e = ProxonFwtBase._at(E, t), f = ProxonFwtBase._at(F, t);
        if (e === null || f === null || Math.abs(e - f) < 3 || inBypass(t)) continue;
        const v = ((e - s) / (e - f)) * 100;
        if (v >= 0 && v <= 110) pts.push([t, v]);
      }
      out = [{ label: this._t("efficiency"), color: GREEN, pts: ProxonFwtBase._down(pts, 360) }];
    } else out = defs.map(([id, label, color], i) => ({ id, label, color, pts: ProxonFwtBase._down(raw[i], 360) }));
    out.bypass = bypass;
    if (prev) { // previous period: shifted onto the current time axis, drawn dashed
      for (const o of out) { o.pts = o.pts.map(([t, v]) => [t + ms / 1000, v]); o.prev = true; o.label = `${o.label} · ${this._t("prev_period")}`; }
      out.bypass = [];
    }
    return out;
  }

  async _loadHp(d) {
    const c = d.central, ids = [c.heat_pump_heating, c.heat_pump_cooling].filter(Boolean);
    if (!ids.length) return null;
    const end = new Date(), start = new Date(end.getTime() - 7 * 864e5);
    const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
    return { t0: start.getTime() / 1000, iv: this._intervals(res, ids, end.getTime() / 1000) };
  }

  // Heat pump run intervals of the current scope, straight from the cache (a stale load of another unit never lands here).
  _hp() {
    const e = this._hc && this._hc.hp;
    return e && e.v ? e.v : null;
  }

  // Runtime, starts, outdoor temperature, mean power and energy per bucket (hour / day / month, depending on the range)
  // from the long-term statistics. The one loader for every card below the history chart, so they always share a range.
  async _loadBuckets(d, range) {
    const c = d.central, out = this._outdoorId(), pw = this._powerId(), en = this._energyId(), pe = this._ptcE();
    const ids = [c.hp_runtime_total, c.hp_starts_total, out, pw, en, pe].filter(Boolean);
    if (!ids.length) return null;
    const period = { "24h": "hour", "7d": "day", "30d": "day", "1y": "month" }[range], now = new Date();
    const start = range === "1y" ? new Date(now.getFullYear(), now.getMonth() - 11, 1) : new Date(now.getTime() - RANGE_MS[range]);
    const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: now.toISOString(),
      statistic_ids: ids, period, types: ["mean", "change"] });
    const rows = new Map();
    const put = (id, field, key, k = 1) => {
      for (const r of res[id] || []) {
        const v = Number(r[field]) * k;
        if (isNaN(v)) continue;
        const row = rows.get(r.start) || { t: r.start / 1000 };
        row[key] = v; rows.set(r.start, row);
      }
    };
    if (c.hp_runtime_total) put(c.hp_runtime_total, "change", "h");
    if (c.hp_starts_total) put(c.hp_starts_total, "change", "starts");
    if (out) put(out, "mean", "out");
    if (pw) put(pw, "mean", "w", this._pscale());
    if (pe) put(pe, "change", "pkwh", this._kscale(pe));
    if (en) put(en, "change", "kwh", this._escale()); // a meter gives the real consumption per bucket
    const list = [...rows.values()].sort((a, b) => a.t - b.t), nowS = now.getTime() / 1000, fixed = period === "hour" ? 3600 : 86400;
    const meter = list.some((m) => m.kwh !== undefined); // no meter statistics yet: estimate from the power like before
    list.forEach((m, i) => {
      const next = period === "month" ? (i + 1 < list.length ? list[i + 1].t : nowS) : Math.min(m.t + fixed, nowS);
      if (!meter && m.w !== undefined) m.kwh = (m.w * Math.max(0, next - m.t)) / 3600 / 1000;
    });
    list.meter = meter;
    return list;
  }

  // The value for the "now" column under the charts: the live state of the sensor, else the last point of the curve.
  _nowVal(s) {
    const v = s.id ? this._num(s.id) : null;
    if (v !== null && v !== undefined) return s.id === this._powerId() ? v * this._pscale() : s.id && s.id === this._ptcP() ? v * this._wscale(s.id) : v;
    return s.pts.length ? s.pts[s.pts.length - 1][1] : null;
  }

  _skel(h) {
    return `<div class="sk" style="height:${h}px"></div>`;
  }

}

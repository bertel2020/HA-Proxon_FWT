import { BLUE, CORAL, AMBER, GREEN, RANGE_MS } from "./constants.js";
import { ProxonFwtBase } from "./base.js";

export class HistoryDataMethods {
  // ---- history: data ----------------------------------------------------

  // Cached async loader: returns the cached value, `undefined` while the first load runs, `null` on failure.
  _hget(key, loader) {
    // History caches belong to one unit and its data sources; a changed scope drops them.
    const scope = [this._settingsFor || "", this._opt("power_entity") || "", this._opt("outdoor_entity") || "", this._opt("outdoor_side", "left")].join("|");
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
      case "power": return keep([[this._powerId(), this._t("power"), AMBER]]);
      case "comp": return keep([[c.compressor_speed, this._t("compressor"), "#3d8be0"]]);
      case "eff": return c.temp_pre_evaporator && c.temp_extract_air && c.temp_fresh_air
        ? [[c.temp_pre_evaporator, "s", CORAL], [c.temp_extract_air, "e", AMBER], [c.temp_fresh_air, "f", BLUE]] : [];
      case "co2": return d.rooms.filter((r) => r.co2).map((r, i) => [r.co2, r.name, pal[i % pal.length]]);
      case "rf": return d.rooms.filter((r) => r.rf).map((r, i) => [r.rf, r.name, pal[i % pal.length]]);
    }
    return [];
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
    } else out = defs.map(([, label, color], i) => ({ label, color, pts: ProxonFwtBase._down(raw[i], 360) }));
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

  // Daily runtime, starts, outdoor temperature and mean power for 30 days from the long-term statistics.
  async _loadRun(d) {
    const c = d.central, out = this._outdoorId(), pw = this._powerId();
    const ids = [c.hp_runtime_total, c.hp_starts_total, out, pw].filter(Boolean);
    if (!ids.length) return null;
    const end = new Date(), start = new Date(end.getTime() - 30 * 864e5);
    const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      statistic_ids: ids, period: "day", types: ["mean", "change"] });
    const days = new Map();
    const put = (id, field, key, k = 1) => {
      for (const r of res[id] || []) {
        const v = Number(r[field]) * k;
        if (isNaN(v)) continue;
        const day = days.get(r.start) || { t: r.start / 1000 };
        day[key] = v; days.set(r.start, day);
      }
    };
    if (c.hp_runtime_total) put(c.hp_runtime_total, "change", "h");
    if (c.hp_starts_total) put(c.hp_starts_total, "change", "starts");
    if (out) put(out, "mean", "out");
    if (pw) put(pw, "mean", "w", this._pscale());
    return [...days.values()].sort((a, b) => a.t - b.t);
  }

  // Monthly runtime, starts, outdoor temperature and mean power for 12 months from the long-term statistics.
  async _loadYear(d) {
    const c = d.central, out = this._outdoorId(), pw = this._powerId();
    const ids = [c.hp_runtime_total, c.hp_starts_total, out, pw].filter(Boolean);
    if (!ids.length) return null;
    const end = new Date(), start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      statistic_ids: ids, period: "month", types: ["mean", "change"] });
    const months = new Map();
    const put = (id, field, key, k = 1) => {
      for (const r of res[id] || []) {
        const v = Number(r[field]) * k;
        if (isNaN(v)) continue;
        const m = months.get(r.start) || { t: r.start / 1000 };
        m[key] = v; months.set(r.start, m);
      }
    };
    if (c.hp_runtime_total) put(c.hp_runtime_total, "change", "h");
    if (c.hp_starts_total) put(c.hp_starts_total, "change", "starts");
    if (out) put(out, "mean", "out");
    if (pw) put(pw, "mean", "w", this._pscale());
    const list = [...months.values()].sort((a, b) => a.t - b.t), now = Date.now() / 1000;
    list.forEach((m, i) => {
      const next = i + 1 < list.length ? list[i + 1].t : now;
      if (m.w !== undefined) m.kwh = (m.w * Math.max(0, next - m.t)) / 3600 / 1000;
    });
    return list;
  }

  _sec_year(d) {
    const c = d.central;
    if (!c.hp_runtime_total && !c.hp_starts_total && !this._powerId()) return "";
    const months = this._hget("year", () => this._loadYear(d));
    if (months === null) return "";
    const avail = [["h", "y_runtime", "mdi:timer-outline", "#3fa660", "h"], ["kwh", "y_energy", "mdi:lightning-bolt-outline", AMBER, "kWh"], ["starts", "y_starts", "mdi:repeat", BLUE, ""]]
      .filter(([k]) => months === undefined || months.some((m) => m[k] !== undefined));
    if (months !== undefined && !avail.length) return `<ha-card>${this._header("mdi:calendar-month-outline", this._t("year"), this._t("year_sub"))}<div class="note">${this._t("no_stats")}</div></ha-card>`;
    const cur = avail.find(([k]) => k === this._ymetric) || avail[0];
    const chips = avail.length > 1 ? `<div class="mchips" role="group">${avail.map(([k, l, ic]) => `<button class="vbtn ${k === cur[0] ? "a" : ""}" data-act="ymetric" data-v="${k}">${this._icon(ic)}${this._t(l)}</button>`).join("")}</div>` : "";
    return `<ha-card>${this._header("mdi:calendar-month-outline", this._t("year"), this._t("year_sub"))}${chips}${months === undefined ? this._skel(190) : this._yearChart(months, cur, d)}</ha-card>`;
  }

  _yearChart(months, [key, label, , color, unit], d) {
    const lang = this._hass.language;
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 190, pl = 40, pr = 34, pt = 12, pb = 22;
    const vals = months.map((m) => m[key] || 0), max = Math.max(1, Math.ceil(Math.max(...vals) * 1.05));
    const outs = months.filter((m) => m.out !== undefined).map((m) => m.out);
    const oLo = outs.length ? Math.floor(Math.min(...outs) - 1) : 0, oHi = outs.length ? Math.ceil(Math.max(...outs) + 1) : 1;
    const slot = (W - pl - pr) / months.length, bw = Math.max(6, slot * 0.6);
    const X = (i) => pl + slot * (i + 0.5), Y = (v) => pt + (1 - v / max) * (H - pt - pb), Yo = (v) => pt + (1 - (v - oLo) / Math.max(1, oHi - oLo)) * (H - pt - pb);
    const mf = (t) => new Date(t * 1000).toLocaleDateString(lang, { month: "short" });
    const mfl = (t) => new Date(t * 1000).toLocaleDateString(lang, { month: "long", year: "numeric" });
    const fmt = (v) => v.toLocaleString(lang, { maximumFractionDigits: v < 10 ? 1 : 0 });
    // The month in which the device filter was last changed (age + now)
    const age = this._num(d.central.filter_age_days), chg = age === null ? null : Date.now() / 1000 - age * 86400;
    const bars = months.map((m, i) => {
      const v = m[key] || 0, f = chg !== null && chg >= m.t && (i + 1 >= months.length || chg < months[i + 1].t);
      return `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - pb - Y(v)).toFixed(1)}" rx="3" fill="${color}" opacity=".8"/>
        <rect x="${(X(i) - slot / 2).toFixed(1)}" y="${pt}" width="${slot.toFixed(1)}" height="${H - pt - pb}" fill="transparent" data-tip="${mfl(m.t)}|${fmt(v)} ${unit}${m.out !== undefined ? ` · Ø ${m.out.toLocaleString(lang, { maximumFractionDigits: 1 })} °C` : ""}"/>
        ${f ? `<g><title>${this._t("y_filter")}</title><circle cx="${X(i).toFixed(1)}" cy="${H - pb + 0}" r="4.5" fill="var(--card-background-color)" stroke="${CORAL}" stroke-width="1.6"/></g>` : ""}`;
    }).join("");
    const gl = [0, 1, 2, 3].map((i) => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" y2="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
      <text class="st" x="${pl - 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${Math.round(max * (1 - i / 3))}</text>
      ${outs.length ? `<text class="st" x="${W - pr + 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" style="font-size:11px">${Math.round(oHi - ((oHi - oLo) * i) / 3)}°</text>` : ""}`).join("");
    const xt = months.map((m, i) => `<text class="st" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" style="font-size:11px">${mf(m.t)}</text>`).join("");
    const pts = months.map((m, i) => m.out === undefined ? null : `${X(i).toFixed(1)},${Yo(m.out).toFixed(1)}`).filter(Boolean).join(" ");
    const sum = vals.reduce((a, b) => a + b, 0);
    return `<div class="chw"><svg style="max-width:100%;height:auto" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("year")}">${gl}${bars}
      ${pts ? `<polyline fill="none" stroke="#7e57c2" stroke-width="1.8" stroke-linejoin="round" points="${pts}"/>` : ""}${xt}</svg><div class="tip" style="display:none"></div></div>
      <div class="legend"><span><i style="background:${color}"></i>${this._t(label)}${unit ? ` (${unit})` : ""}</span>${outs.length ? `<span><i style="background:#7e57c2"></i>${this._t("outside")} (°C)</span>` : ""}
      ${chg !== null && chg >= months[0].t ? `<span><i style="background:none;border:2px solid ${CORAL}"></i>${this._t("y_filter")}</span>` : ""}
      <span>Σ ${fmt(sum)} ${unit}</span></div><div class="note">${this._t("y_note")}</div>`;
  }

  _skel(h) {
    return `<div class="sk" style="height:${h}px"></div>`;
  }

}

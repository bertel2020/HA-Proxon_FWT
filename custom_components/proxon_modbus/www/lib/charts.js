import { BLUE, AMBER, RANGE_MS } from "./constants.js";

export class ChartsMethods {
  // ---- history: charts --------------------------------------------------

  _chart(series, o) {
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 190, pl = 42, pr = 10, pt = 10, pb = 22;
    const lang = this._hass.language;
    const ms = RANGE_MS[o.range] / 1000;
    const t1 = Date.now() / 1000, t0 = t1 - ms;
    const vals = series.flatMap((s) => s.pts.map((p) => p[1]));
    let mn = Math.min(...vals), mx = Math.max(...vals);
    const raw = Math.max(1e-6, mx - mn) / 3, p10 = 10 ** Math.floor(Math.log10(raw)), f = raw / p10;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p10;
    let lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step;
    if (hi - lo < step * 2) hi = lo + step * 2;
    const x = (t) => pl + ((t - t0) / (t1 - t0)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const dec = step < 1 ? 1 : 0;
    let grid = "";
    for (let v = lo; v <= hi + step / 2; v += step) {
      grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
        <text class="st" x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${v.toLocaleString(lang, { minimumFractionDigits: dec, maximumFractionDigits: dec })}</text>`;
    }
    const ticks = [];
    if (o.range === "24h") for (let i = 0; i <= 4; i++) ticks.push(t0 + ((t1 - t0) * i) / 4);
    else {
      if (o.range === "1y") {
        const every = W < 420 ? 2 : 1;
        const dd = new Date(t0 * 1000); dd.setDate(1); dd.setHours(0, 0, 0, 0); dd.setMonth(dd.getMonth() + 1);
        for (; dd.getTime() / 1000 <= t1; dd.setMonth(dd.getMonth() + every)) ticks.push(dd.getTime() / 1000);
      } else {
        const every = o.range === "7d" ? 1 : W < 420 ? 10 : 5;
        const dd = new Date(t0 * 1000); dd.setHours(24, 0, 0, 0);
        for (; dd.getTime() / 1000 <= t1; dd.setDate(dd.getDate() + every)) ticks.push(dd.getTime() / 1000);
      }
    }
    const tl = (t) => o.range === "24h" ? new Date(t * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
      : o.range === "7d" ? new Date(t * 1000).toLocaleDateString(lang, { weekday: "short" })
        : o.range === "1y" ? new Date(t * 1000).toLocaleDateString(lang, { month: "short" })
        : new Date(t * 1000).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
    const xt = ticks.map((t) => `<text class="st" x="${x(t).toFixed(1)}" y="${H - 5}" text-anchor="${x(t) > W - 24 ? "end" : "middle"}" style="font-size:11px">${tl(t)}</text>`).join("");
    const bands = o.bands ? ((this._hp() || {}).iv || []).map(([a, b]) => {
      const s0 = Math.max(a, t0), s1 = Math.min(b, t1);
      return s1 > s0 ? `<rect x="${x(s0).toFixed(1)}" y="${pt}" width="${Math.max(1, x(s1) - x(s0)).toFixed(1)}" height="${H - pt - pb}" fill="#3fa660" opacity=".14"/>` : "";
    }).join("") : "";
    const byBands = (o.bypass || []).map(([a, b]) => {
      const s0 = Math.max(a, t0), s1 = Math.min(b, t1);
      return s1 > s0 ? `<rect x="${x(s0).toFixed(1)}" y="${pt}" width="${Math.max(1, x(s1) - x(s0)).toFixed(1)}" height="${H - pt - pb}" fill="${BLUE}" opacity=".13"/>` : "";
    }).join("");
    const lines = series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="${s.prev ? 1.4 : 1.8}" ${s.prev ? 'stroke-dasharray="5 4" opacity=".55"' : ""} stroke-linejoin="round" points="${s.pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`).join("");
    // curves with their own stat row are named there; the legend keeps only the rest (previous period, bands)
    const legend = series.filter((s) => s.prev || !s.pts.length).map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("");
    const showBands = o.bands && this._hp() && this._hp().iv.length;
    // min / max / mean per curve (for power additionally the energy as the integral of the curve)
    const nf = (v) => v.toLocaleString(lang, { maximumFractionDigits: Math.abs(v) < 100 ? 1 : 0 });
    const statRows = series.filter((s) => s.pts.length && !s.prev).map((s) => {
      const v = s.pts.map((p) => p[1]);
      let kwh = "";
      if (o.energy) {
        let wh = 0;
        for (let i = 1; i < s.pts.length; i++) wh += ((s.pts[i][1] + s.pts[i - 1][1]) / 2) * ((s.pts[i][0] - s.pts[i - 1][0]) / 3600);
        kwh = `<span class="v"><b>${nf(wh / 1000)}</b> kWh</span>`;
      }
      return `<div class="hst"><span class="n"><i style="background:${s.color}"></i>${s.label}</span><span class="v"><b>${nf(Math.min(...v))}</b>${o.unit}</span><span class="v"><b>${nf(Math.max(...v))}</b>${o.unit}</span><span class="v"><b>${nf(v.reduce((a, b) => a + b, 0) / v.length)}</b>${o.unit}</span>${kwh}</div>`;
    }).join("");
    const statHead = statRows ? `<div class="hst hh"><span class="n"></span><span class="v">${this._t("st_min")}</span><span class="v">${this._t("st_max")}</span><span class="v">Ø</span>${o.energy ? '<span class="v">Σ</span>' : ""}</div>` : "";
    this._cm = { W, H, pl, pr, pt, pb, t0, t1, lo, hi, series, unit: o.unit, range: o.range, x, y };
    return `<div class="chw"><svg class="ch" style="max-width:100%;height:auto;touch-action:pan-y" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("history")}">
      ${bands}${byBands}${grid}${lines}${xt}<line class="xl" y1="${pt}" y2="${H - pb}" stroke="var(--secondary-text-color)" stroke-width="1" stroke-dasharray="3 3" style="display:none"/><g class="xd"></g>
      <rect class="ov" x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent"/></svg><div class="tip" style="display:none"></div></div>
      <div class="legend">${legend}${showBands ? `<span><i style="background:#3fa660;opacity:.4"></i>${this._t("hp_runs")}</span>` : ""}${o.bypass && o.bypass.length ? `<span><i style="background:${BLUE};opacity:.4"></i>${this._t("bypass_open")}</span>` : ""}</div>
      <div class="hsts" style="--c:${o.energy ? 4 : 3}">${statHead}${statRows}</div>`;
  }

  // Hover / touch tooltip for bar charts and sparklines: elements with data-tip="title|value".
  _bindTips() {
    for (const box of this.shadowRoot.querySelectorAll(".chw")) {
      if (!box.querySelector("[data-tip]")) continue;
      const svg = box.querySelector("svg"), tip = box.querySelector(".tip");
      const hide = () => { tip.style.display = "none"; };
      const move = (ev) => {
        const el = ev.target.closest && ev.target.closest("[data-tip]");
        if (!el) return hide();
        const [h, v] = el.getAttribute("data-tip").split("|");
        // getAttribute returns decoded text: build nodes instead of re-parsing it as markup
        const hb = document.createElement("b"), vd = document.createElement("div");
        hb.textContent = h; vd.textContent = v;
        tip.replaceChildren(hb, vd);
        tip.style.display = "block";
        const r = box.getBoundingClientRect(), px = ev.clientX - r.left;
        tip.style.left = `${Math.max(0, Math.min(r.width - tip.offsetWidth, px + 12))}px`;
      };
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerdown", move);
      svg.addEventListener("pointerleave", hide);
    }
  }

  _bindChart() {
    const svg = this.shadowRoot.querySelector("svg.ch"), m = this._cm;
    if (!svg || !m) return;
    const tip = svg.parentElement.querySelector(".tip"), xl = svg.querySelector(".xl"), xd = svg.querySelector(".xd");
    const lang = this._hass.language;
    const hide = () => { xl.style.display = "none"; xd.innerHTML = ""; tip.style.display = "none"; };
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (m.W / r.width);
      if (px < m.pl || px > m.W - m.pr) return hide();
      const t = m.t0 + ((px - m.pl) / (m.W - m.pl - m.pr)) * (m.t1 - m.t0);
      const rows = m.series.map((s) => {
        let best = null;
        for (const p of s.pts) if (best === null || Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
        return best && Math.abs(best[0] - t) < (m.t1 - m.t0) / 8 ? { s, p: best } : null;
      }).filter(Boolean);
      if (!rows.length) return hide();
      const fx = m.x(rows[0].p[0]);
      xl.setAttribute("x1", fx); xl.setAttribute("x2", fx); xl.style.display = "";
      xd.innerHTML = rows.map(({ s, p }) => `<circle cx="${fx}" cy="${m.y(p[1])}" r="3.5" fill="${s.color}" stroke="var(--card-background-color)" stroke-width="1.5"/>`).join("");
      const when = new Date(rows[0].p[0] * 1000);
      const wl = m.range === "24h" ? when.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
        : m.range === "1y" ? when.toLocaleDateString(lang, { day: "2-digit", month: "2-digit", year: "numeric" })
          : when.toLocaleString(lang, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      tip.innerHTML = `<b>${wl}</b>${rows.map(({ s, p }) => `<div><i style="background:${s.color}"></i>${s.label} <b>${p[1].toLocaleString(lang, { maximumFractionDigits: 1 })}${m.unit}</b></div>`).join("")}`;
      tip.style.display = "block";
      const left = (fx / m.W) * r.width;
      tip.style.left = `${Math.max(0, Math.min(r.width - tip.offsetWidth, left + 12))}px`;
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerdown", move);
    svg.addEventListener("pointerleave", hide);
  }

  // Bars for daily runtime with the mean outdoor temperature as a line on the right axis.
  _runChart(days) {
    const lang = this._hass.language;
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 190, pl = 34, pr = 34, pt = 12, pb = 22;
    const hs = days.map((x) => x.h || 0), maxH = Math.max(4, Math.ceil(Math.max(...hs)));
    const outs = days.filter((x) => x.out !== undefined).map((x) => x.out);
    const oLo = outs.length ? Math.floor(Math.min(...outs) - 1) : 0, oHi = outs.length ? Math.ceil(Math.max(...outs) + 1) : 1;
    const slot = (W - pl - pr) / days.length, bw = Math.max(3, slot * 0.62);
    const X = (i) => pl + slot * (i + 0.5), Yh = (v) => pt + (1 - v / maxH) * (H - pt - pb), Yo = (v) => pt + (1 - (v - oLo) / Math.max(1, oHi - oLo)) * (H - pt - pb);
    const df = (t) => new Date(t * 1000).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
    const bars = days.map((x, i) => `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Yh(x.h || 0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - pb - Yh(x.h || 0)).toFixed(1)}" rx="2" fill="#3fa660" opacity=".75"/>
      <rect x="${(X(i) - slot / 2).toFixed(1)}" y="${pt}" width="${slot.toFixed(1)}" height="${H - pt - pb}" fill="transparent" data-tip="${df(x.t)}|${(x.h || 0).toLocaleString(lang, { maximumFractionDigits: 1 })} h${x.starts !== undefined ? ` · ${Math.round(x.starts)} ${this._t("hp_starts")}` : ""}${x.out !== undefined ? ` · Ø ${x.out.toLocaleString(lang, { maximumFractionDigits: 1 })} °C` : ""}"/>`).join("");
    const pts = days.map((x, i) => x.out === undefined ? null : `${X(i).toFixed(1)},${Yo(x.out).toFixed(1)}`).filter(Boolean).join(" ");
    const gl = [0, 1, 2, 3].map((i) => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" y2="${(pt + ((H - pt - pb) * i) / 3).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
      <text class="st" x="${pl - 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${Math.round(maxH * (1 - i / 3))}</text>
      ${outs.length ? `<text class="st" x="${W - pr + 6}" y="${(pt + ((H - pt - pb) * i) / 3 + 4).toFixed(1)}" style="font-size:11px">${Math.round(oHi - ((oHi - oLo) * i) / 3)}°</text>` : ""}`).join("");
    const xt = days.map((x, i) => i % Math.ceil(days.length / (W < 420 ? 4 : 8)) === 0 ? `<text class="st" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" style="font-size:11px">${df(x.t)}</text>` : "").join("");
    const sumH = hs.reduce((a, b) => a + b, 0), avgO = outs.length ? outs.reduce((a, b) => a + b, 0) / outs.length : null;
    return `<div class="chw"><svg style="max-width:100%;height:auto" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("runtime")}">${gl}${bars}
      ${pts ? `<polyline fill="none" stroke="#7e57c2" stroke-width="1.8" stroke-linejoin="round" points="${pts}"/>` : ""}${xt}</svg><div class="tip" style="display:none"></div></div>
      <div class="legend"><span><i style="background:#3fa660"></i>${this._t("runtime")} (h)</span>${outs.length ? `<span><i style="background:#7e57c2"></i>${this._t("outside")} (°C)</span>` : ""}
      <span>Σ ${sumH.toLocaleString(lang, { maximumFractionDigits: 0 })} h${avgO === null ? "" : ` · Ø ${this._t("outside")} ${avgO.toLocaleString(lang, { maximumFractionDigits: 1 })} °C`}</span></div>`;
  }

  _energyChart(days) {
    const lang = this._hass.language;
    const data = days.filter((x) => x.w !== undefined).map((x) => ({ t: x.t, kwh: (x.w * 24) / 1000 }));
    if (!data.length) return `<div class="note">${this._t("no_stats")}</div>`;
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 150, pl = 34, pr = 10, pt = 12, pb = 22;
    const max = Math.max(1, Math.ceil(Math.max(...data.map((x) => x.kwh)))), slot = (W - pl - pr) / data.length, bw = Math.max(3, slot * 0.62);
    const X = (i) => pl + slot * (i + 0.5), Y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const df = (t) => new Date(t * 1000).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
    const bars = data.map((x, i) => `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(x.kwh).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - pb - Y(x.kwh)).toFixed(1)}" rx="2" fill="${AMBER}" opacity=".85"/>
      <rect x="${(X(i) - slot / 2).toFixed(1)}" y="${pt}" width="${slot.toFixed(1)}" height="${H - pt - pb}" fill="transparent" data-tip="${df(x.t)}|${x.kwh.toLocaleString(lang, { maximumFractionDigits: 1 })} kWh"/>`).join("");
    const gl = [0, 1, 2].map((i) => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ((H - pt - pb) * i) / 2).toFixed(1)}" y2="${(pt + ((H - pt - pb) * i) / 2).toFixed(1)}" stroke="var(--divider-color)" stroke-width=".6"/>
      <text class="st" x="${pl - 6}" y="${(pt + ((H - pt - pb) * i) / 2 + 4).toFixed(1)}" text-anchor="end" style="font-size:11px">${Math.round(max * (1 - i / 2))}</text>`).join("");
    const xt = data.map((x, i) => i % Math.ceil(data.length / (W < 420 ? 4 : 8)) === 0 ? `<text class="st" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" style="font-size:11px">${df(x.t)}</text>` : "").join("");
    const sum = data.reduce((a, b) => a + b.kwh, 0);
    return `<div class="chw"><svg style="max-width:100%;height:auto" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("energy")}">${gl}${bars}${xt}</svg><div class="tip" style="display:none"></div></div>
      <div class="legend"><span><i style="background:${AMBER}"></i>kWh</span><span>Σ ${sum.toLocaleString(lang, { maximumFractionDigits: 0 })} kWh · Ø ${(sum / data.length).toLocaleString(lang, { maximumFractionDigits: 1 })} kWh/${this._t("day")}</span></div>
      <div class="note">${this._t("energy_note")}</div>`;
  }

}

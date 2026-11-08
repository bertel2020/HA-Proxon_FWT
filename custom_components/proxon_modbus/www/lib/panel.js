import { BLUE, CORAL, AMBER, GREEN } from "./constants.js";
import { ProxonFwtBase } from "./compose.js";

export class ProxonFwtPanel extends ProxonFwtBase {
  get _isPanel() {
    return true;
  }

  constructor() {
    super();
    this._drawerMode = true;
    try { this._boost = JSON.parse(localStorage.getItem("proxon_fwt_boost") || "null"); } catch (e) { this._boost = null; }
    this._config = { max_fan_rpm: 3000, max_compressor_rpm: 6000 };
  }

  set narrow(v) {
    this.toggleAttribute("narrow", !!v);
  }

  set panel(p) {
    this._panel = p;
  }

  set route(r) {
    this._route = r;
  }

  _wantsHistory() {
    return true;
  }

  // ---- rooms tab --------------------------------------------------------

  _roomInfo(r) {
    const s = this._state(r.climate) || { attributes: {}, state: "unavailable" };
    const a = s.attributes, cur = a.current_temperature, tgt = this._tgt(r.climate, a);
    const dev = cur != null && tgt != null ? cur - tgt : 0;
    const heats = this._on(r.ents.ptc_active); // rooms are not heated or cooled individually, only by the PTC element
    const col = Math.abs(dev) <= 0.3 ? GREEN : dev < 0 ? BLUE : CORAL;
    const st = heats ? [this._t("st_heat"), "mdi:fire", CORAL] : Math.abs(dev) <= 0.3 ? [this._t("st_ok"), "mdi:check", GREEN]
      : dev < 0 ? [this._t("st_cool"), "mdi:arrow-down", BLUE] : [this._t("st_warm"), "mdi:arrow-up", CORAL];
    return { r, s, a, cur, tgt, dev, heats, col, st, down: s.state === "unavailable", co2: this._num(r.co2), rf: this._num(r.rf),
      ptcA: this._on(r.ents.ptc_active), ptcE: r.ents.ptc_enable };
  }

  _ring(i) {
    const R0 = 62, C = 2 * Math.PI * R0, arc = C * 0.75, f = (v) => Math.max(0, Math.min(1, (v - 16) / 12));
    const rot = "rotate(135 75 75)";
    const rad = ((i.tgt == null ? 0 : f(i.tgt)) * 270 + 135) * Math.PI / 180;
    const mark = i.tgt == null ? "" : `<circle cx="${75 + R0 * Math.cos(rad)}" cy="${75 + R0 * Math.sin(rad)}" r="7" fill="var(--card-background-color)" stroke="var(--primary-text-color)" stroke-width="2.5"/>`;
    return `<div class="ring"><svg viewBox="0 0 150 150" aria-hidden="true">
      <circle cx="75" cy="75" r="${R0}" fill="none" stroke="var(--card-background-color)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${arc} ${C}" transform="${rot}"/>
      ${i.cur == null ? "" : `<circle cx="75" cy="75" r="${R0}" fill="none" stroke="${i.col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${Math.max(0.1, arc * f(i.cur))} ${C}" transform="${rot}"/>`}${mark}</svg>
      <div class="c"><div><b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</b><small>${this._t("actual")}</small></div></div></div>`;
  }

  _stepper(n, i) {
    return `<div class="stp">${this._btn(`data-act="rstep" data-v="${n}|-1" aria-label="−"`, "round", this._icon("mdi:minus"), i.down)}
      <div class="t"><small>${this._t("target")}</small><b>${i.tgt == null ? "–" : this._fmt(i.tgt, i.tgt % 1 ? 1 : 0) + "°"}</b></div>
      ${this._btn(`data-act="rstep" data-v="${n}|1" aria-label="+"`, "round", this._icon("mdi:plus"), i.down)}</div>`;
  }

  _roomChips(i) {
    const c = (v) => (v > 1000 ? "r" : v > 800 ? "w" : "g");
    return `${i.co2 != null ? `<span class="chip ${c(i.co2)}">${this._icon("mdi:molecule-co2")}${Math.round(i.co2)}</span>` : ""}${i.rf != null ? `<span class="chip">${this._icon("mdi:water-percent")}${Math.round(i.rf)} %</span>` : ""}${i.ptcA ? `<span class="chip w">${this._icon("mdi:radiator")}PTC</span>` : ""}`;
  }

  // 24 h room temperature with target line, loaded on demand from the recorder history of the climate entity.
  _roomSpark(i) {
    const id = i.r.climate;
    const data = this._hget(`rt|${id}`, async () => {
      const end = new Date(), start = new Date(end.getTime() - 864e5);
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: [id], include_start_time_state: true, significant_changes_only: false });
      const pts = [], tg = [];
      for (const p of res[id] || []) {
        const t = p.lu ?? Date.parse(p.last_updated) / 1000, at = p.a || p.attributes || {};
        if (isNaN(t)) continue;
        if (at.current_temperature != null) pts.push([t, Number(at.current_temperature)]);
        if (at.temperature != null) tg.push([t, Number(at.temperature)]);
      }
      return { pts: ProxonFwtBase._down(pts, 120), tg, t0: start.getTime() / 1000, t1: end.getTime() / 1000 };
    });
    if (data === undefined) return this._skel(84);
    if (!data || data.pts.length < 2) return `<div class="note">${this._t("r_noh")}</div>`;
    const W = 300, H = 70, vals = data.pts.map((p) => p[1]).concat(i.tgt == null ? [] : [i.tgt]);
    const lo = Math.min(...vals) - 0.4, hi = Math.max(...vals) + 0.4, y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const x = (t) => ((t - data.t0) / (data.t1 - data.t0)) * W;
    const line = data.pts.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
    const last = data.pts[data.pts.length - 1];
    const lang = this._hass.language, sw = W / data.pts.length;
    const hits = data.pts.map((p) => `<rect x="${(x(p[0]) - sw / 2).toFixed(1)}" y="0" width="${sw.toFixed(1)}" height="${H}" fill="transparent" data-tip="${new Date(p[0] * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}|${this._fmt(p[1])} °C"/>`).join("");
    return `<div class="chw"><svg viewBox="0 0 ${W} ${H + 14}" style="width:100%;height:auto" role="img" aria-label="${this._t("r_t24")}">
      ${i.tgt == null ? "" : `<line x1="0" x2="${W}" y1="${y(i.tgt)}" y2="${y(i.tgt)}" stroke="var(--secondary-text-color)" stroke-dasharray="4 4" opacity=".6"/><text x="${W}" y="${Math.max(10, y(i.tgt) - 4)}" text-anchor="end" font-size="10" fill="var(--secondary-text-color)">${this._t("r_set", this._fmt(i.tgt, 0))}</text>`}
      <polyline fill="none" stroke="${i.col}" stroke-width="2.2" stroke-linejoin="round" points="${line}"/>
      <circle cx="${x(last[0])}" cy="${y(last[1])}" r="4" fill="${i.col}"/>
      <text x="0" y="${H + 12}" font-size="10" fill="var(--secondary-text-color)">${this._t("r_ago")}</text><text x="${W}" y="${H + 12}" text-anchor="end" font-size="10" fill="var(--secondary-text-color)">${this._t("r_now")}</text>${hits}</svg><div class="tip" style="display:none"></div></div>`;
  }

  _roomFacts(n, i) {
    const a = i.a;
    return `<div><h4>${this._t("r_details")}</h4>
      ${a.min_temp != null ? `<div class="f"><span>${this._t("adjustable")}</span><b>${this._fmt(a.min_temp, 0)}–${this._fmt(a.max_temp, 0)} °C</b></div>` : ""}
      ${i.co2 != null ? `<div class="f"><span>${this._t("co2")}</span><b>${Math.round(i.co2)} ppm</b></div>` : ""}
      ${i.rf != null ? `<div class="f"><span>${this._t("humidity")}</span><b>${Math.round(i.rf)} %</b></div>` : ""}
      ${i.r.ents.ptc_active ? `<div class="f"><span>${this._t("ptc")}</span><b>${i.ptcA ? this._t("ptc_active") : this._t("ptc_off")}</b></div>` : ""}
      ${i.ptcE ? `<div class="f"><span>${this._t("ptc_enabled")}</span><ha-switch data-act="rptc" data-v="${n}" ${this._on(i.ptcE) ? "checked" : ""} ${this._ok(i.ptcE) ? "" : "disabled"}></ha-switch></div>` : ""}</div>`;
  }

  _roomCard(n, i) {
    return `<div class="rc"><div class="rh" role="button" tabindex="0" aria-haspopup="dialog" data-act="rtoggle" data-v="${n}">
      <span class="ri">${this._icon(this._roomIcon(i.r.name))}</span><b>${i.r.name}</b>
      <span class="st" style="--c:${i.st[2]}">${this._icon(i.st[1])}${i.st[0]}</span><span class="chev">${this._icon("mdi:arrow-expand-all")}</span></div>
      <div class="rb">${this._ring(i)}<div class="rctl">${this._stepper(n, i)}<div class="mp">${this._roomChips(i)}</div></div></div></div>`;
  }

  // Details open in a dialog (bottom sheet on phones), so the room grid never reflows.
  _roomDialog(all) {
    const id = this._ropen && [...this._ropen][0];
    const hit = id && all.find(([, i]) => i.r.climate === id);
    if (!hit) return "";
    const [n, i] = hit;
    return `<div class="rdlg" data-act="rclose"><div class="rsheet rc open" role="dialog" aria-modal="true" aria-label="${i.r.name}" data-act="noop">
      <div class="rh"><span class="ri">${this._icon(this._roomIcon(i.r.name))}</span><b>${i.r.name}</b>
      <span class="st" style="--c:${i.st[2]}">${this._icon(i.st[1])}${i.st[0]}</span><button class="x" data-act="rclose" aria-label="${this._t("close")}">${this._icon("mdi:close")}</button></div>
      <div class="rb">${this._ring(i)}<div class="rctl">${this._stepper(n, i)}<div class="mp">${this._roomChips(i)}</div></div></div>
      <div class="rmore"><div><h4>${this._t("r_t24")}</h4>${this._roomSpark(i)}</div>${this._roomFacts(n, i)}</div></div></div>`;
  }

  _roomCmp(rows) {
    return `<div class="rcmp"><div class="cscale"><div></div><div><span>−2 °C</span><span>${this._t("target")}</span><span>+2 °C</span></div><div></div></div>
      ${rows.map(([n, i], k) => {
        const pct = Math.max(-1, Math.min(1, i.dev / 2)) * 50;
        return `<div class="crow ${k === 0 ? "first" : ""}" style="--c:${i.col}" role="button" tabindex="0" aria-haspopup="dialog" data-act="rtoggle" data-v="${n}">
          <div class="n">${this._icon(this._roomIcon(i.r.name))}${i.r.name}</div>
          <div class="axis"><div class="zero"></div><div class="bar" style="left:${pct < 0 ? 50 + pct : 50}%;width:${Math.abs(pct)}%"></div><div class="dot" style="left:${50 + pct}%"></div></div>
          <div class="v"><b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</b><small>→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</small></div></div>
`;
      }).join("")}</div>`;
  }

  _roomList(rows) {
    return rows.map(([n, i]) => {
      return `<div class="lcard"><div class="rh lrow" role="button" tabindex="0" aria-haspopup="dialog" data-act="rtoggle" data-v="${n}"><span class="ri">${this._icon(this._roomIcon(i.r.name))}</span><b>${i.r.name}</b>
        <span class="t2">${this._roomChips(i)}<b style="color:${i.col}">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</b><span class="lb">→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</span></span></div></div>`;
    }).join("");
  }

  // Even rows: as many columns as fit, but never a short last row if fewer columns spread the cards better.
  _roomCols(n) {
    const w = (this.clientWidth || 900) - 32, max = Math.max(1, Math.min(6, Math.floor((w + 12) / 262)));
    return Math.ceil(n / Math.ceil(n / max)) || 1;
  }

  _sec_rooms(d) {
    if (!d.rooms.length) return `<ha-card>${this._header("mdi:home-outline", this._t("rooms"))}<div class="note">${this._t("no_rooms")}</div></ha-card>`;
    this._ropen = this._ropen || new Set();
    const view = ["cards", "cmp", "list"].includes(this._rview) ? this._rview : "cards";
    const filter = ["all", "heat", "ena", "dev", "co2"].includes(this._rfilter) ? this._rfilter : "all";
    const all = d.rooms.map((r, n) => [n, this._roomInfo(r)]);
    const temps = all.filter(([, i]) => i.cur != null), rfs = all.filter(([, i]) => i.rf != null), cos = all.filter(([, i]) => i.co2 != null);
    const avg = temps.length ? temps.reduce((a, [, i]) => a + i.cur, 0) / temps.length : null;
    const top = cos.sort((a, b) => b[1].co2 - a[1].co2)[0];
    const arf = rfs.length ? rfs.reduce((a, [, i]) => a + i.rf, 0) / rfs.length : null;
    const sum = (ic, c, label, val, unit) => `<div class="rs" style="--c:${c}"><span class="ic">${this._icon(ic)}</span><div><small>${label}</small><b>${val}<span>${unit}</span></b></div></div>`;
    const summary = `<div class="rsum">${avg === null ? "" : sum("mdi:thermometer", BLUE, this._t("rs_avg"), this._fmt(avg), " °C")}
      ${sum("mdi:fire", CORAL, this._t("rs_heat"), all.filter(([, i]) => i.heats).length, ` ${this._t("rs_active")} · ${all.filter(([, i]) => i.ptcE && this._on(i.ptcE)).length} ${this._t("rs_enabled")}`)}
      ${top ? sum("mdi:molecule-co2", AMBER, this._t("rs_co2"), Math.round(top[1].co2), ` ppm · ${top[1].r.name}`) : ""}
      ${arf === null ? "" : sum("mdi:water-percent", "var(--primary-color)", this._t("rs_rf"), Math.round(arf), " %")}</div>`;
    let rows = all.filter(([, i]) => filter === "all" || (filter === "heat" && i.heats) || (filter === "ena" && i.ptcE && this._on(i.ptcE)) || (filter === "dev" && Math.abs(i.dev) > 0.3) || (filter === "co2" && i.co2 != null && i.co2 > 800));
    if (filter === "dev") rows = rows.sort((a, b) => Math.abs(b[1].dev) - Math.abs(a[1].dev));
    const seg = [["cards", "mdi:view-grid-outline"], ["cmp", "mdi:chart-bar"], ["list", "mdi:format-list-bulleted"]]
      .map(([k, ic]) => `<button class="${k === view ? "a" : ""}" data-act="rview" data-v="${k}" aria-pressed="${k === view}">${this._icon(ic)}${this._t(`rv_${k}`)}</button>`).join("");
    const chips = [["all", ""], ["heat", "mdi:fire"], ["ena", "mdi:fire-circle"], ["dev", "mdi:swap-vertical"], ["co2", "mdi:molecule-co2"]]
      .map(([k, ic]) => `<button class="fchip ${k === filter ? "a" : ""}" data-act="rfilter" data-v="${k}" aria-pressed="${k === filter}">${ic ? this._icon(ic) : ""}${this._t(`rf_${k}`)}</button>`).join("");
    const body = !rows.length ? `<div class="note" style="text-align:center;padding:18px">${this._t("rs_none")}</div>`
      : view === "cards" ? `<div class="rgrid" style="--rc:${this._roomCols(rows.length)}">${rows.map(([n, i]) => this._roomCard(n, i)).join("")}</div>`
      : view === "cmp" ? this._roomCmp(rows) : this._roomList(rows);
    return `<ha-card><div class="rtop"><div class="h" style="margin:0">${this._icon("mdi:home-outline")}${this._t("rooms")}</div><span class="grow"></span><div class="rseg" role="group">${seg}</div></div>
      ${summary}<div class="rfil">${chips}<span class="grow"></span>
      <button class="fchip" data-act="allroom" data-v="-1">${this._icon("mdi:thermometer-minus")}${this._t("all_down")}</button>
      <button class="fchip" data-act="allroom" data-v="1">${this._icon("mdi:thermometer-plus")}${this._t("all_up")}</button></div>
      ${body}<div class="rlegend"><span style="color:${BLUE}">${this._icon("mdi:arrow-down")}${this._t("legend_cool")}</span><span style="color:${GREEN}">${this._icon("mdi:check")}${this._t("legend_ok")}</span><span style="color:${CORAL}">${this._icon("mdi:arrow-up")}${this._t("legend_warm")}</span><span>${this._icon("mdi:gesture-tap")}${this._t("r_tapnote")}</span></div>${this._roomDialog(all)}</ha-card>`;
  }

  _render() {
    const d = this._d;
    const tab = ["overview", "rooms", "history", "diag"].includes(this._tab) ? this._tab : "overview";
    const bad = d ? this._insights(d).filter((i) => i.lvl === "r" || i.lvl === "w") : [];
    const warn = (k) => bad.filter((i) => i.tab === k).length; // each hint counts on the tab it leads to
    const tabs = [["overview", "mdi:view-dashboard-outline"], ["rooms", "mdi:home-outline"], ["history", "mdi:chart-line"], ["diag", "mdi:stethoscope"]]
      .map(([k, i]) => `<button class="tabbtn ${k === tab ? "a" : ""}" role="tab" aria-selected="${k === tab}" data-act="tab" data-v="${k}">${this._icon(i)}${this._t(`tab_${k}`)}${warn(k) ? `<span class="badge">${warn(k)}</span>` : ""}</button>`).join("");
    const head = `<div class="bar-top">
      <button class="round menu" data-act="menu" aria-label="Menu">${this._icon("mdi:menu")}</button>
      <div class="brand"><span class="logo"><img src="/proxon_modbus/icon.png" alt="" width="30" height="30"></span><h1>Proxon FWT</h1></div><div class="grow"></div><div class="hchips">${this._headChips(d)}</div>
</div>
      <nav class="tabs" role="tablist">${tabs}</nav>`;
    let body;
    if (!d) {
      body = `<ha-card><div class="empty">${this._t("none")}</div></ha-card>`;
    } else if (tab === "overview") {
      body = `<div class="stack">${this._sec_alerts(d)}
        <div class="ov"><div class="col">${this._sec_schema(d)}${this._sec_kpi(d)}</div><div class="col">${this._sec_operation(d)}</div></div></div>`;
    } else if (tab === "rooms") {
      body = `<div class="stack">${this._sec_rooms(d)}</div>`;
    } else if (tab === "history") {
      body = `<div class="stack">${this._sec_history(d)}${this._sec_runtime(d)}${this._sec_energy(d)}${this._sec_year(d)}</div>`;
    } else {
      body = `<div class="stack">${this._sec_insights(d)}${this._diagTab(d)}</div>`;
    }
    this.shadowRoot.innerHTML = `${this._styleTag()}<div class="panel">${head}${body}</div>`;
  }
}

import { BLUE, CORAL, AMBER, GREEN, RANGE_MS, esc } from "./constants.js";

const PROGRAMS = ["off", "normal", "pv", "minimum", "night"];
const PHASE_COLOR = { pv: GREEN, normal: AMBER, minimum: CORAL, night: BLUE };
const TARGETS = [["twwp_target_normal", "tw_t_normal"], ["twwp_target_pv", "tw_t_pv"], ["twwp_target_min", "tw_t_min"]];
const HYSTS = [["twwp_hyst_low", "tw_h_low"], ["twwp_hyst_high", "tw_h_high"]];
const MIN_BAND = 2; // K: below this the heat pump may switch on and off in short intervals
const T_LO = 20, T_HI = 70; // the tank graphic and the number entities share this range

// The "Warmwasser" tab: hot water heat pump (TWWP) with tank, targets, program and the controller's last decision.
export class TwwpSectionsMethods {
  // Per-TWWP options the integration sends over the settings websocket (matched by the TWWP device id).
  _twCfg(t) {
    const list = (this._settings && this._settings.twwp) || [];
    return list.find((x) => x.device_id === t.id) || {};
  }

  // Every entity the tab shows, so a change in any of them redraws the panel.
  _twIds(t) {
    const c = this._twCfg(t);
    return [t.heater, ...Object.values(t.ents), c.water_temp, c.outer_temp, c.pv_power, c.power_entity, c.energy_entity, c.enable_switch, c.enable_pv_switch].filter(Boolean);
  }

  _twWater(t) {
    const c = this._twCfg(t), v = c.water_temp ? this._num(c.water_temp) : null;
    if (v !== null) return v;
    const a = (this._state(t.heater) || { attributes: {} }).attributes;
    return a.current_temperature != null && !isNaN(Number(a.current_temperature)) ? Number(a.current_temperature) : null;
  }

  // A power sensor may report kW or MW; the tab shows W.
  _twPowerW(id) {
    const v = this._num(id);
    if (v === null) return null;
    const u = String(((this._state(id) || { attributes: {} }).attributes.unit_of_measurement) || "W").trim();
    return v * (u === "kW" ? 1e3 : u === "MW" ? 1e6 : 1);
  }

  // A target not yet written wins over the value the controller last reported.
  _twTarget(id) {
    const p = this._twp && this._twp[id];
    return p ? p.t : this._num(id);
  }

  // The +/- steps add up on a pending target that is written once, shortly after the last click.
  _twBump(id, dir) {
    const a = (this._state(id) || {}).attributes || {}, step = Number(a.step) || 1;
    const pend = (this._twp = this._twp || {}), e = pend[id] || {};
    const cur = e.t ?? this._num(id);
    if (cur === null) return;
    const t = Math.min(a.max ?? 70, Math.max(a.min ?? 30, Math.round((cur + dir * step) / step) * step));
    if (e.t === t) return;
    clearTimeout(e.timer);
    const fire = () => {
      if (this._wbusy) { pend[id].timer = setTimeout(fire, 200); return; }
      this._write(() => this._hass.callService("number", "set_value", { entity_id: id, value: t }))
        .finally(() => { if (pend[id] && pend[id].t === t) delete pend[id]; this._sig = ""; this._update(); });
    };
    pend[id] = { t, timer: setTimeout(fire, 500) };
    this._sig = ""; this._update();
  }

  // The program of the first heat pump as a quiet chip next to the heat pump status in the header.
  _twHeadChip(d) {
    const t = d && d.twwp && d.twwp[0], id = t && t.ents.twwp_program;
    if (!id || !this._ok(id)) return "";
    return `<span class="hchip m">${this._icon("mdi:water-boiler")}${this._t(`tw_p_${this._state(id).state}`)}</span>`;
  }

  // Overview tile (panel only): water temperature and program of each heat pump; a click opens the Hot water tab.
  _twKpi(d) {
    const many = d.twwp.length > 1;
    return d.twwp.map((t) => {
      const w = this._twWater(t), prog = this._ok(t.ents.twwp_program) ? this._state(t.ents.twwp_program).state : null;
      const bad = this._on(t.ents.twwp_sensor_problem);
      const col = bad ? "#db4437" : PHASE_COLOR[prog] || "var(--secondary-text-color)";
      const sub = bad ? this._t("tw_problem") : prog ? this._t(`tw_p_${prog}`) : "";
      return `<div class="k go" style="--kc:${col}" data-act="tab" data-v="warm" role="button" tabindex="0"><div class="ic">${this._icon(bad ? "mdi:alert-outline" : "mdi:water-boiler")}</div>
        <div><div class="lb">${many ? t.name : this._t("tab_warm")}</div><div class="v">${w === null ? "–" : `${this._fmt(w)}°`}</div><div class="lb">${sub}</div></div></div>`;
    }).join("");
  }

  // Banners for the overview (panel only): a failed sensor, and a controller in dry run that would act differently.
  _twAlerts(d) {
    const out = [], many = d.twwp.length > 1;
    for (const t of d.twwp) {
      const name = many ? t.name : this._t("tab_warm"), ctl = t.ents.twwp_control;
      if (this._on(t.ents.twwp_sensor_problem)) {
        out.push(["r", "mdi:alert-outline", `${name}: ${this._t("tw_alert_problem")}`, "warm"]);
      } else if (ctl && this._state(ctl) && this._state(ctl).state === "off") {
        const n = this._num(t.ents.twwp_planned);
        if (n !== null && n > 0) out.push(["i", "mdi:eye-outline", `${name}: ${this._t(n === 1 ? "tw_alert_obs_1" : "tw_alert_obs_n", String(n))}`, "warm"]);
      }
    }
    return out;
  }

  _twAge(iso) {
    const s = iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)) : NaN;
    if (isNaN(s)) return "–";
    return s < 90 ? this._t("tw_ago_s", String(s)) : this._t("tw_ago_m", String(Math.round(s / 60)));
  }

  _twRow(label, value, extra = "") {
    return `<div class="f"><span>${label}</span><b ${extra}>${value}</b></div>`;
  }

  // The unit is one housing: the heat pump head with fan and vents on top of the tank. The tank is filled evenly
  // (one sensor in the middle cannot tell the layers apart); a slim scale beside it shows the water temperature
  // and the three targets.
  _twTank(t, i) {
    const c = this._twCfg(t), w = this._twWater(t);
    const tn = this._num(t.ents.twwp_target_normal), tp = this._num(t.ents.twwp_target_pv), tm = this._num(t.ents.twwp_target_min);
    const pw = c.power_entity ? this._twPowerW(c.power_entity) : null, pv = c.pv_power ? this._twPowerW(c.pv_power) : null;
    const heats = pw !== null && pw > 100;
    const Y0 = 70, Y1 = 176, y = (v) => Y1 - Math.max(0, Math.min(1, (v - T_LO) / (T_HI - T_LO))) * (Y1 - Y0);
    const col = w === null ? "var(--divider-color)" : tn !== null && w >= tn ? CORAL : tm !== null && w >= tm ? AMBER : BLUE;
    const outer = c.outer_temp ? this._num(c.outer_temp) : null;
    const tick = (v, l) => (v === null ? "" : `<line x1="124" x2="130" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--secondary-text-color)"/><text x="133" y="${(y(v) + 3).toFixed(1)}" font-size="9" fill="var(--secondary-text-color)">${l}</text>`);
    const svg = `<svg class="twtank ${heats ? "heat" : ""}" viewBox="0 0 160 190" role="img" aria-label="${this._t("tw_tank")} ${w === null ? "" : this._fmt(w) + "°"}">
      <defs><clipPath id="twc${i}"><rect x="8" y="6" width="96" height="178" rx="22"/></clipPath></defs>
      <rect x="8" y="6" width="96" height="178" rx="22" fill="var(--card-background-color)" stroke="var(--divider-color)" stroke-width="1.5"/>
      <g clip-path="url(#twc${i})">
        <rect x="8" y="${Y0 - 2}" width="96" height="${Y1 - Y0 + 10}" fill="${col}" opacity=".42"/>
        <rect x="16" y="${Y0 + 6}" width="6" height="${Y1 - Y0 - 8}" rx="3" fill="#fff" opacity=".28"/>
        <rect x="8" y="6" width="96" height="60" fill="var(--secondary-background-color)"/>
        <rect x="8" y="64" width="96" height="4" fill="var(--divider-color)" opacity=".8"/>
      </g>
      <circle cx="40" cy="32" r="16" fill="none" stroke="var(--secondary-text-color)" stroke-width="1.4" opacity=".7"/>
      <g class="fan" fill="var(--secondary-text-color)" opacity=".75">${[0, 120, 240].map((r) => `<ellipse cx="40" cy="24" rx="4.6" ry="8" transform="rotate(${r} 40 32)"/>`).join("")}<circle cx="40" cy="32" r="3" fill="var(--card-background-color)"/></g>
      <g stroke="var(--secondary-text-color)" stroke-width="2" stroke-linecap="round" opacity=".5"><line x1="68" x2="92" y1="24" y2="24"/><line x1="68" x2="92" y1="32" y2="32"/><line x1="68" x2="92" y1="40" y2="40"/></g>
      <circle cx="92" cy="52" r="3.4" fill="${heats ? GREEN : "var(--divider-color)"}"/>
      <text x="40" y="58" font-size="10" text-anchor="middle" fill="var(--secondary-text-color)">${outer === null ? "" : this._fmt(outer) + "°"}</text>
      <circle cx="22" cy="123" r="4.5" fill="var(--card-background-color)" stroke="var(--primary-text-color)" stroke-width="1.6"/>
      <text x="62" y="130" text-anchor="middle" font-size="22" font-weight="500" fill="var(--primary-text-color)">${w === null ? "–" : this._fmt(w) + "°"}</text>
      <line x1="120" x2="120" y1="${Y0}" y2="${Y1}" stroke="var(--divider-color)" stroke-width="3" stroke-linecap="round"/>
      ${tick(tp, this._fmt(tp, 0))}${tick(tn, this._fmt(tn, 0))}${tick(tm, this._fmt(tm, 0))}
      ${w === null ? "" : `<path d="M112 ${(y(w) - 5).toFixed(1)} L119 ${y(w).toFixed(1)} L112 ${(y(w) + 5).toFixed(1)} Z" fill="${col}"/>`}</svg>`;
    const en = c.energy_entity && this._num(c.energy_entity) !== null ? `${this._fmt(this._num(c.energy_entity), 0)} ${(this._state(c.energy_entity).attributes.unit_of_measurement) || "kWh"}` : null;
    const rows = [
      outer !== null ? this._twRow(this._t("tw_top"), `${this._fmt(outer)}°`) : "",
      pw !== null ? this._twRow(this._t("tw_hp"), heats ? `<span class="chip g">${this._t("tw_heats")}</span>` : this._t("tw_idle")) : "",
      pw !== null ? this._twRow(this._t("power"), `${this._fmt(pw, 0)} W`) : "",
      en ? this._twRow(this._t("tw_energy"), en) : "",
      pv !== null ? this._twRow(this._t("tw_pv_power"), `${this._fmt(pv / 1000)} kW`) : "",
    ].join("");
    return `<ha-card>${this._header("mdi:water-thermometer-outline", this._t("tw_tank"))}<div class="twtk">${svg}<div class="rows twrows">${rows}</div></div>
      <div class="note">${this._t("tw_tank_note")}</div></ha-card>`;
  }

  _twStepper(id, label, unit = "°") {
    const down = !this._ok(id), v = this._twTarget(id);
    return `<div class="f"><span>${label}</span><span class="twstp">
      ${this._btn(`data-act="twstep" data-v="${id}|-1" aria-label="−"`, "round", this._icon("mdi:minus"), down)}
      <b>${v === null ? "–" : this._fmt(v, v % 1 ? 1 : 0) + unit}</b>
      ${this._btn(`data-act="twstep" data-v="${id}|1" aria-label="+"`, "round", this._icon("mdi:plus"), down)}</span></div>`;
  }

  _twTargets(t) {
    const lo = this._twTarget(t.ents.twwp_hyst_low), hi = this._twTarget(t.ents.twwp_hyst_high);
    const hyst = HYSTS.filter(([k]) => t.ents[k]);
    const warn = lo !== null && hi !== null && lo + hi < MIN_BAND;
    return `<ha-card>${this._header("mdi:tune-variant", this._t("tw_targets"))}<div class="rows">${TARGETS.map(([k, l]) => (t.ents[k] ? this._twStepper(t.ents[k], this._t(l)) : "")).join("")}</div>
      ${hyst.length ? `<div class="lbl2">${this._t("tw_hyst_h")}</div><div class="rows">${hyst.map(([k, l]) => this._twStepper(t.ents[k], this._t(l), " K")).join("")}</div>` : ""}
      <div class="note">${lo !== null && hi !== null ? this._t("tw_hyst", this._fmt(lo, lo % 1 ? 1 : 0), this._fmt(hi, hi % 1 ? 1 : 0)) : ""}</div>
      ${warn ? `<div class="note" style="color:#c98400">${this._t("tw_hyst_warn")}</div>` : ""}</ha-card>`;
  }

  // The program is chosen by the controller, so it is only shown; the switch lets the controller take over.
  _twOperation(t) {
    const c = this._twCfg(t), prog = this._ok(t.ents.twwp_program) ? this._state(t.ents.twwp_program).state : null;
    const segs = PROGRAMS.map((p) => `<span class="${p === prog ? "a" : ""}" style="--mc:${PHASE_COLOR[p] || "var(--secondary-text-color)"}">${this._t(`tw_p_${p}`)}</span>`).join("");
    const ctl = t.ents.twwp_control, ctlOn = this._on(ctl);
    const pvs = this._ok(t.ents.twwp_pv_status) ? this._state(t.ents.twwp_pv_status).state : null;
    const en = (id, label) => (id && this._state(id) ? this._twRow(label, this._t(this._on(id) ? "tw_on" : "tw_off")) : "");
    return `<ha-card>${this._header("mdi:cog-outline", this._t("tw_op"))}
      <div class="lbl2">${this._t("tw_program")}</div><div class="twprog" role="img" aria-label="${this._t("tw_program")}: ${prog ? this._t(`tw_p_${prog}`) : "–"}">${segs}</div>
      <div class="note">${this._t("tw_prog_note")}</div>
      ${ctl ? `<div class="f twctl"><div><b>${this._t("tw_ctl")}</b><small>${this._t(ctlOn ? "tw_ctl_on" : "tw_ctl_off")}</small></div>
        <ha-switch data-act="twctl" data-v="${ctl}" ${ctlOn ? "checked" : ""} ${this._ok(ctl) ? "" : "disabled"}></ha-switch></div>` : ""}
      <div class="rows">${pvs ? this._twRow(this._t("tw_pvstatus"), `<span class="chip ${pvs === "pv" ? "g" : pvs === "too_cold" ? "w" : ""}">${this._t(`tw_pv_${pvs}`)}</span>`) : ""}
        ${en(c.enable_switch, this._t("tw_en"))}${en(c.enable_pv_switch, this._t("tw_en_pv"))}</div></ha-card>`;
  }

  _twDecision(t) {
    const r = t.ents.twwp_reason, rs = this._state(r), at = (rs && rs.attributes) || {};
    const pl = t.ents.twwp_planned, plN = this._num(pl);
    const prob = t.ents.twwp_sensor_problem, bad = this._on(prob);
    const ok = this._ok(r);
    const sw = pl && this._state(pl) ? Object.entries(this._state(pl).attributes.switches || {}).map(([e, v]) => `${esc(e)} → ${this._t(v === "on" ? "tw_on" : "tw_off")}`).join("<br>") : "";
    return `<ha-card>${this._header("mdi:stethoscope", this._t("tw_dec"), ok ? this._twAge(at.last_run) : "")}
      <div class="twreason">${ok ? this._t(`tw_r_${rs.state}`) : "–"}</div>
      <div class="rows">${plN !== null ? this._twRow(this._t("tw_planned"), String(plN)) : ""}${sw ? `<div class="note">${sw}</div>` : ""}
        ${prob ? this._twRow(this._t("tw_problem"), this._t(bad ? "tw_yes" : "tw_no"), bad ? `style="color:#db4437"` : "") : ""}
        ${at.last_error ? this._twRow(this._t("tw_err"), esc(at.last_error), `style="color:#db4437"`) : ""}</div></ha-card>`;
  }

  // Entity behind one measurement of the history card; `attr` marks the water_heater fallback (its attribute, no statistics).
  _twMetrics(t) {
    const c = this._twCfg(t);
    return [
      { k: "water", icon: "mdi:water-thermometer-outline", label: "tw_m_water", unit: "°", color: BLUE, id: c.water_temp || t.heater, attr: !c.water_temp },
      { k: "power", icon: "mdi:flash", label: "power", unit: " W", color: AMBER, id: c.power_entity },
      { k: "pv", icon: "mdi:weather-sunny", label: "tw_pv_power", unit: " W", color: GREEN, id: c.pv_power },
      { k: "outer", icon: "mdi:thermometer", label: "tw_top", unit: "°", color: CORAL, id: c.outer_temp },
    ].filter((m) => m.id);
  }

  // One curve over the shared history range. Short ranges come from the recorder history, long ones from the statistics;
  // the heating time (power above 100 W) is added up from the raw points before they are thinned out.
  async _twLoadSeries(m, range, prev) {
    const ms = RANGE_MS[range], end = new Date(Date.now() - (prev ? ms : 0)), start = new Date(end.getTime() - ms), long = range === "30d" || range === "1y";
    let pts;
    if (long) {
      if (m.attr) return [];
      const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        statistic_ids: [m.id], period: range === "1y" ? "day" : "hour", types: ["mean"] });
      pts = (res[m.id] || []).map((r) => [r.start / 1000, Number(r.mean)]);
    } else {
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: [m.id], minimal_response: !m.attr, no_attributes: !m.attr, significant_changes_only: false });
      pts = (res[m.id] || []).map((p) => [p.lu ?? Date.parse(p.last_updated) / 1000, m.attr ? Number((p.a || p.attributes || {}).current_temperature) : Number(p.s ?? p.state)]);
    }
    pts = pts.filter(([t, v]) => !isNaN(t) && !isNaN(v));
    if (m.unit === " W") { // a sensor may report kW or MW
      const u = String(((this._state(m.id) || { attributes: {} }).attributes.unit_of_measurement) || "W").trim(), k = u === "kW" ? 1e3 : u === "MW" ? 1e6 : 1;
      if (k !== 1) pts = pts.map(([t, v]) => [t, v * k]);
    }
    let heat = null;
    if (m.k === "power" && !long) {
      heat = 0;
      pts.forEach(([t, v], i) => { if (v > 100) heat += (i + 1 < pts.length ? pts[i + 1][0] : end.getTime() / 1000) - t; });
    }
    let out = pts.length ? [{ label: this._t(m.label), color: m.color, pts: this.constructor._down(pts, 360) }] : [];
    if (prev) out = out.map((x) => ({ ...x, prev: true, label: `${x.label} · ${this._t("prev_period")}`, pts: x.pts.map(([t, v]) => [t + ms / 1000, v]) }));
    out.heat = heat;
    return out;
  }

  // Program phases from the history of the program sensor (not kept as long-term statistics, so only for 24 h and 7 d).
  async _twLoadPhases(pid, range) {
    const end = new Date(), start = new Date(end.getTime() - RANGE_MS[range]);
    const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: [pid], minimal_response: true, no_attributes: true, significant_changes_only: false });
    const rows = (res[pid] || []).map((p) => [p.lu ?? Date.parse(p.last_updated) / 1000, String(p.s ?? p.state)]).filter(([t]) => !isNaN(t));
    const iv = {};
    rows.forEach(([t, st], i) => { (iv[st] = iv[st] || []).push([t, i + 1 < rows.length ? rows[i + 1][0] : end.getTime() / 1000]); });
    return ["pv", "normal", "minimum", "night"].map((k) => ({ iv: iv[k] || [], color: PHASE_COLOR[k], label: this._t(`tw_p_${k}`) }));
  }

  _twFmtDur(s) {
    const m = Math.round(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  }

  // History card: same range and previous-period switch as the FWT history, one measurement at a time.
  _twHistory(t) {
    const metrics = this._twMetrics(t);
    if (!metrics.length) return "";
    const range = this._range(), m = metrics.find((x) => x.k === this._twMetric) || metrics[0], hist = range === "24h" || range === "7d";
    const key = (x, prev) => `tws|${x.id}|${x.attr ? "a" : "s"}|${range}${prev ? "|prev" : ""}`;
    let series = this._hget(key(m), () => this._twLoadSeries(m, range));
    if (this._hcmp && series) {
      const prev = this._hget(key(m, true), () => this._twLoadSeries(m, range, true));
      if (prev) series = [...series, ...prev];
    }
    const pid = t.ents.twwp_program, phases = hist && pid ? this._hget(`twp|${pid}|${range}`, () => this._twLoadPhases(pid, range)) : null;
    const pm = metrics.find((x) => x.k === "power"), ps = pm && hist ? this._hget(key(pm), () => this._twLoadSeries(pm, range)) : null;
    const tv = (id) => this._num(id);
    const refs = m.k === "water" ? [["twwp_target_pv", "tw_pv_line"], ["twwp_target_normal", "tw_ref_n"], ["twwp_target_min", "tw_ref_min"]]
      .map(([e, l]) => ({ v: tv(t.ents[e]), label: this._t(l, this._fmt(tv(t.ents[e]), 0)) })).filter((r) => r.v !== null) : [];
    let body;
    if (series === undefined) body = this._skel(190);
    else if (!series || !series.some((s) => s.pts.length > 1)) body = `<div class="note">${this._t(range === "30d" || range === "1y" ? "no_stats" : "no_history")}</div>`;
    else body = this._chart(series, { range, unit: m.unit, bands: false, phases: Array.isArray(phases) ? phases : [], refs, energy: m.k === "power" });
    const heat = ps && ps.heat != null && ps.heat > 0 ? `<div class="note">${this._t("tw_heat_time", this._twFmtDur(ps.heat))}</div>` : "";
    const rb = (v, l) => `<button class="vbtn ${range === v ? "a" : ""}" data-act="hrange" data-v="${v}">${l}</button>`;
    const chips = metrics.length > 1 ? `<div class="mchips" role="group">${metrics.map((x) => `<button class="vbtn ${x.k === m.k ? "a" : ""}" data-act="twmetric" data-v="${x.k}">${this._icon(x.icon)}${this._t(x.label)}</button>`).join("")}</div>` : "";
    return `<ha-card><div class="h">${this._icon("mdi:chart-line")}${this._t("history")}
      <span class="r rng"><button class="vbtn ${this._hcmp ? "a" : ""}" data-act="hcmp" aria-pressed="${!!this._hcmp}">${this._icon("mdi:compare-horizontal")}${this._t("prev_period")}</button><span class="rgrp" role="group">${rb("24h", this._t("hist_24"))}${rb("7d", this._t("hist_7"))}${rb("30d", this._t("hist_30"))}${rb("1y", this._t("hist_365"))}</span></span></div>${chips}${body}${heat}</ha-card>`;
  }

  _twTab(d) {
    const many = d.twwp.length > 1;
    return `<div class="stack">${d.twwp.map((t, i) => `${many ? `<h3 class="twname">${t.name}</h3>` : ""}
      <div class="ov"><div class="col">${this._twTank(t, i)}${this._twTargets(t)}</div><div class="col">${this._twOperation(t)}${this._twDecision(t)}</div></div>
      ${this._twHistory(t)}`).join("")}</div>`;
  }
}

import { BLUE, CORAL, AMBER, GREEN, esc } from "./constants.js";

const PROGRAMS = ["off", "normal", "pv", "minimum", "night"];
const PHASE_COLOR = { pv: GREEN, normal: AMBER, minimum: CORAL, night: BLUE };
const TARGETS = [["twwp_target_normal", "tw_t_normal"], ["twwp_target_pv", "tw_t_pv"], ["twwp_target_min", "tw_t_min"]];
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
    const a = (this._state(id) || {}).attributes || {}, step = Number(a.step) || 0.5;
    const pend = (this._twp = this._twp || {}), e = pend[id] || {};
    const cur = e.t ?? this._num(id);
    if (cur === null) return;
    const t = Math.min(a.max ?? T_HI, Math.max(a.min ?? T_LO, Math.round((cur + dir * step) / step) * step));
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

  // Banners for the overview (panel only): a failed sensor, and a controller that only observes but would act differently.
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

  _twStepper(id, label) {
    const down = !this._ok(id), v = this._twTarget(id);
    return `<div class="f"><span>${label}</span><span class="twstp">
      ${this._btn(`data-act="twstep" data-v="${id}|-1" aria-label="−"`, "round", this._icon("mdi:minus"), down)}
      <b>${v === null ? "–" : this._fmt(v, v % 1 ? 1 : 0) + "°"}</b>
      ${this._btn(`data-act="twstep" data-v="${id}|1" aria-label="+"`, "round", this._icon("mdi:plus"), down)}</span></div>`;
  }

  _twTargets(t) {
    return `<ha-card>${this._header("mdi:tune-variant", this._t("tw_targets"))}<div class="rows">${TARGETS.map(([k, l]) => (t.ents[k] ? this._twStepper(t.ents[k], this._t(l)) : "")).join("")}</div>
      <div class="note">${this._t("tw_hyst")}</div></ha-card>`;
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

  // 24 h water temperature with the program phases as coloured bands, from the recorder history.
  _twSpark(t) {
    const c = this._twCfg(t), wid = c.water_temp || t.heater, pid = t.ents.twwp_program, tp = this._num(t.ents.twwp_target_pv);
    const data = this._hget(`tw|${wid}|${pid}`, async () => {
      const end = new Date(), start = new Date(end.getTime() - 864e5), ids = [wid, pid].filter(Boolean);
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: ids, include_start_time_state: true, significant_changes_only: false });
      const at = (p) => p.lu ?? Date.parse(p.last_updated) / 1000;
      const pts = [], ph = [];
      for (const p of res[wid] || []) {
        const v = c.water_temp ? Number(p.s ?? p.state) : Number((p.a || p.attributes || {}).current_temperature);
        if (!isNaN(at(p)) && !isNaN(v) && (p.s ?? p.state ?? "x") !== "unavailable") pts.push([at(p), v]);
      }
      for (const p of res[pid] || []) if (!isNaN(at(p))) ph.push([at(p), String(p.s ?? p.state)]);
      return { pts: this.constructor._down(pts, 120), ph, t0: start.getTime() / 1000, t1: end.getTime() / 1000 };
    });
    if (data === undefined) return this._skel(84);
    if (!data || data.pts.length < 2) return `<div class="note">${this._t("r_noh")}</div>`;
    const W = Math.max(320, Math.min(1200, (this.clientWidth || 900) - 64)), H = 110, vals = data.pts.map((p) => p[1]).concat(tp === null ? [] : [tp]);
    const lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1, y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const x = (s) => Math.max(0, Math.min(W, ((s - data.t0) / (data.t1 - data.t0)) * W));
    const bands = data.ph.map(([s, st], k) => {
      const e = k + 1 < data.ph.length ? data.ph[k + 1][0] : data.t1, col = PHASE_COLOR[st];
      return col && e > s ? `<rect x="${x(s).toFixed(1)}" y="0" width="${Math.max(0, x(e) - x(s)).toFixed(1)}" height="${H}" fill="${col}" opacity=".16"/>` : "";
    }).join("");
    const line = data.pts.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
    const last = data.pts[data.pts.length - 1], lang = this._hass.language, sw = W / data.pts.length;
    const hits = data.pts.map((p) => `<rect x="${(x(p[0]) - sw / 2).toFixed(1)}" y="0" width="${sw.toFixed(1)}" height="${H}" fill="transparent" data-tip="${new Date(p[0] * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}|${this._fmt(p[1])} °C"/>`).join("");
    const legend = Object.entries(PHASE_COLOR).filter(([k]) => data.ph.some((p) => p[1] === k)).map(([k, col]) => `<span style="color:${col}">${this._t(`tw_p_${k}`)}</span>`).join("");
    return `<div class="chw"><svg viewBox="0 0 ${W} ${H + 18}" style="width:100%;height:auto" role="img" aria-label="${this._t("tw_hist")}">${bands}
      ${tp === null ? "" : `<line x1="0" x2="${W}" y1="${y(tp).toFixed(1)}" y2="${y(tp).toFixed(1)}" stroke="var(--secondary-text-color)" stroke-dasharray="4 4" opacity=".6"/><text x="${W}" y="${Math.max(10, y(tp) - 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--secondary-text-color)">${this._t("tw_pv_line", this._fmt(tp, 0))}</text>`}
      <polyline fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-linejoin="round" points="${line}"/>
      <circle cx="${x(last[0]).toFixed(1)}" cy="${y(last[1]).toFixed(1)}" r="4.5" fill="${BLUE}"/>
      <text x="0" y="${H + 15}" font-size="11" fill="var(--secondary-text-color)">${this._t("r_ago")}</text><text x="${W}" y="${H + 15}" text-anchor="end" font-size="11" fill="var(--secondary-text-color)">${this._t("r_now")}</text>${hits}</svg><div class="tip" style="display:none"></div></div>
      <div class="twleg">${legend}</div>`;
  }

  _twTab(d) {
    const many = d.twwp.length > 1;
    return `<div class="stack">${d.twwp.map((t, i) => `${many ? `<h3 class="twname">${t.name}</h3>` : ""}
      <div class="ov"><div class="col">${this._twTank(t, i)}${this._twTargets(t)}</div><div class="col">${this._twOperation(t)}${this._twDecision(t)}</div></div>
      <ha-card>${this._header("mdi:chart-line", this._t("tw_hist"), this._t("hist_24"))}${this._twSpark(t)}</ha-card>`).join("")}</div>`;
  }
}

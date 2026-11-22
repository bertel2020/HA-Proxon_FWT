import { BLUE, CORAL, AMBER, GREEN, RANGE_MS, CHART_H, esc } from "./constants.js";

const PHASE_COLOR = { pv: GREEN, normal: AMBER, minimum: CORAL, night: BLUE };
const TARGETS = [["twwp_target_normal", "tw_t_normal"], ["twwp_target_pv", "tw_t_pv"], ["twwp_target_min", "tw_t_min"]];
const HYSTS = [["twwp_hyst_low", "tw_h_low"], ["twwp_hyst_high", "tw_h_high"]];
const MIN_BAND = 2; // K: below this the heat pump may switch on and off in short intervals
const NIGHT = "#7F77DD";
const S_LO = 30, S_HI = 65; // the target scale; the targets can be set from 30 to 60, the scale shows 5 K more for the hysteresis

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
    const t = Math.min(a.max ?? 60, Math.max(a.min ?? 30, Math.round((cur + dir * step) / step) * step));
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
  // 24 h curve of the water temperature for the key figure tile (shares its data with the history when it shows 24 h).
  _twSpark(t) {
    const m = this._twMetrics(t).find((x) => x.k === "water");
    if (!m) return this._sparkSvg(null, BLUE);
    const ser = this._hget(`tws|${m.id}|${m.attr ? "a" : "s"}|24h`, () => this._twLoadSeries(m, "24h"));
    return this._sparkSvg(ser && ser[0] ? ser[0].pts : null, BLUE);
  }

  _twKpi(d) {
    const many = d.twwp.length > 1;
    return d.twwp.map((t) => {
      const w = this._twWater(t), prog = this._ok(t.ents.twwp_program) ? this._state(t.ents.twwp_program).state : null;
      const bad = this._on(t.ents.twwp_sensor_problem);
      const col = bad ? "#db4437" : PHASE_COLOR[prog] || "var(--secondary-text-color)";
      return `<div class="k go" style="--kc:${col}" data-act="tab" data-v="warm" role="button" tabindex="0"><div class="ic">${this._icon(bad ? "mdi:alert-outline" : "mdi:water-boiler")}</div>
        <div><div class="lb">${many ? t.name : this._t("tab_warm")}</div><div class="v">${w === null ? "–" : `${this._fmt(w)}°`}</div>${this._twSpark(t)}</div></div>`;
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

  // Heating runs in a power curve: the total time above 100 W and, if it is heating at the end, since when.
  _twRuns(pts, end) {
    let heat = 0, run = null, since = null;
    pts.forEach(([t, v], i) => {
      const next = i + 1 < pts.length ? pts[i + 1][0] : end;
      if (v > 100) { if (run === null) run = t; heat += next - t; } else run = null;
    });
    if (run !== null) since = run;
    return { heat, since };
  }

  // Today (calendar day) of one heat pump: heating time, energy and the current heating run, for the main picture.
  async _twLoadToday(t) {
    const c = this._twCfg(t), now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate()), t0 = start.getTime() / 1000, t1 = now.getTime() / 1000;
    const wid = c.power_entity, eid = c.energy_entity, ids = [wid].filter(Boolean);
    const out = { t0, t1, heat: null, since: null, kwh: null };
    if (ids.length) {
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: now.toISOString(),
        entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      // the state at midnight carries into the day; points before it are cut off
      const clip = (rows) => { let carry = null; const keep = []; for (const r of rows) { if (r[0] < t0) carry = r; else keep.push(r); } return carry ? [[t0, carry[1]], ...keep] : keep; };
      const rows = (id) => clip((res[id] || []).map((p) => [p.lu ?? Date.parse(p.last_updated) / 1000, p.s ?? p.state]).filter(([x]) => !isNaN(x)));
      if (wid) {
        const u = String(((this._state(wid) || { attributes: {} }).attributes.unit_of_measurement) || "W").trim(), k = u === "kW" ? 1e3 : u === "MW" ? 1e6 : 1;
        const pts = rows(wid).map(([x, v]) => [x, Number(v) * k]).filter(([, v]) => !isNaN(v));
        if (pts.length) {
          const r = this._twRuns(pts, t1);
          out.heat = r.heat; out.since = r.since;
          if (!eid) { let wh = 0; pts.forEach(([x, v], i) => { wh += (v * ((i + 1 < pts.length ? pts[i + 1][0] : t1) - x)) / 3600; }); out.kwh = wh / 1000; }
        }
      }
    }
    if (eid) {
      const res = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: now.toISOString(),
        statistic_ids: [eid], period: "hour", types: ["change"] });
      const u = String(((this._state(eid) || { attributes: {} }).attributes.unit_of_measurement) || "kWh").trim(), k = u === "Wh" ? 1e-3 : u === "MWh" ? 1e3 : 1;
      const ch = (res[eid] || []).map((r) => Number(r.change)).filter((v) => !isNaN(v));
      out.kwh = ch.length ? ch.reduce((x, y) => x + y, 0) * k : null;
    }
    return out;
  }

  _twToday(t) {
    return this._hget(`twt|${t.id}|${new Date().toDateString()}`, () => this._twLoadToday(t));
  }

  // Main picture: the sun with the PV power, the flow into the unit, the unit as one housing and the status beside it.
  // The tank is filled evenly (one sensor in the middle cannot tell the layers apart).
  _twHero(t, i) {
    const c = this._twCfg(t), w = this._twWater(t), today = this._twToday(t);
    const tn = this._num(t.ents.twwp_target_normal), tm = this._num(t.ents.twwp_target_min);
    const pw = c.power_entity ? this._twPowerW(c.power_entity) : null, pv = c.pv_power ? this._twPowerW(c.pv_power) : null;
    const heats = pw !== null && pw > 100, prog = this._ok(t.ents.twwp_program) ? this._state(t.ents.twwp_program).state : null, night = prog === "night";
    const bad = this._on(t.ents.twwp_sensor_problem), outer = c.outer_temp ? this._num(c.outer_temp) : null;
    const col = w === null ? "var(--divider-color)" : tn !== null && w >= tn ? CORAL : tm !== null && w >= tm ? AMBER : BLUE;
    const flow = heats ? (prog === "pv" ? GREEN : AMBER) : "var(--divider-color)";
    // Fill level: the water temperature on the 30 to 65 degree scale, drawn into the water part of the tank (y 72 to 200).
    const yv = (v) => 72 + (1 - (Math.max(S_LO, Math.min(S_HI, v)) - S_LO) / (S_HI - S_LO)) * 128;
    const lvl = w === null ? 200 : yv(w);
    // The three targets as small marks at the right edge of the tank, so the state reads without the scale.
    let lastY = -1e9;
    const marks = [[tm, "tw_ref_min"], [tn, "tw_ref_n"], [t.ents.twwp_target_pv ? this._num(t.ents.twwp_target_pv) : null, "tw_pv_line"]]
      .filter(([v]) => v !== null).sort((a, b) => b[0] - a[0]).map(([v, k]) => {
        const y = yv(v), ty = Math.max(y + 5, lastY + 16); lastY = ty;
        return `<line x1="112" x2="122" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--primary-text-color)" stroke-width="2.2"/><text x="127" y="${ty.toFixed(1)}" font-size="13" font-weight="500" fill="var(--primary-text-color)">${this._t(k, this._fmt(v, 0))}</text>`;
      }).join("");
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="58" y1="58" x2="58" y2="49" transform="rotate(${a} 58 100)"/>`).join("");
    const svg = `<svg class="twhsvg ${heats ? "heat" : ""}" viewBox="0 0 440 226" role="img" aria-label="${this._t("tw_tank")} ${w === null ? "" : this._fmt(w) + "°"}">
      <title>${this._t("tw_tank_note")}</title><defs><clipPath id="twc${i}"><rect x="0" y="0" width="112" height="200" rx="28"/></clipPath></defs>
      ${night ? `      <g><path d="M72 84a28 28 0 1 1-30-34 22 22 0 0 0 30 34z" fill="${NIGHT}" opacity=".9"/>
      <g fill="${NIGHT}" opacity=".7"><circle cx="82" cy="58" r="2.6"/><circle cx="92" cy="80" r="2"/><circle cx="30" cy="140" r="2"/></g>
      <text x="58" y="162" text-anchor="middle" font-size="18" font-weight="700" fill="var(--primary-text-color)">${this._t("tw_p_night")}</text>
      <text x="58" y="182" text-anchor="middle" font-size="13" fill="var(--secondary-text-color)">${pv === null ? "" : this._fmt(pv / 1000) + " kW"}</text></g>
      ` : `      <circle cx="58" cy="100" r="26" fill="${AMBER}" opacity="${pv !== null && pv > 200 ? 1 : 0.35}"/><g stroke="${AMBER}" stroke-width="3.5" stroke-linecap="round" opacity="${pv !== null && pv > 200 ? 1 : 0.35}">${rays}</g>
      ${pv === null ? "" : this._lk(c.pv_power, `<text x="58" y="162" text-anchor="middle" font-size="18" font-weight="700" fill="var(--primary-text-color)">${this._fmt(pv / 1000)} kW</text><text x="58" y="182" text-anchor="middle" font-size="13" fill="var(--secondary-text-color)">${this._t("tw_pv_power")}</text>`, "g")}
      <path class="twflow" d="M92 100 C 150 100, 170 72, 224 72" fill="none" stroke="${flow}" stroke-width="3"/>
      <path d="M214 66 L226 72 L214 78" fill="none" stroke="${flow}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${heats ? this._lk(c.power_entity, `<text x="150" y="82" text-anchor="middle" font-size="12" fill="var(--secondary-text-color)">${this._fmt(pw, 0)} W</text>`, "g") : ""}
      `}
      <g transform="translate(232,10)">
        <rect width="112" height="200" rx="28" fill="var(--card-background-color)" stroke="var(--divider-color)" stroke-width="1.5"/>
        <g clip-path="url(#twc${i})">
          <rect x="0" y="70" width="112" height="130" fill="var(--secondary-background-color)" opacity=".55"/>
          <rect x="0" y="${lvl.toFixed(1)}" width="112" height="${(200 - lvl).toFixed(1)}" fill="${col}" opacity=".75"/>
          <rect x="0" y="0" width="112" height="70" fill="var(--secondary-background-color)"/>
          <rect x="0" y="68" width="112" height="4" fill="var(--divider-color)" opacity=".8"/>
        </g>
        <circle cx="36" cy="29" r="20" fill="none" stroke="var(--primary-text-color)" stroke-width="2.5" opacity=".85"/>
        <g class="fan" fill="var(--primary-text-color)" opacity=".85">${[0, 120, 240].map((r) => `<ellipse cx="36" cy="19" rx="6" ry="10" transform="rotate(${r} 36 29)"/>`).join("")}<circle cx="36" cy="29" r="3.5" fill="var(--card-background-color)"/></g>
        <g stroke="var(--primary-text-color)" stroke-width="3.5" stroke-linecap="round" opacity=".6"><line x1="64" x2="94" y1="22" y2="22"/><line x1="64" x2="94" y1="32" y2="32"/><line x1="64" x2="94" y1="42" y2="42"/></g>
        <circle cx="92" cy="58" r="5" fill="${heats ? GREEN : "var(--divider-color)"}"/>
        ${this._lk(c.outer_temp, `<text x="36" y="67" font-size="17" font-weight="700" text-anchor="middle" fill="var(--primary-text-color)">${outer === null ? "" : this._fmt(outer) + "°"}</text>`, "g")}
        <circle cx="18" cy="146" r="5" fill="var(--card-background-color)" stroke="var(--primary-text-color)" stroke-width="1.8"/>
        ${this._lk(c.water_temp || t.heater, `<text x="66" y="156" text-anchor="middle" font-size="30" font-weight="700" fill="var(--primary-text-color)">${w === null ? "–" : this._fmt(w) + "°"}</text>`, "g")}
        <text x="62" y="180" text-anchor="middle" font-size="12" fill="var(--secondary-text-color)">${this._t("tw_mp")}</text>
        ${marks}
        ${night ? `<g transform="translate(92,58)"><circle r="11" fill="${NIGHT}"/><path transform="translate(-6,-6) scale(.5)" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>` : ""}
      </g></svg>`;
    const chip = bad ? `<span class="chip r">${this._t("tw_problem")}</span>` : prog ? `<span class="chip ${prog === "pv" ? "g" : prog === "minimum" ? "w" : prog === "normal" ? "a" : ""}">${this._t(`tw_p_${prog}`)}</span>` : "";
    const tile = (label, value, id) => `<div class="twm${id ? " lk" : ""}" ${id ? `role="button" tabindex="0" data-act="more" data-v="${id}"` : ""}><small>${label}</small><b>${value}</b></div>`;
    const since = heats && today && today.since != null ? this._twFmtDur(Math.max(0, Date.now() / 1000 - today.since)) : null;
    const tiles = [
      pw !== null ? tile(this._t(heats ? "tw_since" : "tw_hp"), heats ? (since || "–") : this._t("tw_idle")) : "",
      pw !== null ? tile(this._t("power"), `${this._fmt(pw, 0)} W`, c.power_entity) : "",
      today && today.kwh != null ? tile(this._t("tw_today_e"), `${this._fmt(today.kwh)} kWh`, c.energy_entity) : "",
      today && today.heat != null ? tile(this._t("tw_today_h"), this._twFmtDur(today.heat)) : "",
    ].join("");
    return `<ha-card>${this._header("mdi:water-boiler", this._t("tw_tank"), chip)}<div class="twhero">${svg}<div class="twside"><div class="twmg">${tiles}</div></div></div></ha-card>`;
  }

  _twStepper(id, label, unit = "°") {
    const down = !this._ok(id), v = this._twTarget(id);
    return `<div class="f"><span>${label}</span><span class="twstp">
      ${this._btn(`data-act="twstep" data-v="${id}|-1" aria-label="−"`, "round", this._icon("mdi:minus"), down)}
      <b>${v === null ? "–" : this._fmt(v, v % 1 ? 1 : 0) + unit}</b>
      ${this._btn(`data-act="twstep" data-v="${id}|1" aria-label="+"`, "round", this._icon("mdi:plus"), down)}</span></div>`;
  }

  // The target of one setting as a small tile with its own - and + buttons (the clicks add up in _twBump).
  _twTile(id, label) {
    const down = !this._ok(id), v = this._twTarget(id);
    return `<div class="twt"><small>${label}</small><div class="twstp">
      ${this._btn(`data-act="twstep" data-v="${id}|-1" aria-label="−"`, "round", this._icon("mdi:minus"), down)}
      <b>${v === null ? "–" : this._fmt(v, v % 1 ? 1 : 0) + "°"}</b>
      ${this._btn(`data-act="twstep" data-v="${id}|1" aria-label="+"`, "round", this._icon("mdi:plus"), down)}</div></div>`;
  }

  // The scale from 30 to 65 degrees as HTML (real text size, positions in percent, so no width has to be guessed): the zones around the
  // normal target, the three targets as marks above, the water temperature as pointer below. Close marks go to a second level.
  _twScale(t) {
    const g = (k) => this._num(t.ents[k]), tn = g("twwp_target_normal"), tp = g("twwp_target_pv"), tm = g("twwp_target_min");
    const lo = g("twwp_hyst_low"), hi = g("twwp_hyst_high"), w = this._twWater(t);
    if (tn === null || tp === null || tm === null || lo === null || hi === null) return "";
    const pos = (v) => ((Math.max(S_LO, Math.min(S_HI, v)) - S_LO) / (S_HI - S_LO)) * 100;
    const f = (v) => this._fmt(v, v % 1 ? 1 : 0);
    const bounds = [S_LO, tm, tn - lo, tn + hi, S_HI].reduce((o, v) => (o.push(Math.max(o.length ? o[o.length - 1] : S_LO, Math.min(S_HI, v))), o), []);
    const zones = [["tw_z_min", BLUE, .55], ["tw_z_heat", AMBER, .7], ["tw_z_hold", "#8a8f98", .45], ["tw_z_done", GREEN, .55]];
    const bar = zones.map(([, c, op], k) => (bounds[k + 1] > bounds[k] ? `<i style="width:${(pos(bounds[k + 1]) - pos(bounds[k])).toFixed(2)}%;background:${c};opacity:${op}"></i>` : "")).join("");
    let prev = -1e9, level = 0;
    const marks = [[tm, "tw_m_min"], [tn, "tw_m_n"], [tp, "tw_m_pv"]].sort((m, n) => m[0] - n[0]).map(([v, k]) => {
      const p = pos(v);
      level = p - prev < 24 ? 1 - level : 0; prev = p;
      return `<i class="tk l${level}" style="left:${p.toFixed(2)}%"></i><span class="lbl l${level}" style="left:${p.toFixed(2)}%">${this._t(k, f(v))}</span>`;
    }).join("");
    const pw = w === null ? null : pos(w);
    const align = pw === null ? "" : pw > 82 ? "transform:translateX(-85%)" : pw < 14 ? "transform:translateX(-15%)" : "";
    const pointer = w === null ? "" : `<i class="twpt" style="left:${pw.toFixed(2)}%"></i><span class="twpl" style="left:${pw.toFixed(2)}%;${align}">${this._t("tw_nowv", f(w))}</span>`;
    const axis = [30, 40, 50, 60, 65].map((v) => `<span style="left:${pos(v).toFixed(2)}%">${v}</span>`).join("");
    const legend = zones.map(([k, c, op]) => `<span><i style="background:${c};opacity:${op + 0.15}"></i>${this._t(k)}</span>`).join("");
    return `<div class="twsc2" role="img" aria-label="${this._t("tw_reg")}"><div class="twbar">${bar}</div>${marks}${pointer}<div class="twax">${axis}</div></div><div class="twlg">${legend}</div>`;
  }

  // What the controller decided, in plain words: [headline, detail, tone, icon]. The numbers come from the targets and the hysteresis.
  _twStatus(t) {
    const r = t.ents.twwp_reason, rs = this._state(r);
    if (!r || !this._ok(r)) return null;
    const g = (k) => this._num(t.ents[k]), tm = g("twwp_target_min"), tn = g("twwp_target_normal"), tp = g("twwp_target_pv"), lo = g("twwp_hyst_low"), hi = g("twwp_hyst_high");
    const f = (v) => (v === null ? "–" : this._fmt(v, v % 1 ? 1 : 0));
    const d = (a, b, sign) => (a === null || b === null ? null : a + sign * b);
    const args = [f(tm), f(tn), f(tp), f(d(tn, lo, -1)), f(d(tn, hi, 1)), f(d(tp, lo, -1)), f(d(tp, hi, 1))];
    const look = { pv: [GREEN, "mdi:white-balance-sunny"], normal: [AMBER, "mdi:fire"], pv_end: [AMBER, "mdi:fire"], minimum: [AMBER, "mdi:snowflake-alert"],
      night: ["#7F77DD", "mdi:weather-night"], target_reached: [GREEN, "mdi:check-circle-outline"], pv_target_reached: [GREEN, "mdi:check-circle-outline"],
      locked: [AMBER, "mdi:timer-sand"], sensor_unavailable: ["#db4437", "mdi:alert-circle-outline"] }[rs.state] || ["#8a8f98", "mdi:pause-circle-outline"];
    return [this._t(`tw_s_${rs.state}`), this._t(`tw_x_${rs.state}`, ...args), look[0], look[1]];
  }

  // Day strip: the program phases of the last 24 hours as one bar, "now" at the right end. The same phase history the chart uses.
  _twDay(t) {
    const pid = t.ents.twwp_program;
    if (!pid) return "";
    const ph = this._hget(`twp|${pid}|24h`, () => this._twLoadPhases(pid, "24h"));
    if (!Array.isArray(ph)) return "";
    const t1 = Date.now() / 1000, t0 = t1 - 86400, pct = (x) => (((Math.max(t0, Math.min(t1, x)) - t0) / 86400) * 100).toFixed(2);
    const bar = ph.flatMap((p) => p.iv.map(([a, b]) => ({ a, b, c: p.color }))).filter((s) => s.b > t0).sort((x, y) => x.a - y.a)
      .map((s) => `<i style="left:${pct(s.a)}%;width:${(pct(s.b) - pct(s.a)).toFixed(2)}%;background:${s.c}"></i>`).join("");
    const hm = (x) => new Date(x * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const ticks = [0, 6, 12, 18].map((h) => `<span style="left:${(h / 24) * 100}%">${hm(t0 + h * 3600)}</span>`).join("") + `<span class="r">${this._t("tw_end")}</span>`;
    const legend = ph.filter((p) => p.iv.some(([a, b]) => b > t0 && b - a > 60)).map((p) => `<span><i style="background:${p.color}"></i>${p.label}</span>`).join("");
    return `<div class="twday" role="img" aria-label="${this._t("tw_day")}"><div class="twdb">${bar}<i class="nowm"></i></div><div class="twdt">${ticks}</div><div class="twlg">${legend}</div></div>`;
  }

  // Status bar over the whole width: what the controller decided and why, the program of the last 24 hours below.
  _twStatusBar(t) {
    const c = this._twCfg(t), ctl = t.ents.twwp_control, ctlOn = this._on(ctl);
    const pvs = this._ok(t.ents.twwp_pv_status) ? this._state(t.ents.twwp_pv_status).state : null;
    const rs = this._state(t.ents.twwp_reason), at = (rs && rs.attributes) || {}, st = this._twStatus(t);
    if (!st) return "";
    const known = (id) => (id && this._state(id) ? this._t(this._on(id) ? "tw_on" : "tw_off") : null);
    const meta = [pvs ? this._t(`tw_pv_${pvs}`) : "", at.last_run ? this._t("tw_checked", this._twAge(at.last_run)) : ""].filter(Boolean).join(" · ");
    const en = known(c.enable_switch) !== null ? `${this._t("tw_en")}: ${this._t("tw_en_val", known(c.enable_switch), known(c.enable_pv_switch) || "–")}` : "";
    return `<div class="twsb" style="--c:${st[2]}"><div class="twst">${this._icon(st[3])}<div><b>${st[0]}</b><span>${st[1]}</span>
      ${ctl && !ctlOn ? `<span>${this._t("tw_ctl_off")}</span>` : ""}${meta ? `<small>${meta}</small>` : ""}${en ? `<small>${en}</small>` : ""}</div></div>${this._twDay(t)}</div>`;
  }

  // Control: the switch (controller on or dry run), the scale with the targets and their buttons, the hysteresis.
  // The decision itself is in the status bar above, the program in the card header of the main picture and in the day strip.
  _twControl(t) {
    const ctl = t.ents.twwp_control, ctlOn = this._on(ctl);
    const rs = this._state(t.ents.twwp_reason), at = (rs && rs.attributes) || {};
    const pl = t.ents.twwp_planned, plN = this._num(pl), bad = this._on(t.ents.twwp_sensor_problem);
    const sw = pl && this._state(pl) ? Object.entries(this._state(pl).attributes.switches || {}).map(([e, v]) => `${esc(e)} → ${this._t(v === "on" ? "tw_on" : "tw_off")}`).join("<br>") : "";
    const sw2 = ctl ? `<span class="lb">${this._t(ctlOn ? "tw_auto" : "tw_dry")}</span><ha-switch data-act="twctl" data-v="${ctl}" ${ctlOn ? "checked" : ""} ${this._ok(ctl) ? "" : "disabled"}></ha-switch>` : "";
    const tile = (k, l) => (t.ents[k] ? this._twTile(t.ents[k], this._t(l)) : "");
    const lo = this._twTarget(t.ents.twwp_hyst_low), hi = this._twTarget(t.ents.twwp_hyst_high), open = !!this._twHystOpen, f = (v) => this._fmt(v, v % 1 ? 1 : 0);
    const warn = lo !== null && hi !== null && lo + hi < MIN_BAND;
    const hyst = lo !== null && hi !== null ? `<div class="twhy"><span>${this._t("tw_hyst_gap", f(lo), f(hi))}</span>
      <button class="vbtn" data-act="twhyst" aria-expanded="${open}">${this._t(open ? "tw_done" : "tw_change")}</button></div>
      ${open ? `<div class="rows">${HYSTS.filter(([k]) => t.ents[k]).map(([k, l]) => this._twStepper(t.ents[k], this._t(l), " K")).join("")}</div>` : ""}` : "";
    return `<ha-card>${this._header("mdi:cog-outline", this._t("tw_reg"), sw2)}${this._twScale(t)}
      <div class="twts">${tile("twwp_target_min", "tw_t_min")}${tile("twwp_target_normal", "tw_t_normal")}${tile("twwp_target_pv", "tw_t_pv")}</div>${hyst}
      ${warn ? `<div class="note" style="color:#c98400">${this._t("tw_hyst_warn")}</div>` : ""}
      ${plN !== null && plN > 0 ? `<div class="note" style="margin-top:8px">${this._t("tw_planned")}: ${plN}${sw ? `<br>${sw}` : ""}</div>` : ""}
      ${bad ? `<div class="note" style="color:#db4437">${this._t("tw_problem")}</div>` : ""}
      ${at.last_error ? `<div class="note" style="color:#db4437">${this._t("tw_err")}: ${esc(at.last_error)}</div>` : ""}</ha-card>`;
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
    const heat = m.k === "power" && !long ? this._twRuns(pts, end.getTime() / 1000).heat : null;
    let out = pts.length ? [{ label: this._t(m.label), color: m.color, pts: this.constructor._down(pts, 360), step: !long && (m.k === "power" || m.k === "pv") }] : [];
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
    return ["pv", "normal", "minimum", "night"].map((k) => ({ iv: iv[k] || [], color: PHASE_COLOR[k], label: this._t(`tw_pl_${k}`) }));
  }

  _twFmtDur(s) {
    const m = Math.round(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  }

  // Whether the targets are drawn into the water curve; kept in the browser because it is a matter of taste.
  _twRefsOn() {
    if (this._twRefs === undefined) {
      try { this._twRefs = localStorage.getItem("proxon_fwt_twrefs") !== "0"; } catch (e) { this._twRefs = true; }
    }
    return this._twRefs;
  }

  // The curves of all measurements one below the other on one time axis: water with the targets, power (with the PV power as an
  // area behind it, each on a scale of its own) and the air at the top of the unit with the limit for PV mode.
  _twLanes(t, loaded, refsOn) {
    const c = this._twCfg(t), nf = (v) => this._fmt(v, Math.abs(v) < 100 ? 1 : 0), deg = (v) => `${nf(v)}°`;
    const watt = (v) => (v >= 1000 ? `${this._fmt(v / 1000)} kW` : `${this._fmt(v, 0)} W`);
    const first = (k) => { const e = loaded.find((x) => x.m.k === k); return e && e.s && e.s[0] && e.s[0].pts.length > 1 ? e.s[0] : null; };
    const water = first("water"), power = first("power"), pv = first("pv"), air = first("outer"), tv = (id) => this._num(id);
    const refs = refsOn ? [["twwp_target_pv", "tw_pv_line"], ["twwp_target_normal", "tw_ref_n"], ["twwp_target_min", "tw_ref_min"]]
      .map(([e, l]) => ({ v: tv(t.ents[e]), label: this._t(l, this._fmt(tv(t.ents[e]), 0)) })).filter((r) => r.v !== null) : [];
    const limit = Number(c.pv_min_outer ?? 5);
    return [
      water && { h: 150, axis: true, series: [{ ...water, kind: "line", fmt: deg }], refs },
      (power || pv) && { h: 90, axis: false, series: [
        pv && { ...pv, kind: "area", color: AMBER, short: this._t("tw_short_pv"), fmt: watt },
        power && { ...power, kind: "line", color: "#7e57c2", short: this._t("tw_short_hp"), fmt: watt, energy: true }].filter(Boolean) },
      air && { h: 56, axis: true, series: [{ ...air, kind: "line", fmt: deg }], refs: [{ v: limit, label: this._t("tw_ref_outer", this._fmt(limit, 0)) }] },
    ].filter(Boolean);
  }

  // History card: same range and previous-period switch as the FWT history. "All" (the default) shows every measurement in lanes,
  // the other chips show one measurement with its key figures.
  _twHistory(t) {
    const metrics = this._twMetrics(t);
    if (!metrics.length) return "";
    const range = this._range(), hist = range === "24h" || range === "7d";
    const all = metrics.length > 1 && (this._twMetric === undefined || this._twMetric === "all" || !metrics.some((x) => x.k === this._twMetric));
    const m = all ? null : metrics.find((x) => x.k === this._twMetric) || metrics[0];
    const key = (x, prev) => `tws|${x.id}|${x.attr ? "a" : "s"}|${range}${prev ? "|prev" : ""}`;
    const pid = t.ents.twwp_program, loadedPh = hist && pid ? this._hget(`twp|${pid}|${range}`, () => this._twLoadPhases(pid, range)) : null;
    // the legend names how long each program ran in the shown range
    const t1 = Date.now() / 1000, t0 = t1 - RANGE_MS[range] / 1000;
    const phases = Array.isArray(loadedPh) ? loadedPh.map((ph) => {
      const sec = ph.iv.reduce((n, [a, b]) => n + Math.max(0, Math.min(b, t1) - Math.max(a, t0)), 0);
      return { ...ph, legend: `${ph.label} ${this._twFmtDur(sec)}`, noLegend: sec < 60 };
    }) : [];
    const pm = metrics.find((x) => x.k === "power"), ps = pm && hist ? this._hget(key(pm), () => this._twLoadSeries(pm, range)) : null;
    const emptyNote = `<div class="note">${this._t(range === "30d" || range === "1y" ? "no_stats" : "no_history")}</div>`;
    let body;
    if (all) {
      const loaded = metrics.map((x) => ({ m: x, s: this._hget(key(x), () => this._twLoadSeries(x, range)) }));
      const lanes = loaded.some((e) => e.s === undefined) ? undefined : this._twLanes(t, loaded, this._twRefsOn());
      body = lanes === undefined ? this._skel(300) : lanes.length ? this._laneChart(lanes, { range, phases, H: CHART_H }) : emptyNote;
    } else {
      let series = this._hget(key(m), () => this._twLoadSeries(m, range));
      if (this._hcmp && series) {
        const prev = this._hget(key(m, true), () => this._twLoadSeries(m, range, true));
        if (prev) series = [...series, ...prev];
      }
      const tv = (id) => this._num(id);
      const refs = m.k === "water" && this._twRefsOn() ? [["twwp_target_pv", "tw_pv_line"], ["twwp_target_normal", "tw_ref_n"], ["twwp_target_min", "tw_ref_min"]]
        .map(([e, l]) => ({ v: tv(t.ents[e]), label: this._t(l, this._fmt(tv(t.ents[e]), 0)) })).filter((r) => r.v !== null) : [];
      if (series === undefined) body = this._skel(190);
      else if (!series || !series.some((s) => s.pts.length > 1)) body = emptyNote;
      else body = this._chart(series, { range, unit: m.unit, bands: false, phases, refs, energy: m.k === "power" });
    }
    const heat = ps && ps.heat != null && ps.heat > 0 ? `<div class="note">${this._t("tw_heat_time", this._twFmtDur(ps.heat))}</div>` : "";
    const rb = (v, l) => `<button class="vbtn ${range === v ? "a" : ""}" data-act="hrange" data-v="${v}">${l}</button>`;
    const on = this._twRefsOn(), tgt = all || m.k === "water" ? `<button class="vbtn" style="margin-left:auto;${on ? "background:var(--primary-color);color:var(--text-primary-color,#fff)" : ""}" data-act="twrefs" aria-pressed="${on}" title="${this._t("tw_refs_tip")}">${this._icon("mdi:target")}${this._t("tw_refs")}</button>` : "";
    const chip = (k, icon, label) => `<button class="vbtn ${(all ? k === "all" : k === m.k) ? "a" : ""}" data-act="twmetric" data-v="${k}">${this._icon(icon)}${label}</button>`;
    const chips = metrics.length > 1 || tgt ? `<div class="mchips" role="group">${metrics.length > 1 ? chip("all", "mdi:chart-multiple", this._t("tw_all")) + metrics.map((x) => chip(x.k, x.icon, this._t(x.label))).join("") : ""}${tgt}</div>` : "";
    const prev = `<button class="vbtn ${this._hcmp && !all ? "a" : ""}" data-act="twcmp" data-v="${all ? metrics[0].k : ""}" aria-pressed="${!!this._hcmp && !all}">${this._icon("mdi:compare-horizontal")}${this._t("prev_period")}</button>`;
    return `<ha-card><div class="h">${this._icon("mdi:chart-line")}${this._t("history")}
      <span class="r rng">${prev}<span class="rgrp" role="group">${rb("24h", this._t("hist_24"))}${rb("7d", this._t("hist_7"))}${rb("30d", this._t("hist_30"))}${rb("1y", this._t("hist_365"))}</span></span></div>${chips}${body}${heat}</ha-card>`;
  }

  _twTab(d) {
    const many = d.twwp.length > 1;
    return `<div class="stack">${d.twwp.map((t, i) => `${many ? `<h3 class="twname">${t.name}</h3>` : ""}
      <div class="twc">${this._twStatusBar(t)}<div class="twgrid">
        <div class="tw-hero">${this._twHero(t, i)}</div>
        <div class="tw-op">${this._twControl(t)}</div>
        <div class="tw-hist">${this._twHistory(t)}</div></div></div>`).join("")}</div>`;
  }
}

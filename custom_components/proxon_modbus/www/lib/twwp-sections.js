import { BLUE, CORAL, AMBER, GREEN, RANGE_MS, esc } from "./constants.js";

const PHASE_COLOR = { pv: GREEN, normal: AMBER, minimum: CORAL, night: BLUE };
const TARGETS = [["twwp_target_normal", "tw_t_normal"], ["twwp_target_pv", "tw_t_pv"], ["twwp_target_min", "tw_t_min"]];
const HYSTS = [["twwp_hyst_low", "tw_h_low"], ["twwp_hyst_high", "tw_h_high"]];
const MIN_BAND = 2; // K: below this the heat pump may switch on and off in short intervals
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
    const heats = pw !== null && pw > 100, prog = this._ok(t.ents.twwp_program) ? this._state(t.ents.twwp_program).state : null;
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
        const y = yv(v), ty = Math.max(y + 4, lastY + 13); lastY = ty;
        return `<line x1="112" x2="122" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--primary-text-color)" stroke-width="1.6"/><text x="127" y="${ty.toFixed(1)}" font-size="11" fill="var(--secondary-text-color)">${this._t(k, this._fmt(v, 0))}</text>`;
      }).join("");
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="58" y1="58" x2="58" y2="49" transform="rotate(${a} 58 100)"/>`).join("");
    const svg = `<svg class="twhsvg ${heats ? "heat" : ""}" viewBox="0 0 440 226" role="img" aria-label="${this._t("tw_tank")} ${w === null ? "" : this._fmt(w) + "°"}">
      <title>${this._t("tw_tank_note")}</title><defs><clipPath id="twc${i}"><rect x="0" y="0" width="112" height="200" rx="28"/></clipPath></defs>
      <circle cx="58" cy="100" r="24" fill="${AMBER}" opacity="${pv !== null && pv > 200 ? 1 : 0.35}"/><g stroke="${AMBER}" stroke-width="2.5" stroke-linecap="round" opacity="${pv !== null && pv > 200 ? 1 : 0.35}">${rays}</g>
      ${pv === null ? "" : `<text x="58" y="160" text-anchor="middle" font-size="15" font-weight="500" fill="var(--primary-text-color)">${this._fmt(pv / 1000)} kW</text><text x="58" y="178" text-anchor="middle" font-size="11" fill="var(--secondary-text-color)">${this._t("tw_pv_power")}</text>`}
      <path class="twflow" d="M92 100 C 150 100, 170 72, 224 72" fill="none" stroke="${flow}" stroke-width="3"/>
      <path d="M214 66 L226 72 L214 78" fill="none" stroke="${flow}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${heats ? `<text x="150" y="82" text-anchor="middle" font-size="12" fill="var(--secondary-text-color)">${this._fmt(pw, 0)} W</text>` : ""}
      <g transform="translate(232,10)">
        <rect width="112" height="200" rx="28" fill="var(--card-background-color)" stroke="var(--divider-color)" stroke-width="1.5"/>
        <g clip-path="url(#twc${i})">
          <rect x="0" y="${lvl.toFixed(1)}" width="112" height="${(200 - lvl).toFixed(1)}" fill="${col}" opacity=".42"/>
          <rect x="10" y="${(lvl + 14).toFixed(1)}" width="7" height="${Math.max(0, 200 - lvl - 40).toFixed(1)}" rx="3.5" fill="#fff" opacity=".28"/>
          <rect x="0" y="0" width="112" height="70" fill="var(--secondary-background-color)"/>
          <rect x="0" y="68" width="112" height="4" fill="var(--divider-color)" opacity=".8"/>
        </g>
        <circle cx="36" cy="32" r="18" fill="none" stroke="var(--secondary-text-color)" stroke-width="1.5" opacity=".7"/>
        <g class="fan" fill="var(--secondary-text-color)" opacity=".75">${[0, 120, 240].map((r) => `<ellipse cx="36" cy="23" rx="5" ry="9" transform="rotate(${r} 36 32)"/>`).join("")}<circle cx="36" cy="32" r="3.5" fill="var(--card-background-color)"/></g>
        <g stroke="var(--secondary-text-color)" stroke-width="2.5" stroke-linecap="round" opacity=".5"><line x1="64" x2="94" y1="22" y2="22"/><line x1="64" x2="94" y1="32" y2="32"/><line x1="64" x2="94" y1="42" y2="42"/></g>
        <circle cx="92" cy="56" r="4" fill="${heats ? GREEN : "var(--divider-color)"}"/>
        <text x="36" y="62" font-size="11" text-anchor="middle" fill="var(--secondary-text-color)">${outer === null ? "" : this._fmt(outer) + "°"}</text>
        <circle cx="18" cy="146" r="5" fill="var(--card-background-color)" stroke="var(--primary-text-color)" stroke-width="1.8"/>
        <text x="66" y="156" text-anchor="middle" font-size="28" font-weight="500" fill="var(--primary-text-color)">${w === null ? "–" : this._fmt(w) + "°"}</text>
        <text x="62" y="178" text-anchor="middle" font-size="11" fill="var(--secondary-text-color)">${this._t("tw_mp")}</text>
        ${marks}
      </g></svg>`;
    const chip = bad ? `<span class="chip r">${this._t("tw_problem")}</span>` : prog ? `<span class="chip ${prog === "pv" ? "g" : prog === "minimum" ? "w" : prog === "normal" ? "a" : ""}">${this._t(`tw_p_${prog}`)}</span>` : "";
    const tile = (label, value) => `<div class="twm"><small>${label}</small><b>${value}</b></div>`;
    const since = heats && today && today.since != null ? this._twFmtDur(Math.max(0, Date.now() / 1000 - today.since)) : null;
    const tiles = [
      pw !== null ? tile(this._t(heats ? "tw_since" : "tw_hp"), heats ? (since || "–") : this._t("tw_idle")) : "",
      pw !== null ? tile(this._t("power"), `${this._fmt(pw, 0)} W`) : "",
      today && today.kwh != null ? tile(this._t("tw_today_e"), `${this._fmt(today.kwh)} kWh`) : "",
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

  // Wide panel (a container of 1000 px or more): two columns, 2 : 1; narrow: one column.
  _twWide() {
    return (this.clientWidth || 900) - 32 >= 1000;
  }

  // Usable width of a card: all of it, or its share (of 2 : 1) of the wide layout.
  _twCardW(share = 1) {
    const total = (this.clientWidth || 900) - 32;
    return (this._twWide() ? (total - 12) * share : total) - 32;
  }

  // One slim scale from 30 to 65 degrees: the zones around the normal target, the three targets as marks and the pointer at
  // the water temperature. What the switching band means is said in one line below.
  _twScale(t) {
    const g = (k) => this._num(t.ents[k]), tn = g("twwp_target_normal"), tp = g("twwp_target_pv"), tm = g("twwp_target_min");
    const lo = g("twwp_hyst_low"), hi = g("twwp_hyst_high"), w = this._twWater(t);
    if (tn === null || tp === null || tm === null || lo === null || hi === null) return null;
    const W = Math.max(300, Math.min(1300, this._twCardW(1 / 3))), pl = 22, y0 = 36, H = 80;
    const x = (v) => pl + ((Math.max(S_LO, Math.min(S_HI, v)) - S_LO) / (S_HI - S_LO)) * (W - 2 * pl);
    const bounds = [S_LO, tm, tn - lo, tn + hi, S_HI].reduce((o, v) => (o.push(Math.max(o.length ? o[o.length - 1] : S_LO, Math.min(S_HI, v))), o), []);
    const zones = [["tw_z_min", BLUE, .5], ["tw_z_heat", AMBER, .55], ["tw_z_hold", "#8a8f98", .45], ["tw_z_done", CORAL, .5]];
    const bar = zones.map(([, c, op], k) => (bounds[k + 1] > bounds[k] ? `<rect x="${x(bounds[k]).toFixed(1)}" y="${y0}" width="${(x(bounds[k + 1]) - x(bounds[k])).toFixed(1)}" height="12" fill="${c}" opacity="${op}"/>` : "")).join("");
    const marks = [[tm, this._t("tw_ref_min", this._fmt(tm, 0))], [tn, this._t("tw_ref_n", this._fmt(tn, 0))], [tp, this._t("tw_pv_line", this._fmt(tp, 0))]].sort((m, n) => m[0] - n[0]);
    let lastX = -1e9, level = 0;
    const flags = marks.map(([v, l]) => {
      level = x(v) - lastX < 90 ? 1 - level : 0; lastX = x(v);
      return `<line x1="${x(v).toFixed(1)}" x2="${x(v).toFixed(1)}" y1="${level ? 16 : 31}" y2="52" stroke="var(--primary-text-color)" stroke-width="1.4"/><text x="${x(v).toFixed(1)}" y="${level ? 12 : 27}" text-anchor="middle" font-size="12" font-weight="500" fill="var(--primary-text-color)">${l}</text>`;
    }).join("");
    const ticks = [30, 40, 50, 60, 65].map((v) => `<text x="${x(v).toFixed(1)}" y="76" text-anchor="middle" font-size="12" fill="var(--secondary-text-color)">${v}</text>`).join("");
    const right = w !== null && x(w) > W - 120;
    const pointer = w === null ? "" : `<path d="M${x(w).toFixed(1)} 50 L${(x(w) - 6).toFixed(1)} 60 L${(x(w) + 6).toFixed(1)} 60 Z" fill="${CORAL}"/><text x="${(x(w) + (right ? -10 : 10)).toFixed(1)}" y="62" text-anchor="${right ? "end" : "start"}" font-size="12" font-weight="500" fill="var(--primary-text-color)">${this._t("tw_now", this._fmt(w))}</text>`;
    const f = (v) => this._fmt(v, v % 1 ? 1 : 0);
    const caption = `${this._t("tw_br_n", f(tn - lo), f(tn + hi))} · ${this._t("tw_br_pv", f(tp - lo), f(tp + hi))}`;
    const legend = zones.map(([k, c, op]) => `<span><i style="background:${c};opacity:${op + 0.15}"></i>${this._t(k)}</span>`).join("");
    return { svg: `<div class="chw"><svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto" role="img" aria-label="${this._t("tw_targets")}">${bar}${flags}${ticks}${pointer}</svg></div>`, legend, caption };
  }

  // The scale with the switching thresholds said in words; sits at the bottom of the operation card, because it shows why the
  // controller decides as it does.
  _twScaleBlock(t) {
    const scale = this._twScale(t);
    if (!scale) return "";
    return `<div class="twsc"><div class="twsch">${this._icon("mdi:thermometer-lines")}${this._t("tw_scale")}</div>${scale.svg}<div class="legend" style="margin:4px 0 0">${scale.legend}</div><div class="note" style="margin-top:6px">${scale.caption}</div></div>`;
  }

  // The three targets as steppers; the hysteresis is rarely changed, so it sits folded away behind a line that says what it is.
  _twTargets(t) {
    const lo = this._twTarget(t.ents.twwp_hyst_low), hi = this._twTarget(t.ents.twwp_hyst_high);
    const group = (list, unit) => list.filter(([k]) => t.ents[k]).map(([k, l]) => this._twStepper(t.ents[k], this._t(l), unit)).join("");
    const warn = lo !== null && hi !== null && lo + hi < MIN_BAND, open = !!this._twHystOpen, f = (v) => this._fmt(v, v % 1 ? 1 : 0);
    const hyst = lo !== null && hi !== null ? `<div class="twhy"><button class="lnk twhyb" data-act="twhyst" aria-expanded="${open}">${this._icon(open ? "mdi:chevron-up" : "mdi:chevron-down")}${this._t("tw_hyst_h")} · ${this._t("tw_hyst_sum", f(lo), f(hi))}</button>
      ${open ? `<div class="rows">${group(HYSTS, " K")}</div>` : ""}</div>` : "";
    return `<ha-card>${this._header("mdi:tune-variant", this._t("tw_targets"))}<div class="rows">${group(TARGETS, "°")}</div>${hyst}
      ${warn ? `<div class="note" style="color:#c98400">${this._t("tw_hyst_warn")}</div>` : ""}</ha-card>`;
  }

  // Operation: whether the controller switches (or only runs dry), the PV status, the enables and the last decision.
  // The program itself is shown in the card header of the main picture and in the day strip.
  _twOperation(t) {
    const c = this._twCfg(t), ctl = t.ents.twwp_control, ctlOn = this._on(ctl);
    const pvs = this._ok(t.ents.twwp_pv_status) ? this._state(t.ents.twwp_pv_status).state : null;
    const r = t.ents.twwp_reason, rs = this._state(r), at = (rs && rs.attributes) || {}, ok = this._ok(r);
    const pl = t.ents.twwp_planned, plN = this._num(pl), bad = this._on(t.ents.twwp_sensor_problem);
    const sw = pl && this._state(pl) ? Object.entries(this._state(pl).attributes.switches || {}).map(([e, v]) => `${esc(e)} → ${this._t(v === "on" ? "tw_on" : "tw_off")}`).join("<br>") : "";
    const known = (id) => (id && this._state(id) ? this._t(this._on(id) ? "tw_on" : "tw_off") : null);
    const en = known(c.enable_switch) !== null ? this._twRow(this._t("tw_en"), this._t("tw_en_val", known(c.enable_switch), known(c.enable_pv_switch) || "–")) : "";
    return `<ha-card>${this._header("mdi:cog-outline", this._t("tw_op"))}
      ${ctl ? `<div class="f twctl first"><div><b>${this._t("tw_ctl")}</b><small>${this._t(ctlOn ? "tw_ctl_on" : "tw_ctl_off")}</small></div>
        <ha-switch data-act="twctl" data-v="${ctl}" ${ctlOn ? "checked" : ""} ${this._ok(ctl) ? "" : "disabled"}></ha-switch></div>` : ""}
      <div class="rows">${pvs ? this._twRow(this._t("tw_pvstatus"), `<span class="chip ${pvs === "pv" ? "g" : pvs === "too_cold" ? "w" : ""}">${this._t(`tw_pv_${pvs}`)}</span>`) : ""}
        ${en}
        ${ok ? `<div class="f"><span>${this._t("tw_last")}<small class="lb"> · ${this._twAge(at.last_run)}</small></span><b>${this._t(`tw_r_${rs.state}`)}</b></div>` : ""}
        ${plN !== null && plN > 0 ? this._twRow(this._t("tw_planned"), String(plN)) : ""}${sw && plN > 0 ? `<div class="note">${sw}</div>` : ""}
        ${bad ? this._twRow(this._t("tw_problem"), this._t("tw_yes"), `style="color:#db4437"`) : ""}
        ${at.last_error ? this._twRow(this._t("tw_err"), esc(at.last_error), `style="color:#db4437"`) : ""}</div>${this._twScaleBlock(t)}</ha-card>`;
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
      body = lanes === undefined ? this._skel(260) : lanes.length ? this._laneChart(lanes, { range, phases }) : emptyNote;
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
      <div class="twc"><div class="twgrid">
        <div class="tw-hero">${this._twHero(t, i)}</div>
        <div class="tw-op">${this._twOperation(t)}</div><div class="tw-set">${this._twTargets(t)}</div>
        <div class="tw-hist">${this._twHistory(t)}</div></div></div>`).join("")}</div>`;
  }
}

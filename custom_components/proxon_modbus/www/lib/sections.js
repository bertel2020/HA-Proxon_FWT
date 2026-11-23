import { MODE_META, FAN_STAGES, BLUE, CORAL, AMBER, GREEN, WRITE_ERROR_SHOWN_MS, BAD, esc } from "./constants.js";

export class SectionsMethods {
  // ---- sections ---------------------------------------------------------

  // Operating mode state shared by the dashboard card and the panel: what is selected, whether it can be changed, what to offer.
  _modeState(c) {
    const sel = this._state(c.operating_mode);
    const cur = sel && !BAD.includes(sel.state) ? sel.state : null;
    const detail = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    const readonly = !cur && detail && !Object.keys(MODE_META).includes(detail);
    const unavail = !!sel && sel.state === "unavailable";
    const changeOk = c.mode_change_possible ? this._on(c.mode_change_possible) || !this._ok(c.mode_change_possible) : true;
    const locked = readonly || unavail || !changeOk;
    const opts = (sel && sel.attributes.options) || Object.keys(MODE_META);
    const banner = readonly
      ? `<div class="banner ${detail === "emergency" ? "r" : "w"}" style="margin-bottom:10px">${this._icon("mdi:alert-outline")}${this._t(detail)} – ${this._t("locked")}</div>`
      : "";
    const desc = readonly ? this._t("readonly") : cur ? this._t(`d_${cur}`) : "";
    return { cur, detail, readonly, locked, opts, banner, desc };
  }

  // One button per selectable mode; `inner(option, meta)` is the card's or the panel's button content.
  _modeButtons(m, inner) {
    return m.opts.map((o) => {
      const meta = MODE_META[o] || { icon: "mdi:cog", color: "#8a8f98" };
      return this._btn(`data-act="mode" data-v="${esc(o)}"`, m.cur === o && !m.locked ? "a" : "", inner(o, meta), m.locked, `--mc:${meta.color}`);
    }).join("");
  }

  // Fan stage state shared by the card and the panel.
  _fanState(c) {
    const sel = this._state(c.fan_stage);
    const stageOk = !!sel && !BAD.includes(sel.state);
    const autoOn = this._on(c.fan_auto);
    const selectable = (n) => {
      const k = n === 0 ? "fan_off_selectable" : `fan_stage_${n}_selectable`;
      return !c[k] || !this._ok(c[k]) || this._on(c[k]);
    };
    const label = stageOk ? FAN_STAGES.find(([o]) => o === sel.state)?.[2] ?? "" : null;
    return { sel, stageOk, autoOn, selectable, current: autoOn ? this._t("auto") : stageOk ? `${this._t("stage")} ${label}` : "" };
  }

  // Stage buttons plus the auto button; `inner(icon, label)` is the card's or the panel's button content.
  _fanButtons(c, f, inner) {
    return FAN_STAGES.map(([opt, icon, label], i) =>
      this._btn(`data-act="fan" data-v="${esc(opt)}"`, f.stageOk && !f.autoOn && f.sel.state === opt ? "a" : "", inner(icon, label), !f.stageOk || !f.selectable(i), `--mc:${BLUE}`)).join("")
      + this._btn(`data-act="fanauto"`, f.autoOn ? "a" : "", inner("mdi:fan-auto", this._t("auto")), !this._ok(c.fan_auto), `--mc:${GREEN}`);
  }

  // The remembered ("Wunschstufe") stage of the restore switch.
  _restoreState(c) {
    const rs = this._state(c.fan_stage_restore), pref = rs?.attributes?.preferred_stage;
    return { rs, pref, prefLabel: FAN_STAGES.find(([o]) => o === pref)?.[2] };
  }

  _sec_alerts(d) {
    const c = d.central;
    const out = [];
    if (this._on(c.error_system)) out.push(["r", "mdi:alert-circle-outline", this._t("error")]);
    if (!this._drawerMode && this._on(c.filter_device)) {
      const f = this._filterInfo(c);
      out.push([f.left !== null && f.left <= 7 ? "r" : "w", "mdi:air-filter", `${this._t("filter_device")}: ${this._t("change_due")}${f.left !== null ? ` · ${this._t("f_shutdown", this._days(f.left))}` : ""}`]);
    }
    if (!this._drawerMode && this._recirc() && this._on(c.filter_recirculation)) out.push(["w", "mdi:air-filter", `${this._t("filter_recirc")}: ${this._t("change_due")}`]);
    const det = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    if (det === "emergency" || det === "frost_protection") out.push([det === "emergency" ? "r" : "w", "mdi:alert-outline", this._t(det)]);
    const we = this._ok(c.last_write_error) ? this._state(c.last_write_error) : null;
    // The sensor keeps the last error for diagnostics; only a recent one is worth a warning banner.
    const weAt = we && we.attributes && Date.parse(we.attributes.occurred_at);
    if (we && we.state !== "none" && weAt && Date.now() - weAt < WRITE_ERROR_SHOWN_MS) {
      out.push(["w", "mdi:pencil-off", `${this._t("write_error")}: ${esc(we.state)}`]);
    }
    if (this._isPanel) out.push(...this._twAlerts(d));
    if (!out.length) return "";
    // A banner with a fourth entry opens that tab when clicked.
    return `<div class="alerts">${out.map(([k, i, t, go]) => `<div class="banner ${k}${go ? " go" : ""}" ${go ? `data-act="tab" data-v="${go}" role="button" tabindex="0"` : ""}>${this._icon(i)}${t}${go ? `<span class="bgo">${this._t("tw_open")}${this._icon("mdi:chevron-right")}</span>` : ""}</div>`).join("")}</div>`;
  }

  _sec_kpi(d) {
    const c = d.central;
    // In the panel a tile opens the matching history; the heat recovery tile also carries a 24 h sparkline.
    const panel = this._isPanel;
    const missing = (v) => v === null || v === undefined;
    // A missing value shows a dash, so the four tiles are always the same and it is visible which one has no data.
    // A missing value says why: no source at all (`src` false: nothing chosen or found) or a source without a value.
    const tile = (icon, color, label, value, unit = "", metric = "", extra = "", src = true, ent = "") => missing(value)
      ? tile0(icon, color, label, "–", "", "", `<div class="lb" title="${this._t(src ? "kpi_nodata" : "kpi_nosrc")}">${this._t(src ? "kpi_nodata" : "kpi_nosrc")}</div>`)
      : tile0(icon, color, label, value, unit, metric, extra, ent);
    const tile0 = (icon, color, label, value, unit, metric, extra, ent = "") =>
      `<div class="k ${panel && metric ? "go" : !panel && ent ? "go lk" : ""}" style="--kc:${color}" ${panel && metric ? `data-act="kpi" data-v="${metric}" role="button" tabindex="0"` : !panel && ent ? `data-act="more" data-v="${ent}" role="button" tabindex="0"` : ""}><div class="ic">${this._icon(icon)}</div><div><div class="lb">${label}</div><div class="v">${value}${unit ? ` <small>${unit}</small>` : ""}</div>${extra}</div></div>`;
    const eff = this._efficiency();
    const bypass = this._on(c.bypass_active);
    const power = this._pnum(), rpm = this._ok(c.compressor_speed) ? this._num(c.compressor_speed) : null;
    // Pairs read together (two columns on phones): supply / outside air, heat recovery / unit power, PTC (or compressor) / hot water.
    const ptcId = this._ptcP(), ptcW = ptcId ? this._watts(ptcId) : null, [ptcOn, ptcN] = this._ptcRooms(d);
    const ptcTile = tile("mdi:radiator", CORAL, this._t("ptc_short"), ptcW === null ? null : ptcW >= 1000 ? this._fmt(ptcW / 1000, 2) : this._fmt(ptcW, 0), ptcW !== null && ptcW >= 1000 ? "kW" : "W", "ptc",
      `${this._kpiSpark(d, "ptc", this._t("ptc_power"), CORAL, { lo: 0, step: true })}${ptcN ? `<div class="lb">${this._t("ptc_rooms", ptcOn, ptcN)}</div>` : ""}`, true, ptcId);
    const html = tile("mdi:thermometer", CORAL, this._t("supply_t"), this._temp(c.temp_supply_air), "", "temp", this._kpiSpark(d, "temp", this._t("supply_t"), CORAL), !!c.temp_supply_air, c.temp_supply_air) +
      tile("mdi:weather-partly-cloudy", BLUE, this._t("outside"), this._temp(this._outdoorId()), "", "temp", this._kpiSpark(d, "temp", this._t("outside"), BLUE), !!this._outdoorId(), this._outdoorId()) +
      tile("mdi:percent-circle-outline", GREEN, this._t("efficiency"), bypass ? this._t("bypass_short") : eff === null ? null : `${eff} % <span title="${this._t("eff_info")}">${this._icon("mdi:information-outline", 'class="info"')}</span>`, "", "eff", this._effSpark(d), true, c.heat_recovery) +
      tile("mdi:flash", AMBER, this._t("power"), power === null ? null : this._fmt(power, power % 1 ? 1 : 0),
        "W", "power", this._kpiSpark(d, "power", this._t("power"), AMBER, { lo: 0, step: true }), !!this._powerId(), this._powerId()) +
      (ptcId ? ptcTile : (
      tile("mdi:engine-outline", "#7e57c2", this._t("compressor"), rpm === null ? null : this._fmt(rpm, 0), "rpm", "drives",
        this._kpiSpark(d, "drives", this._t("compressor"), "#7e57c2", { lo: 0 }), !!c.compressor_speed, c.compressor_speed)
      )) +
      (panel && d.twwp.length ? this._twKpi(d) : "");
    if (![this._temp(c.temp_supply_air), power, rpm, this._temp(this._outdoorId()), bypass ? 1 : eff].some((v) => !missing(v))) return "";
    return `<ha-card>${this._header("mdi:gauge", this._t("kpi"))}<div class="kpiw"><div class="kpi">${html}</div></div></ha-card>`;
  }

  // Small 24 h curve for a key figure tile (panel only). pts: [[time, value]]; o: { lo, hi } to widen the scale, step for a staircase.
  // Without enough data an empty placeholder of the same height keeps all tiles equally tall.
  _sparkSvg(pts, color, o = {}) {
    if (!this._isPanel) return "";
    if (!pts || pts.length < 3) return `<div class="spk"></div>`;
    const t1 = Date.now() / 1000, t0 = t1 - 86400, W = 100, H = 22;
    const vs = pts.map((p) => p[1]);
    const lo = Math.min(...vs, o.lo ?? Infinity);
    let hi = Math.max(...vs, o.hi ?? -Infinity);
    if (hi - lo < 1e-9) hi = lo + 1;
    const line = (o.step ? this.constructor._stairs(pts) : pts).map(([t, v]) => `${(((t - t0) / (t1 - t0)) * W).toFixed(1)},${(H - ((v - lo) / (hi - lo)) * (H - 2) - 1).toFixed(1)}`).join(" ");
    return `<svg class="spk" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${line}"/></svg>`;
  }

  // The 24 h curve of one curve of a history metric (shares its data with the history chart); label picks the curve.
  _kpiSpark(d, metric, label, color, o) {
    if (!this._isPanel) return "";
    const defs = this._metricDefs(d, metric), i = defs.findIndex((x) => x[1] === label);
    if (i < 0) return this._sparkSvg(null, color);
    const ser = this._hget(`s|24h|${metric}`, () => this._loadSeries("24h", metric, defs));
    return this._sparkSvg(ser && ser[i] ? ser[i].pts : null, color, o);
  }

  // Small 24 h curve of the heat recovery rate.
  _effSpark(d) {
    if (!this._isPanel) return "";
    const defs = this._metricDefs(d, "eff");
    if (!defs.length) return this._sparkSvg(null, GREEN);
    const ser = this._hget("s|24h|eff", () => this._loadSeries("24h", "eff", defs));
    return this._sparkSvg(ser && ser[0] ? ser[0].pts : null, GREEN, { lo: 50, hi: 90 });
  }

  _sec_air(d) {
    const c = d.central;
    if (!["temp_fresh_air", "temp_exhaust_air", "temp_extract_air", "temp_supply_air"].some((k) => c[k])) return "";
    const flip = this._flip();
    const out = flip ? 530 : 20, inn = flip ? 20 : 530;
    const xo = flip ? 375 : 305, xi = flip ? 305 : 375, sg = flip ? -1 : 1;
    const ln = (x1, y1, x2, y2, col, anim, arrow) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2" ${anim ? 'class="fl"' : ""} ${arrow ? 'marker-end="url(#pa)"' : ""}/>`;
    const box = (x, y, col, label, id) => {
      const v = this._temp(id);
      return this._lk(id, `<rect x="${x}" y="${y}" width="130" height="46" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".6" stroke-width=".7"/>
        <text class="st" x="${x + 65}" y="${y + 15}" text-anchor="middle">${label}</text>
        <text class="sh" x="${x + 65}" y="${y + 34}" text-anchor="middle">${v === null ? "–" : `${v}C`}</text>`, "g");
    };
    const svg = `<svg width="100%" viewBox="0 0 680 220" role="img" aria-label="${this._t("exchanger")}">
      <defs><marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
      <text class="st" x="${out + 65}" y="22" text-anchor="middle">${this._t("outdoor_side")}</text>
      <text class="st" x="${inn + 65}" y="22" text-anchor="middle">${this._t("room_side")}</text>
      <polygon points="340,40 410,110 340,180 270,110" fill="var(--secondary-background-color)" stroke="var(--divider-color)"/>
      ${ln(xo, 75, 340, 110, BLUE, 1)}${ln(340, 110, xi, 145, CORAL, 1)}${ln(xi, 75, 340, 110, CORAL, 1)}${ln(340, 110, xo, 145, BLUE, 1)}
      ${ln(out + (flip ? 0 : 130), 75, xo - sg * 2, 75, BLUE, 0, 1)}${ln(xo - sg * 2, 145, out + (flip ? 0 : 130), 145, BLUE, 0, 1)}
      ${ln(inn + (flip ? 130 : 0), 75, xi + sg * 2, 75, CORAL, 0, 1)}${ln(xi + sg * 2, 145, inn + (flip ? 130 : 0), 145, CORAL, 0, 1)}
      ${box(out, 52, BLUE, this._t("fresh"), c.temp_fresh_air)}${box(out, 122, BLUE, this._t("exhaust"), c.temp_exhaust_air)}
      ${box(inn, 52, CORAL, this._t("extract"), c.temp_extract_air)}${box(inn, 122, CORAL, this._t("supply"), c.temp_supply_air)}
      <text class="st" x="340" y="205" text-anchor="middle">${this._t("exchanger")}</text></svg>`;
    const bypass = c.bypass_active && this._ok(c.bypass_active) ? this._t(this._on(c.bypass_active) ? "bypass_open" : "bypass_closed") : "";
    return `<ha-card>${this._header("mdi:swap-horizontal", this._t("air"), bypass)}<div class="svgs">${svg}</div></ha-card>`;
  }

  // Rounded polyline path (corner radius r) through the given points.
  _rpath(pts, r = 10) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1), a = Math.min(r, l1 / 2, l2 / 2);
      d += `L${(x1 - ((x1 - x0) / l1) * a).toFixed(1)} ${(y1 - ((y1 - y0) / l1) * a).toFixed(1)}Q${x1} ${y1} ${(x1 + ((x2 - x1) / l2) * a).toFixed(1)} ${(y1 + ((y2 - y1) / l2) * a).toFixed(1)}`;
    }
    const e = pts[pts.length - 1];
    return `${d}L${e[0]} ${e[1]}`;
  }

  _sec_schema(d) {
    if (!this._isPanel && this.clientWidth && this.clientWidth < 420) return this._sec_air(d); // the diagram is drawn 680 wide: below 420 px the four temperatures read better
    const c = d.central;
    const flip = this._flip();
    const X = (x) => (flip ? 680 - x : x);
    const run = !(this._ok(c.operating_mode_state) && this._state(c.operating_mode_state).state === "off");
    const bypass = this._on(c.bypass_active);
    const cool = this._on(c.heat_pump_cooling);
    const T = (id) => this._temp(id);
    const rpm = this._num(c.compressor_speed);
    const hp = run && (rpm !== null ? rpm > 0 : this._on(c.heat_pump_heating) || cool);
    const rpmS = this._num(c.fan_speed_supply), rpmE = this._num(c.fan_speed_extract);
    const eff = this._efficiency();
    const MILD = "var(--secondary-text-color)";
    const tone = (id) => { const v = this._num(id); return v === null ? MILD : v <= 16 ? BLUE : v >= 26 ? CORAL : MILD; };
    const P = (pts) => pts.map(([x, y]) => [X(x), y]);
    // Air path: soft duct + thin core + flowing dots. All three share one path, the dots loop by exactly one dash period.
    const air = (pts, stroke, on, dim) => { const p = this._rpath(P(pts));
      return `<g ${dim ? 'class="dim"' : ""}><path class="duct" d="${p}" stroke="${stroke}"/><path class="core" d="${p}" stroke="${stroke}"/><path class="dots ${on ? "go" : ""}" d="${p}" stroke="${stroke}"/></g>`; };
    const refr = (pts, col, on) => { const p = this._rpath(P(pts), 14);
      return `<path class="duct" d="${p}" stroke="${col}"/><path class="refr ${on ? "rgo" : ""}" d="${p}" stroke="${col}"/>`; };
    const stops = (a) => a.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join("");
    const pill = (cx, cy, label, id) => { const col = tone(id);
      return this._lk(id, `<rect x="${X(cx) - 42}" y="${cy - 22}" width="84" height="44" rx="11" fill="color-mix(in srgb, ${col} 13%, var(--card-background-color))" stroke="color-mix(in srgb, ${col} 55%, transparent)"/>
        <text class="st nh" x="${X(cx)}" y="${cy - 5}" text-anchor="middle">${label}</text><text class="sh" x="${X(cx)}" y="${cy + 14}" text-anchor="middle">${T(id) || "–"}</text>`, "g"); };
    const coil = (cx, col, label, id) => this._lk(id, `<rect x="${X(cx) - 8}" y="123" width="16" height="44" rx="5" fill="color-mix(in srgb, ${col} 28%, var(--card-background-color))" stroke="${col}" stroke-width="1.3"/>
      <text class="st" x="${X(cx)}" y="112" text-anchor="middle">${label}${T(id) ? " " + T(id) : ""}</text>`, "g");
    // Both fans sit upstream of the exchanger (fresh-air fan after the preheater, extract fan in the extract stream).
    const fan = (cx, rp, id) => {
      const sp = rp ? Math.max(0.35, 1.5 - rp / 1600) : 1;
      const blades = [0, 120, 240].map((a) => `<path transform="rotate(${a})" d="M0 0C5 -2 11 -7 8 -13C3 -13 -2 -7 0 0Z" fill="var(--secondary-text-color)"/>`).join("");
      return this._lk(id, `<circle cx="${X(cx)}" cy="75" r="17" fill="var(--card-background-color)" stroke="var(--pbd)" stroke-width="1.5"/>
        <g transform="translate(${X(cx)} 75)"><g class="${run && rp ? "rot" : ""}" style="--fan:${sp.toFixed(2)}s">${blades}</g><circle r="2.6" fill="var(--card-background-color)" stroke="var(--secondary-text-color)"/></g>
        <text class="st" x="${X(cx)}" y="48" text-anchor="middle">${rp === null ? "" : rp.toLocaleString(this._hass.language) + " rpm"}</text>`, "g"); };
    const probe = (cx, cy, ty, txt, id, col) => T(id) ? this._lk(id, `<circle cx="${X(cx)}" cy="${cy}" r="4" fill="${col}" stroke="var(--card-background-color)" stroke-width="1.8"/>
      <text class="st" x="${X(cx)}" y="${ty}" text-anchor="middle">${txt} ${T(id)}</text>`, "g") : "";
    const preheat = c.temp_post_preheat && this._ok(c.temp_post_preheat)
      ? `<rect x="${X(150) - 8}" y="61" width="16" height="28" rx="5" fill="color-mix(in srgb, ${CORAL} 25%, var(--card-background-color))" stroke="${CORAL}" stroke-width="1.3"/>
         <path d="M${X(150) - 4} 66L${X(150) + 4} 71L${X(150) - 4} 76L${X(150) + 4} 81" fill="none" stroke="${CORAL}" stroke-width="1.2"/>` : "";
    const WARMISH = `color-mix(in srgb, ${CORAL} 55%, ${BLUE})`;
    const freshN = [[92, 75], [303, 75], [340, 110], [377, 145], [588, 145]];
    const fresh = bypass ? [[92, 75], [250, 75], [250, 48], [430, 48], [430, 145], [588, 145]] : freshN;
    const exh = [[588, 75], [377, 75], [340, 110], [303, 145], [92, 145]];
    const gF = bypass ? [[0, BLUE], [1, BLUE]] : cool ? [[0, CORAL], [0.4, CORAL], [0.6, BLUE], [1, BLUE]] : hp ? [[0, BLUE], [0.4, BLUE], [0.6, CORAL], [1, CORAL]] : [[0, BLUE], [0.4, BLUE], [0.6, WARMISH], [1, WARMISH]]; // heat pump off: only the exchanger warms the air
    const gE = bypass ? [[0, CORAL], [1, CORAL]] : cool ? [[0, BLUE], [0.4, BLUE], [0.6, CORAL], [1, CORAL]] : [[0, CORAL], [0.4, CORAL], [0.6, BLUE], [1, BLUE]];
    const spdA = run && rpmS ? Math.max(0.6, 2.2 - rpmS / 1100) : 1.2;
    const spdR = hp && rpm ? Math.max(0.5, 1.6 - rpm / 3500) : 1;
    const IDLE = "var(--pbd)", hc = hp ? CORAL : IDLE, cc = hp ? BLUE : IDLE;
    const loop = cool
      ? refr([[314, 245], [180, 245], [180, 169]], hc, hp) + refr([[200, 169], [200, 305], [326, 305]], hc, hp) + refr([[354, 305], [480, 305], [480, 169]], cc, hp) + refr([[500, 169], [500, 245], [366, 245]], cc, hp)
      : refr([[366, 245], [500, 245], [500, 169]], hc, hp) + refr([[480, 169], [480, 305], [354, 305]], hc, hp) + refr([[326, 305], [200, 305], [200, 169]], cc, hp) + refr([[180, 169], [180, 245], [314, 245]], cc, hp);
    const ring = hp ? (cool ? BLUE : CORAL) : IDLE, circ = 2 * Math.PI * 31, frac = Math.min(1, (rpm || 0) / (this._config.max_compressor_rpm || 6000));
    const outdoor = T(this._outdoorId());
    const hx = [[340, 40], [410, 110], [340, 180], [270, 110]].map(([x, y]) => `${X(x)},${y}`).join(" ");
    const svg = `<svg width="100%" viewBox="0 0 680 340" role="img" aria-label="${this._t("schema")}" class="sch ${run ? "" : "off"}" style="--spd:${spdA.toFixed(2)}s;--rsp:${spdR.toFixed(2)}s">
      <defs>
        <linearGradient id="gF" gradientUnits="userSpaceOnUse" x1="${X(92)}" y1="0" x2="${X(588)}" y2="0">${stops(gF)}</linearGradient>
        <linearGradient id="gE" gradientUnits="userSpaceOnUse" x1="${X(588)}" y1="0" x2="${X(92)}" y2="0">${stops(gE)}</linearGradient>
        <linearGradient id="gX" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BLUE}" stop-opacity=".16"/><stop offset=".5" stop-color="${BLUE}" stop-opacity="0"/><stop offset="1" stop-color="${CORAL}" stop-opacity=".16"/></linearGradient>
      </defs>
      <rect x="100" y="14" width="480" height="312" rx="22" fill="var(--secondary-background-color)" stroke="var(--pbd)" stroke-dasharray="3 5" stroke-linecap="round"/>
      <g><title>${this._t("tip_hx", eff === null ? "–" : eff + " %")}</title>
        <polygon points="${hx}" fill="var(--card-background-color)" stroke="var(--pbd)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="${hx}" fill="url(#gX)" stroke-linejoin="round"/></g>
      ${air(freshN, "url(#gF)", run && !bypass, bypass)}${air(exh, "url(#gE)", run)}${bypass ? air(fresh, "url(#gF)", run) : ""}
      <g opacity="${hp ? 1 : 0.35}">${loop}</g>
      <polygon points="${[[354, 305], [340, 296], [326, 305], [340, 314]].map(([x, y]) => `${X(x)},${y}`).join(" ")}" fill="var(--card-background-color)" stroke="${hp ? ring : IDLE}" stroke-width="1.5" stroke-linejoin="round"/>
      ${cool ? coil(190, CORAL, this._t("cond_s"), c.temp_condenser) + coil(490, BLUE, this._t("evap_s"), c.temp_evaporator)
        : coil(190, hp ? BLUE : MILD, this._t("evap_s"), c.temp_evaporator) + coil(490, hp ? CORAL : MILD, this._t("cond_s"), c.temp_condenser)}
      ${preheat}${fan(215, rpmS, c.fan_speed_supply)}${fan(500, rpmE, c.fan_speed_extract)}
      ${probe(190, 75, 32, this._t("post_preheat_s"), c.temp_post_preheat, BLUE)}${probe(cool ? 428 : 252, 145, 166, this._t("pre_evap_s"), c.temp_pre_evaporator, BLUE)}${probe(cool ? 252 : 428, 145, 166, this._t("pre_cond_s"), c.temp_pre_condenser, CORAL)}
      ${this._lk(c.heat_recovery, `<circle cx="${X(340)}" cy="110" r="23" fill="var(--card-background-color)" stroke="var(--pbd)"/>
      <text class="sh" x="${X(340)}" y="110" text-anchor="middle" style="font-size:14px">${bypass ? this._t("bypass_short") : eff !== null && run ? eff + " %" : "–"}</text>
      <text class="st nh" x="${X(340)}" y="124" text-anchor="middle" style="font-size:10px">${bypass ? this._t("open_s") : this._t("wrg_s")}</text>`, "g")}
      <text class="st" x="${X(340)}" y="198" text-anchor="middle">${this._t("exchanger")}</text>
      <g class="hot" data-act="${this._isPanel ? "tab" : "more"}" data-v="${this._isPanel ? "diag" : c.compressor_speed}" role="button" tabindex="0" aria-label="${this._t("tip_comp")}"><title>${this._t("tip_comp")}</title>
        ${hp ? `<circle class="ripple" cx="${X(340)}" cy="245" r="31" fill="none" stroke="${ring}" stroke-width="2"/>` : ""}
        <circle cx="${X(340)}" cy="245" r="31" fill="var(--card-background-color)" stroke="var(--pbd)" stroke-width="3.5"/>
        ${hp && frac > 0 ? `<circle cx="${X(340)}" cy="245" r="31" fill="none" stroke="${ring}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${X(340)} 245)"/>` : ""}
        <text class="sh" x="${X(340)}" y="243" text-anchor="middle">${!hp ? this._t("off_s") : rpm === null ? "–" : rpm.toLocaleString(this._hass.language)}</text>${hp ? `<text class="st nh" x="${X(340)}" y="258" text-anchor="middle">rpm</text>` : ""}</g>
      ${this._lk(c.temp_compressor, `<text class="st" x="${X(340)}" y="291" text-anchor="middle">${this._t("compressor")}${T(c.temp_compressor) ? " " + T(c.temp_compressor) : ""}</text>`, "g")}
      ${pill(48, 75, this._t("fresh"), c.temp_fresh_air)}${pill(48, 145, this._t("exhaust"), c.temp_exhaust_air)}
      ${pill(632, 75, this._t("extract"), c.temp_extract_air)}${pill(632, 145, this._t("supply"), c.temp_supply_air)}
      ${outdoor ? this._lk(this._outdoorId(), `<text class="sh nh" x="${X(48)}" y="38" text-anchor="middle">${this._t("outside")} ${outdoor}</text>`, "g") : ""}</svg>`;
    const heating = this._on(c.heat_pump_heating) || cool;
    const chips = `${c.bypass_active && this._ok(c.bypass_active) ? `<span class="chip ${bypass ? "a" : ""}">${this._icon("mdi:routes")}${this._t(bypass ? "bypass_open" : "bypass_closed")}</span>` : ""}
      ${c.heat_pump_heating ? `<span class="chip ${cool ? "a" : heating ? "g" : ""}">${this._icon(cool ? "mdi:snowflake" : heating ? "mdi:fire" : "mdi:pause")}${this._t(cool ? "hp_cooling" : heating ? "hp_heating" : "hp_idle")}</span>` : ""}`;
    return `<ha-card>${this._header("mdi:sitemap-outline", this._t("schema"), chips)}<div class="svgs">${svg}</div><div class="note">${this._t("probes")}</div></ha-card>`;
  }

  // The wish stage is a quiet small switch (neutral, numbers only), so it is not mistaken for the operating stage above it.
  _prefSeg(c, pref) {
    const rs = c.fan_stage_preferred, ok = rs && this._ok(rs);
    return `<div class="rseg pseg" role="group">${FAN_STAGES.filter(([o]) => o !== "off").map(([opt, , label]) =>
      this._btn(`data-act="prefstage" data-v="${esc(opt)}" aria-label="${this._t("stage")} ${label}"`, pref === opt ? "a" : "", label, !ok)).join("")}</div>`;
  }

  // Panel only: operating mode and fan stages in one card (the dashboard card keeps them as separate sections).
  _sec_operation(d, o = {}) {
    const c = d.central;
    if (!c.operating_mode && !c.fan_stage && !c.fan_auto && !c.fan_intensive) return "";
    // operating mode
    let modeHtml = "", desc = "";
    if (c.operating_mode) {
      const m = this._modeState(c);
      desc = m.desc;
      const buttons = this._modeButtons(m, (o, meta) => `${this._icon(meta.icon)}<span class="lf">${this._t(o)}</span><span class="ls">${this._t(`ms_${o}`)}</span>`);
      modeHtml = `${m.banner}<div class="seg cmp mo" style="grid-template-columns:repeat(${m.opts.length},1fr)">${buttons}</div>`;
    }
    // fan stages
    let fanHtml = "", current = "";
    if (c.fan_stage || c.fan_auto) {
      const f = this._fanState(c);
      const buttons = this._fanButtons(c, f, (icon, label) => label);
      current = f.current;
      fanHtml = `<div class="lbl2">${this._t("fan_stage_l")}${!f.stageOk && c.fan_stage ? `<span class="tag">${this._t("fan_note")}</span>` : ""}</div>
        <div class="seg cmp fs" style="grid-template-columns:repeat(6,1fr)">${buttons}</div>`;
    }
    const rpm = (id, ic) => this._num(id) === null ? "" : this._lk(id, `${this._icon(ic, 'class="info"')} ${this._num(id).toLocaleString(this._hass.language)}`);
    const rp = rpm(c.fan_speed_supply, "mdi:arrow-top-right") + rpm(c.fan_speed_extract, "mdi:arrow-bottom-left");
    const intensive = c.fan_intensive ? `<span class="tg">${this._t("intensive")}<ha-switch data-act="intensive" ${this._on(c.fan_intensive) ? "checked" : ""} ${this._ok(c.fan_intensive) ? "" : "disabled"}></ha-switch></span>` : "";
    const inline = rp || intensive ? `<div class="oinline">${rp ? `<span class="rp">${rp}<span>rpm</span></span>` : ""}${intensive}</div>` : "";
    let restore = "";
    if (c.fan_stage_restore) {
      const { pref, prefLabel } = this._restoreState(c);
      restore = `<div class="row">${this._icon("mdi:fan-clock")}${this._t("fan_restore")}<span class="sp"><ha-switch data-act="restoresw" ${this._on(c.fan_stage_restore) ? "checked" : ""} ${this._ok(c.fan_stage_restore) ? "" : "disabled"}></ha-switch></span></div>
        <div class="note rsub prefrow"><span>${this._t("fan_pref")}${prefLabel ? "" : `: ${this._t("fan_pref_none")}`}</span>${this._prefSeg(c, pref)}</div>`;
    }
    const hp = this._on(c.heat_pump_cooling) ? this._t("hp_cooling") : this._on(c.heat_pump_heating) ? this._t("hp_heating") : this._t("hp_idle");
    const right = [c.heat_pump_heating ? hp : "", current].filter(Boolean).join(" · ");
    const cool = !this._isPanel && c.cooling_enable
      ? `<div class="row">${this._icon("mdi:snowflake")}${this._t("cooling_enable")}<span class="sp"><ha-switch data-act="coolsw" ${this._on(c.cooling_enable) ? "checked" : ""} ${this._ok(c.cooling_enable) ? "" : "disabled"}></ha-switch></span></div>` : "";
    const inner = `${o.bare ? "" : this._header("mdi:tune-variant", this._t("operation"), right)}
      ${c.operating_mode ? `<div class="lbl2">${this._t("mode")}</div>` : ""}${modeHtml}${fanHtml}${inline}
      ${desc ? `<div class="note">${desc}</div>` : ""}${restore}${this._boostBlock(c, true)}${cool}`;
    return o.bare ? `<div class="opw bare">${inner}</div>` : `<ha-card class="opw">${inner}</ha-card>`;
  }

  // The one-glance block of the card: state of the unit, the four figures that matter, optional PTC; `extra` (the controls) sits below.
  _overviewParts(d) {
    const c = d.central;
    const m = c.operating_mode ? this._modeState(c) : null, f = this._fanState(c);
    const off = this._ok(c.operating_mode_state) && this._state(c.operating_mode_state).state === "off";
    const cool = this._on(c.heat_pump_cooling), heat = this._on(c.heat_pump_heating);
    let state = null;
    if (m && m.readonly) state = [this._t(m.detail), "#c98400"];
    else if (off) state = [this._t("off_s"), "var(--secondary-text-color)"];
    else if (cool) state = [this._t("hp_cooling"), BLUE];
    else if (heat) state = [this._t("hp_heating"), GREEN];
    else if (c.heat_pump_heating || c.compressor_speed) state = [this._t("hp_idle"), "var(--secondary-text-color)"];
    const sub = [m && m.cur ? this._t(m.cur) : "", f.current].filter(Boolean).join(" · ");
    const mini = (label, value, id) => `<div class="mini ${id ? "lk" : ""}" ${id ? `role="button" tabindex="0" data-act="more" data-v="${id}"` : ""}><small>${label}</small><b>${value}</b></div>`;
    const fresh = c.temp_fresh_air || this._outdoorId(), power = this._pnum(), ptcId = this._ptcP(), ptcW = ptcId ? this._watts(ptcId) : null;
    const tiles = [
      c.temp_supply_air ? mini(this._t("supply"), this._temp(c.temp_supply_air) || "–", c.temp_supply_air) : "",
      c.temp_extract_air ? mini(this._t("extract"), this._temp(c.temp_extract_air) || "–", c.temp_extract_air) : "",
      fresh ? mini(this._t("fresh"), this._temp(fresh) || "–", fresh) : "",
      this._powerId() ? mini(this._t("power"), power === null ? "–" : `${this._fmt(power, power % 1 ? 1 : 0)} W`, this._powerId()) : "",
      ptcId ? mini(this._t("ptc_short"), ptcW === null ? "–" : ptcW >= 1000 ? `${this._fmt(ptcW / 1000, 2)} kW` : `${this._fmt(ptcW, 0)} W`, ptcId) : "",
    ].join("");
    const chip = (id, icon, label) => id && this._ok(id) && this._on(id) ? `<span class="chip lk a" role="button" tabindex="0" data-act="more" data-v="${id}">${this._icon(icon)}${label}</span>` : "";
    const chips = chip(c.heat_pump_continuous, "mdi:autorenew", this._t("hp_continuous")) + chip(c.cooling_available, "mdi:snowflake-check", this._t("cooling_available"));
    if (!state && !tiles && !sub) return null;
    const head = `<div class="ovh"><b>${this._config.title || "Proxon FWT"}</b>${state ? this._lk(cool ? c.heat_pump_cooling : c.heat_pump_heating, `<span class="spill" style="--c:${state[1]}">${state[0]}</span>`) : ""}</div>
      ${sub ? `<div class="ovs">${sub}</div>` : ""}`;
    return { head, body: `<div class="ovt">${tiles}</div>${chips ? `<div class="chips" style="margin:8px 0 0">${chips}</div>` : ""}` };
  }

  _sec_overview(d, extra = "") {
    const o = this._overviewParts(d);
    return o ? `<ha-card class="ovw">${o.head}${o.body}${extra}</ha-card>` : "";
  }

  // Refrigerant circuit and drives: the circuit temperatures as tiles, the compressor speed beside them, the supply points as rows.
  _sec_refrigerant(d) {
    const c = d.central, lang = this._hass.language;
    const lk = (id) => `role="button" tabindex="0" data-act="more" data-v="${id}"`;
    const tile = (label, id) => this._ok(id)
      ? `<div class="k lk" ${lk(id)}><div class="lb">${label}</div><div class="v">${this._temp(id)}</div></div>` : "";
    const rtile = (label, id) => this._num(id) === null ? ""
      : `<div class="k lk" ${lk(id)}><div class="lb">${label}</div><div class="v">${this._num(id).toLocaleString(lang)} <small>rpm</small></div></div>`;
    const row = (label, id) => this._ok(id) ? `<div class="row lk" ${lk(id)}><span class="lb">${label}</span><b>${this._temp(id)}</b></div>` : "";
    const rrow = (label, id) => this._num(id) === null ? "" : `<div class="row lk" ${lk(id)}><span class="lb">${label}</span><b>${this._num(id).toLocaleString(lang)} rpm</b></div>`;
    const tiles = tile(this._t("evaporator"), c.temp_evaporator) + tile(this._t("condenser"), c.temp_condenser) +
      tile(this._t("compressor"), c.temp_compressor) + rtile(`${this._t("compressor")} ${this._t("drive_speed")}`, c.compressor_speed);
    const rows = row(this._t("pre_evaporator"), c.temp_pre_evaporator) + row(this._t("pre_condenser"), c.temp_pre_condenser) +
      rrow(this._t("supply_fan"), c.fan_speed_supply) + rrow(this._t("extract_fan"), c.fan_speed_extract);
    if (!tiles && !rows) return "";
    return `<ha-card>${this._header("mdi:thermometer-lines", this._t("refrigerant"))}
      <div class="kgrid">${tiles}</div><div style="margin-top:10px">${rows}</div></ha-card>`;
  }

  // Filter age and forced-shutdown deadline as extra lines under the filter row of the status section.
  _filterDetail(c) {
    const f = this._filterInfo(c);
    if (!f.known && f.left === null) return "";
    const age = f.known ? `<div class="row${c.filter_age_days ? " lk" : ""}" ${c.filter_age_days ? `role="button" tabindex="0" data-act="more" data-v="${c.filter_age_days}"` : ""}>${this._icon("mdi:calendar-clock")}${this._t("f_age")}<b>${this._t("f_day_of", String(Math.round(f.age)), String(f.iv))}</b></div>` : "";
    const left = f.left !== null ? `<div class="row${c.filter_shutdown_days ? " lk" : ""}" ${c.filter_shutdown_days ? `role="button" tabindex="0" data-act="more" data-v="${c.filter_shutdown_days}"` : ""}>${this._icon("mdi:timer-alert-outline")}${this._t("f_shutdown", this._days(f.left))}</div>` : "";
    const btn = c.filter_changed && (f.due || f.known) ? `<div class="row"><button class="vbtn" data-act="filterchg">${this._icon("mdi:check")}${this._t("f_btn")}</button></div>` : "";
    return age + left + btn;
  }

  _sec_status(d) {
    const c = d.central;
    const prob = (id, label, okText, badText, icon) => this._ok(id)
      ? `<div class="row lk" role="button" tabindex="0" data-act="more" data-v="${id}">${this._icon(icon)}${label}<b style="color:${this._on(id) ? "#c98400" : GREEN}">${this._on(id) ? badText : okText}</b></div>` : "";
    const change = c.mode_change_possible && this._ok(c.mode_change_possible)
      ? `<div class="row lk" role="button" tabindex="0" data-act="more" data-v="${c.mode_change_possible}">${this._icon("mdi:shuffle-variant")}${this._t("mode_change")}<b>${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}</b></div>` : "";
    const html = prob(c.error_system, this._t("error"), this._t("no_error"), this._t("has_error"), "mdi:check-circle-outline") +
      prob(c.filter_device, this._t("filter_device"), this._t("ok"), this._t("change_due"), "mdi:air-filter") + this._filterDetail(c) +
      (this._recirc() ? prob(c.filter_recirculation, this._t("filter_recirc"), this._t("ok"), this._t("change_due"), "mdi:air-filter") : "") + change;
    if (!html) return "";
    return `<ha-card>${this._header("mdi:shield-check-outline", this._t("status"))}${html.replace('class="row', 'class="row first')}</ha-card>`;
  }

  _open(r) {
    return !!this._ropen && this._ropen.has(r.climate);
  }

  // The details of one room as a popup (a bottom sheet on phones): the same controls as before, no longer pushed under the list.
  _roomPopup(info) {
    const sel = info.find((i) => this._open(i.r));
    if (!sel) return "";
    this._room = info.indexOf(sel); // the plus/minus buttons act on the selected room
    const st = sel.heats ? [this._t("st_heat"), "mdi:fire", CORAL] : Math.abs(sel.dev) <= 0.3 ? [this._t("st_ok"), "mdi:check", GREEN]
      : sel.dev < 0 ? [this._t("st_cool"), "mdi:arrow-down", BLUE] : [this._t("st_warm"), "mdi:arrow-up", CORAL];
    return `<div class="rdlg" data-act="rclose"><div class="rsheet" role="dialog" aria-modal="true" aria-label="${sel.r.name}" data-act="noop">
      <div class="grab"></div>
      <div class="dh"><div><h3>${sel.r.name}</h3><div class="ds" style="--c:${st[2]}">${this._icon(st[1])}${st[0]}</div></div>
        <button class="x" data-act="rclose" aria-label="${this._t("close")}">${this._icon("mdi:close")}</button></div>
      ${this._roomDetail(sel)}</div></div>`;
  }

  _roomDetail(sel) {
    const a = sel.s.attributes;
    const unavailable = sel.s.state === "unavailable";
    return `<div class="det"><div class="dtop"><div class="cur lk" role="button" tabindex="0" data-act="more" data-v="${sel.r.climate}"><div class="lb" style="font-weight:400">${sel.r.name} · ${this._t("actual")}</div>${sel.cur == null ? "–" : this._fmt(sel.cur) + "°"}</div>
      <div class="adj">${this._btn('data-act="down"', "round", this._icon("mdi:minus"), unavailable)}
      <div style="text-align:center"><div class="lb">${this._t("target")}</div><div style="font-size:22px;font-weight:500">${sel.tgt == null ? "–" : this._fmt(sel.tgt, 0) + "°"}</div></div>
      ${this._btn('data-act="up"', "round", this._icon("mdi:plus"), unavailable)}</div></div>
      ${a.min_temp != null ? `<div class="note">${this._t("adjustable")} ${this._fmt(a.min_temp, 0)}–${this._fmt(a.max_temp, 0)} °C</div>` : ""}
      <div class="dgrid">
        ${sel.co2 != null ? `<div class="k lk" role="button" tabindex="0" data-act="more" data-v="${sel.r.co2}"><div class="lb">${this._t("co2")}</div><div class="v small">${Math.round(sel.co2)} ppm</div></div>` : ""}
        ${sel.rf != null ? `<div class="k lk" role="button" tabindex="0" data-act="more" data-v="${sel.r.rf}"><div class="lb">${this._t("humidity")}</div><div class="v small">${Math.round(sel.rf)} %</div></div>` : ""}
        ${sel.r.ents.ptc_active ? `<div class="k lk" role="button" tabindex="0" data-act="more" data-v="${sel.r.ents.ptc_active}"><div class="lb">${this._t("ptc")}</div><div class="v small">${sel.ptcA ? this._t("ptc_active") : this._t("ptc_off")}</div></div>` : ""}
        ${sel.ptcE ? `<div class="k" style="display:flex;align-items:center;gap:8px"><div><div class="lb">${this._t("ptc_enabled")}</div><div class="v small">${this._on(sel.ptcE) ? this._t("yes") : this._t("no")}</div></div>
          <span class="sp" style="margin-left:auto"><ha-switch data-act="ptc" ${this._on(sel.ptcE) ? "checked" : ""} ${this._ok(sel.ptcE) ? "" : "disabled"}></ha-switch></span></div>` : ""}
      </div></div>`;
  }

  // PTC of all rooms in one line: running, enabled, and the power when a sensor is chosen.
  _ptcLine(d) {
    const [on, n, ena] = this._ptcRooms(d);
    if (!n) return "";
    const id = this._ptcP(), w = id ? this._watts(id) : null;
    const pw = w === null ? "" : ` · ${this._lk(id, w >= 1000 ? `${this._fmt(w / 1000, 2)} kW` : `${this._fmt(w, 0)} W`)}`;
    return `<div class="row" style="margin-top:10px">${this._icon("mdi:radiator")}${this._t("ptc")}<b style="margin-left:auto;color:${on ? "#c98400" : "var(--primary-text-color)"}">${on} ${this._t("rs_active")} · ${ena} ${this._t("rs_enabled")}${pw}</b></div>`;
  }

  _sec_rooms(d) {
    const rooms = d.rooms;
    if (!rooms.length) return `<ha-card>${this._header("mdi:home-outline", this._t("rooms"))}<div class="note">${this._t("no_rooms")}</div></ha-card>`;
    if (this._room >= rooms.length) this._room = 0;
    const info = rooms.map((r) => {
      const s = this._state(r.climate) || { attributes: {}, state: "unavailable" };
      const cur = s.attributes.current_temperature, tgt = this._tgt(r.climate, s.attributes);
      const dev = cur != null && tgt != null ? cur - tgt : 0;
      const heats = this._on(r.ents.ptc_active); // rooms are not heated or cooled individually, only by the PTC element
      return { r, s, cur, tgt, dev, heats, co2: this._num(r.co2), rf: this._num(r.rf), ptcA: this._on(r.ents.ptc_active), ptcE: r.ents.ptc_enable };
    });
    const heating = info.filter((i) => i.heats).length;
    const co2c = (v) => (v > 1000 ? "r" : v > 800 ? "w" : "g");
    const tint = (i) => {
      const a = Math.min(Math.abs(i.dev) / 1.5, 1) * 32;
      if (i.heats) return `--hc:${CORAL};--ha:22%`; // the PTC element runs: coral, whatever the deviation
      return Math.abs(i.dev) <= 0.3 ? "--hc:#3fa660;--ha:12%" : `--hc:${i.dev < 0 ? BLUE : CORAL};--ha:${Math.max(14, Math.round(a))}%`;
    };
    let list;
    if (this._view === "tiles") {
      list = `<div class="tiles">${info.map((i, n) => `<button class="tile ${this._open(i.r) ? "s" : ""}" style="${tint(i)}" data-act="rtoggle" data-v="${n}" aria-haspopup="dialog">
        <div class="n">${this._icon(this._roomIcon(i.r.name))}${i.r.name}${Math.abs(i.dev) > 0.3 ? this._icon(i.dev < 0 ? "mdi:arrow-down" : "mdi:arrow-up", 'class="dv"') : ""}</div><div class="t">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</div>
        <div class="lb">${this._t("target")} ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</div>
        <div class="chips"><span class="chip ${i.heats ? "w" : "g"}">${this._icon(i.heats ? "mdi:fire" : "mdi:check")}${i.heats ? this._t("heats") : this._t("fine")}</span>
        ${i.co2 != null ? `<span class="chip ${co2c(i.co2)}">${this._icon("mdi:molecule-co2")}${Math.round(i.co2)}</span>` : ""}</div></button>`).join("")}</div>`;
    } else {
      list = info.map((i, n) => `<div class="rw ${this._open(i.r) ? "s" : ""}" style="${tint(i)}" role="button" tabindex="0" data-act="rtoggle" data-v="${n}" aria-haspopup="dialog">
        <span>${this._icon(this._roomIcon(i.r.name))}${i.r.name}</span><span class="lb">${[i.co2 != null ? `${Math.round(i.co2)} ppm` : "", i.rf != null ? `${Math.round(i.rf)} %` : ""].filter(Boolean).join(" · ")}</span>
        <span class="chip ${i.heats ? "w" : "g"}">${i.heats ? this._t("heats") : this._t("fine")}</span>
        <b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"} <span class="lb">→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</span></b></div>`).join("");
    }
    return `<ha-card><div class="h">${this._icon("mdi:home-outline")}${this._t("rooms")}<span class="lb" style="margin-left:6px">${heating} ${this._t("of")} ${rooms.length} ${this._t("heating_n")}</span>
      <span class="r vsw"><span class="lb">${this._t("heatmap")}</span>
      <button class="vbtn ${this._view === "tiles" ? "a" : ""}" data-act="view" data-v="tiles">${this._icon("mdi:view-grid-outline")}${this._t("tiles")}</button>
      <button class="vbtn ${this._view === "list" ? "a" : ""}" data-act="view" data-v="list">${this._icon("mdi:format-list-bulleted")}${this._t("list")}</button></span></div>${list}${this._ptcLine(d)}<div class="rlegend"><span>${this._icon("mdi:arrow-down")}${this._t("legend_cool")}</span><span>${this._icon("mdi:check")}${this._t("legend_ok")}</span><span>${this._icon("mdi:arrow-up")}${this._t("legend_warm")}</span><span>${this._icon("mdi:gesture-tap")}${this._t("r_tapnote")}</span></div>${this._drawerMode ? "" : this._roomPopup(info)}</ha-card>`;
  }

  // Merge the "on" periods of one or more binary sensors into [start, end] intervals (seconds).
  _intervals(res, ids, t1) {
    const all = [];
    for (const id of ids) {
      let on = null;
      for (const p of res[id] || []) {
        const t = p.lu ?? Date.parse(p.last_updated) / 1000, st = p.s ?? p.state;
        if (isNaN(t)) continue;
        if (st === "on" && on === null) on = t;
        else if (st !== "on" && on !== null) { all.push([on, t]); on = null; }
      }
      if (on !== null) all.push([on, t1]);
    }
    all.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of all) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }
    return merged;
  }

}

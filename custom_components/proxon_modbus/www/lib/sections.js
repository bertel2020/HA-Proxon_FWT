import { MODE_META, FAN_STAGES, BLUE, CORAL, AMBER, GREEN, WRITE_ERROR_SHOWN_MS, BAD, esc } from "./constants.js";

export class SectionsMethods {
  // ---- sections ---------------------------------------------------------

  _sec_mode(d) {
    const c = d.central;
    if (!c.operating_mode) return "";
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
    const buttons = opts.map((o) => {
      const meta = MODE_META[o] || { icon: "mdi:cog", color: "#8a8f98" };
      return this._btn(`data-act="mode" data-v="${esc(o)}"`, cur === o && !locked ? "a" : "",
        `${this._icon(meta.icon)}${this._t(o)}`, locked, `--mc:${meta.color}`);
    }).join("");
    const desc = readonly ? this._t("readonly") : cur ? this._t(`d_${cur}`) : "";
    return `<ha-card>${this._header("mdi:tune-variant", this._t("mode"), readonly ? this._t(detail) : cur ? this._t(cur) : "")}
      ${banner}<div class="seg" style="grid-template-columns:repeat(auto-fit,minmax(96px,1fr))">${buttons}</div>
      <div class="note">${desc}</div></ha-card>`;
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
    if (!out.length) return "";
    return `<div class="alerts">${out.map(([k, i, t]) => `<div class="banner ${k}">${this._icon(i)}${t}</div>`).join("")}</div>`;
  }

  _sec_kpi(d) {
    const c = d.central;
    // In the panel a tile opens the matching history; the heat recovery tile also carries a 24 h sparkline.
    const panel = this._isPanel;
    const tile = (icon, color, label, value, unit = "", metric = "", extra = "") => value === null || value === undefined ? "" :
      `<div class="k ${panel && metric ? "go" : ""}" style="--kc:${color}" ${panel && metric ? `data-act="kpi" data-v="${metric}" role="button" tabindex="0"` : ""}><div class="ic">${this._icon(icon)}</div><div><div class="lb">${label}</div><div class="v">${value}${unit ? ` <small>${unit}</small>` : ""}</div>${extra}</div></div>`;
    const eff = this._efficiency();
    const bypass = this._on(c.bypass_active);
    const power = this._pnum();
    const html = tile("mdi:thermometer", CORAL, this._t("supply_t"), this._temp(c.temp_supply_air), "", "temp") +
      tile("mdi:percent-circle-outline", GREEN, this._t("efficiency"), bypass ? this._t("bypass_short") : eff === null ? null : `${eff} % <span title="${this._t("eff_info")}">${this._icon("mdi:information-outline", 'class="info"')}</span>`, "", "eff", this._effSpark(d)) +
      tile("mdi:flash", AMBER, this._t("power"), power === null ? null : this._fmt(power, power % 1 ? 1 : 0),
        "W", "power") +
      tile("mdi:weather-partly-cloudy", BLUE, this._t("outside"), this._temp(this._outdoorId()), "", "temp");
    if (!html) return "";
    return `<ha-card>${this._header("mdi:gauge", this._t("kpi"))}<div class="kpiw"><div class="kpi">${html}</div></div></ha-card>`;
  }

  // Small 24 h curve of the heat recovery rate (shares its data with the history chart).
  _effSpark(d) {
    if (!this._isPanel) return "";
    const defs = this._metricDefs(d, "eff");
    if (!defs.length) return "";
    const ser = this._hget("s|24h|eff", () => this._loadSeries("24h", "eff", defs));
    const pts = ser && ser[0] ? ser[0].pts : [];
    if (pts.length < 3) return "";
    const t1 = Date.now() / 1000, t0 = t1 - 86400, W = 100, H = 22;
    const vs = pts.map((p) => p[1]), lo = Math.min(...vs, 50), hi = Math.max(...vs, 90);
    const line = pts.map(([t, v]) => `${(((t - t0) / (t1 - t0)) * W).toFixed(1)},${(H - ((v - lo) / (hi - lo)) * (H - 2) - 1).toFixed(1)}`).join(" ");
    return `<svg class="spk" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${GREEN}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${line}"/></svg>`;
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
      return `<rect x="${x}" y="${y}" width="130" height="46" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".6" stroke-width=".7"/>
        <text class="st" x="${x + 65}" y="${y + 15}" text-anchor="middle">${label}</text>
        <text class="sh" x="${x + 65}" y="${y + 34}" text-anchor="middle">${v === null ? "–" : `${v}C`}</text>`;
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
    return `<ha-card>${this._header("mdi:swap-horizontal", this._t("air"), bypass)}${svg}</ha-card>`;
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
      return `<rect x="${X(cx) - 42}" y="${cy - 22}" width="84" height="44" rx="11" fill="color-mix(in srgb, ${col} 13%, var(--card-background-color))" stroke="color-mix(in srgb, ${col} 55%, transparent)"/>
        <text class="st nh" x="${X(cx)}" y="${cy - 5}" text-anchor="middle">${label}</text><text class="sh" x="${X(cx)}" y="${cy + 14}" text-anchor="middle">${T(id) || "–"}</text>`; };
    const coil = (cx, col, label, id) => `<rect x="${X(cx) - 8}" y="123" width="16" height="44" rx="5" fill="color-mix(in srgb, ${col} 28%, var(--card-background-color))" stroke="${col}" stroke-width="1.3"/>
      <text class="st" x="${X(cx)}" y="112" text-anchor="middle">${label}${T(id) ? " " + T(id) : ""}</text>`;
    // Both fans sit upstream of the exchanger (fresh-air fan after the preheater, extract fan in the extract stream).
    const fan = (cx, rp) => {
      const sp = rp ? Math.max(0.35, 1.5 - rp / 1600) : 1;
      const blades = [0, 120, 240].map((a) => `<path transform="rotate(${a})" d="M0 0C5 -2 11 -7 8 -13C3 -13 -2 -7 0 0Z" fill="var(--secondary-text-color)"/>`).join("");
      return `<circle cx="${X(cx)}" cy="75" r="17" fill="var(--card-background-color)" stroke="var(--pbd)" stroke-width="1.5"/>
        <g transform="translate(${X(cx)} 75)"><g class="${run && rp ? "rot" : ""}" style="--fan:${sp.toFixed(2)}s">${blades}</g><circle r="2.6" fill="var(--card-background-color)" stroke="var(--secondary-text-color)"/></g>
        <text class="st" x="${X(cx)}" y="48" text-anchor="middle">${rp === null ? "" : rp.toLocaleString(this._hass.language) + " rpm"}</text>`; };
    const probe = (cx, cy, ty, txt, id, col) => T(id) ? `<circle cx="${X(cx)}" cy="${cy}" r="4" fill="${col}" stroke="var(--card-background-color)" stroke-width="1.8"/>
      <text class="st" x="${X(cx)}" y="${ty}" text-anchor="middle">${txt} ${T(id)}</text>` : "";
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
      ${preheat}${fan(215, rpmS)}${fan(500, rpmE)}
      ${probe(190, 75, 32, this._t("post_preheat_s"), c.temp_post_preheat, BLUE)}${probe(cool ? 428 : 252, 145, 166, this._t("pre_evap_s"), c.temp_pre_evaporator, BLUE)}${probe(cool ? 252 : 428, 145, 166, this._t("pre_cond_s"), c.temp_pre_condenser, CORAL)}
      <circle cx="${X(340)}" cy="110" r="23" fill="var(--card-background-color)" stroke="var(--pbd)"/>
      <text class="sh" x="${X(340)}" y="110" text-anchor="middle" style="font-size:14px">${bypass ? this._t("bypass_short") : eff !== null && run ? eff + " %" : "–"}</text>
      <text class="st nh" x="${X(340)}" y="124" text-anchor="middle" style="font-size:10px">${bypass ? this._t("open_s") : this._t("wrg_s")}</text>
      <text class="st" x="${X(340)}" y="198" text-anchor="middle">${this._t("exchanger")}</text>
      <g class="hot" data-act="tab" data-v="diag" role="button" tabindex="0" aria-label="${this._t("tip_comp")}"><title>${this._t("tip_comp")}</title>
        ${hp ? `<circle class="ripple" cx="${X(340)}" cy="245" r="31" fill="none" stroke="${ring}" stroke-width="2"/>` : ""}
        <circle cx="${X(340)}" cy="245" r="31" fill="var(--card-background-color)" stroke="var(--pbd)" stroke-width="3.5"/>
        ${hp && frac > 0 ? `<circle cx="${X(340)}" cy="245" r="31" fill="none" stroke="${ring}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${X(340)} 245)"/>` : ""}
        <text class="sh" x="${X(340)}" y="243" text-anchor="middle">${!hp ? this._t("off_s") : rpm === null ? "–" : rpm.toLocaleString(this._hass.language)}</text>${hp ? `<text class="st nh" x="${X(340)}" y="258" text-anchor="middle">rpm</text>` : ""}</g>
      <text class="st" x="${X(340)}" y="291" text-anchor="middle">${this._t("compressor")}${T(c.temp_compressor) ? " " + T(c.temp_compressor) : ""}</text>
      ${pill(48, 75, this._t("fresh"), c.temp_fresh_air)}${pill(48, 145, this._t("exhaust"), c.temp_exhaust_air)}
      ${pill(632, 75, this._t("extract"), c.temp_extract_air)}${pill(632, 145, this._t("supply"), c.temp_supply_air)}
      ${outdoor ? `<text class="sh nh" x="${X(48)}" y="38" text-anchor="middle">${this._t("outside")} ${outdoor}</text>` : ""}</svg>`;
    const heating = this._on(c.heat_pump_heating) || cool;
    const chips = `${c.bypass_active && this._ok(c.bypass_active) ? `<span class="chip ${bypass ? "a" : ""}">${this._icon("mdi:routes")}${this._t(bypass ? "bypass_open" : "bypass_closed")}</span>` : ""}
      ${c.heat_pump_heating ? `<span class="chip ${cool ? "a" : heating ? "g" : ""}">${this._icon(cool ? "mdi:snowflake" : heating ? "mdi:fire" : "mdi:pause")}${this._t(cool ? "hp_cooling" : heating ? "hp_heating" : "hp_idle")}</span>` : ""}`;
    return `<ha-card>${this._header("mdi:sitemap-outline", this._t("schema"), chips)}${svg}<div class="note">${this._t("probes")}</div></ha-card>`;
  }

  _sec_fan(d) {
    const c = d.central;
    if (!c.fan_stage && !c.fan_auto && !c.fan_intensive) return "";
    const sel = this._state(c.fan_stage);
    const stageOk = !!sel && !BAD.includes(sel.state);
    const autoOn = this._on(c.fan_auto);
    const selectable = (n) => {
      const k = n === 0 ? "fan_off_selectable" : `fan_stage_${n}_selectable`;
      return !c[k] || !this._ok(c[k]) || this._on(c[k]);
    };
    let buttons = FAN_STAGES.map(([opt, icon, label], i) =>
      this._btn(`data-act="fan" data-v="${esc(opt)}"`, stageOk && !autoOn && sel.state === opt ? "a" : "",
        `${this._icon(icon)}${label}`, !stageOk || !selectable(i), `--mc:${BLUE}`)).join("");
    buttons += this._btn(`data-act="fanauto"`, autoOn ? "a" : "", `${this._icon("mdi:fan-auto")}${this._t("auto")}`, !this._ok(c.fan_auto), `--mc:${GREEN}`);
    const current = autoOn ? this._t("auto") : stageOk ? `${this._t("stage")} ${FAN_STAGES.find(([o]) => o === sel.state)?.[2] ?? ""}` : this._t("automatic");
    const bar = (id, label, icon) => {
      const v = this._num(id);
      if (v === null) return "";
      const pct = Math.min(100, Math.round((v / (this._config.max_fan_rpm || 3000)) * 100));
      return `<div class="row first">${this._icon(icon)}${label} ${v.toLocaleString(this._hass.language)} rpm<span class="bar"><i style="width:${pct}%"></i></span></div>`;
    };
    const sw = (id, label, icon, act) => id ? `<div class="row">${this._icon(icon)}${label}<span class="sp">
      <ha-switch data-act="${act}" ${this._on(id) ? "checked" : ""} ${this._ok(id) ? "" : "disabled"}></ha-switch></span></div>` : "";
    let restore = "";
    if (c.fan_stage_restore) {
      const rs = this._state(c.fan_stage_restore);
      const pref = rs?.attributes?.preferred_stage;
      const prefLabel = FAN_STAGES.find(([o]) => o === pref)?.[2];
      const last = rs?.attributes?.last_restore;
      const when = last ? new Date(last).toLocaleString(this._hass.language, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
      restore = `${sw(c.fan_stage_restore, this._t("fan_restore"), "mdi:fan-clock", "restoresw")}
        <div class="note" style="margin-top:2px">${this._t("fan_pref")}: ${prefLabel ? `${this._t("stage")} ${prefLabel}` : this._t("fan_pref_none")}${when ? ` · ${this._t("fan_restored")} ${when}` : ""}</div>`;
    }
    return `<ha-card>${this._header("mdi:fan", this._t("fan"), current)}
      <div class="seg" style="grid-template-columns:repeat(6,1fr)">${buttons}</div>
      ${stageOk ? "" : `<div class="note">${this._t("fan_note")}</div>`}
      <div style="margin-top:8px">${bar(c.fan_speed_supply, this._t("supply_fan"), "mdi:arrow-top-right")}${bar(c.fan_speed_extract, this._t("extract_fan"), "mdi:arrow-bottom-left")}</div>
      ${sw(c.fan_intensive, this._t("intensive"), "mdi:rocket-launch-outline", "intensive")}
      ${sw(c.fan_auto, this._t("fan_auto"), "mdi:fan-auto", "autosw")}${restore}</ha-card>`;
  }

  // Panel only: operating mode and fan stages in one card (the dashboard card keeps them as separate sections).
  _sec_operation(d) {
    const c = d.central;
    if (!c.operating_mode && !c.fan_stage && !c.fan_auto && !c.fan_intensive) return "";
    // operating mode
    let modeHtml = "", desc = "", cur = null, detail = null, readonly = false;
    if (c.operating_mode) {
      const sel = this._state(c.operating_mode);
      cur = sel && !BAD.includes(sel.state) ? sel.state : null;
      detail = this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
      readonly = !cur && detail && !Object.keys(MODE_META).includes(detail);
      const unavail = !!sel && sel.state === "unavailable";
      const changeOk = c.mode_change_possible ? this._on(c.mode_change_possible) || !this._ok(c.mode_change_possible) : true;
      const locked = readonly || unavail || !changeOk;
      const opts = (sel && sel.attributes.options) || Object.keys(MODE_META);
      const banner = readonly
        ? `<div class="banner ${detail === "emergency" ? "r" : "w"}" style="margin-bottom:10px">${this._icon("mdi:alert-outline")}${this._t(detail)} – ${this._t("locked")}</div>` : "";
      const buttons = opts.map((o) => {
        const meta = MODE_META[o] || { icon: "mdi:cog", color: "#8a8f98" };
        return this._btn(`data-act="mode" data-v="${esc(o)}"`, cur === o && !locked ? "a" : "",
          `${this._icon(meta.icon)}<span class="lf">${this._t(o)}</span><span class="ls">${this._t(`ms_${o}`)}</span>`, locked, `--mc:${meta.color}`);
      }).join("");
      desc = readonly ? this._t("readonly") : cur ? this._t(`d_${cur}`) : "";
      modeHtml = `${banner}<div class="seg cmp mo" style="grid-template-columns:repeat(${opts.length},1fr)">${buttons}</div>`;
    }
    // fan stages
    let fanHtml = "", current = "";
    if (c.fan_stage || c.fan_auto) {
      const fsel = this._state(c.fan_stage);
      const stageOk = !!fsel && !BAD.includes(fsel.state);
      const autoOn = this._on(c.fan_auto);
      const selectable = (n) => {
        const k = n === 0 ? "fan_off_selectable" : `fan_stage_${n}_selectable`;
        return !c[k] || !this._ok(c[k]) || this._on(c[k]);
      };
      let buttons = FAN_STAGES.map(([opt, , label], i) =>
        this._btn(`data-act="fan" data-v="${esc(opt)}"`, stageOk && !autoOn && fsel.state === opt ? "a" : "", label, !stageOk || !selectable(i), `--mc:${BLUE}`)).join("");
      buttons += this._btn(`data-act="fanauto"`, autoOn ? "a" : "", this._t("auto"), !this._ok(c.fan_auto), `--mc:${GREEN}`);
      current = autoOn ? this._t("auto") : stageOk ? `${this._t("stage")} ${FAN_STAGES.find(([o]) => o === fsel.state)?.[2] ?? ""}` : "";
      fanHtml = `<div class="lbl2">${this._t("fan_stage_l")}${!stageOk && c.fan_stage ? `<span class="tag">${this._t("fan_note")}</span>` : ""}</div>
        <div class="seg cmp fs" style="grid-template-columns:repeat(6,1fr)">${buttons}</div>`;
    }
    const rpm = (id, ic) => this._num(id) === null ? "" : `<span>${this._icon(ic, 'class="info"')} ${this._num(id).toLocaleString(this._hass.language)}</span>`;
    const rp = rpm(c.fan_speed_supply, "mdi:arrow-top-right") + rpm(c.fan_speed_extract, "mdi:arrow-bottom-left");
    const intensive = c.fan_intensive ? `<span class="tg">${this._t("intensive")}<ha-switch data-act="intensive" ${this._on(c.fan_intensive) ? "checked" : ""} ${this._ok(c.fan_intensive) ? "" : "disabled"}></ha-switch></span>` : "";
    const inline = rp || intensive ? `<div class="oinline">${rp ? `<span class="rp">${rp}<span>rpm</span></span>` : ""}${intensive}</div>` : "";
    let restore = "";
    if (c.fan_stage_restore) {
      const rs = this._state(c.fan_stage_restore), pref = rs?.attributes?.preferred_stage;
      const prefLabel = FAN_STAGES.find(([o]) => o === pref)?.[2];
      restore = `<div class="row">${this._icon("mdi:fan-clock")}${this._t("fan_restore")}<span class="sp"><ha-switch data-act="restoresw" ${this._on(c.fan_stage_restore) ? "checked" : ""} ${this._ok(c.fan_stage_restore) ? "" : "disabled"}></ha-switch></span></div>
        <div class="note" style="margin-top:2px">${this._t("fan_pref")}: ${prefLabel ? `${this._t("stage")} ${prefLabel}` : this._t("fan_pref_none")}</div>`;
    }
    const hp = this._on(c.heat_pump_cooling) ? this._t("hp_cooling") : this._on(c.heat_pump_heating) ? this._t("hp_heating") : this._t("hp_idle");
    const right = [c.heat_pump_heating ? hp : "", current].filter(Boolean).join(" · ");
    return `<ha-card class="opw">${this._header("mdi:tune-variant", this._t("operation"), right)}
      ${c.operating_mode ? `<div class="lbl2">${this._t("mode")}</div>` : ""}${modeHtml}${fanHtml}${inline}
      ${desc ? `<div class="note">${desc}</div>` : ""}${restore}${this._isPanel ? this._boostBlock(c, true) : ""}</ha-card>`;
  }

  _sec_heatpump(d) {
    const c = d.central;
    const rpm = this._num(c.compressor_speed);
    const power = this._pnum();
    if (rpm === null && power === null && !c.heat_pump_heating) return "";
    const frac = rpm === null ? 0 : Math.min(1, rpm / (this._config.max_compressor_rpm || 6000));
    const circ = 2 * Math.PI * 44;
    const ring = `<svg width="104" height="104" viewBox="0 0 110 110" role="img" aria-label="${this._t("compressor")}">
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--divider-color)" stroke-width="9"/>
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--primary-color)" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 55 55)"/>
      <text x="55" y="50" text-anchor="middle" dominant-baseline="central" style="font-size:19px;font-weight:500">${rpm === null ? "–" : rpm.toLocaleString(this._hass.language)}</text>
      <text class="st" x="55" y="70" text-anchor="middle" style="font-size:11px">rpm</text></svg>`;
    const unit = "W";
    const chip = (id, icon, label, cls) => (id && this._ok(id)) ? `<span class="chip ${this._on(id) ? cls : ""}">${this._icon(icon)}${label}</span>` : "";
    const cool = c.cooling_enable
      ? `<div class="row">${this._icon("mdi:snowflake")}${this._t("cooling_enable")}<span class="sp"><ha-switch data-act="coolsw" ${this._on(c.cooling_enable) ? "checked" : ""} ${this._ok(c.cooling_enable) ? "" : "disabled"}></ha-switch></span></div>` : "";
    return `<ha-card>${this._header("mdi:heat-pump", this._t("heatpump"))}
      <div class="hp">${ring}<div style="flex:1"><div class="lb">${this._t("compressor")}</div>
      ${power === null ? "" : `<div style="margin-top:6px"><div class="lb">${this._t("power_long")}</div><div class="big">${this._fmt(power, power % 1 ? 1 : 0)} <small>${unit}</small></div></div>`}</div></div>
      <div class="chips">${chip(c.heat_pump_heating, "mdi:fire", this._t("hp_heating"), "g")}${chip(c.heat_pump_cooling, "mdi:snowflake", this._t("hp_cooling"), "a")}${chip(c.heat_pump_continuous, "mdi:autorenew", this._t("hp_continuous"), "a")}${chip(c.cooling_available, "mdi:snowflake-check", this._t("cooling_available"), "g")}</div>
      ${cool}</ha-card>`;
  }

  _sec_refrigerant(d) {
    const c = d.central;
    const tile = (label, id, sub = "") => this._ok(id)
      ? `<div class="k"><div class="lb">${label}${sub}</div><div class="v">${this._temp(id)}</div></div>` : "";
    const row = (label, id) => this._ok(id) ? `<div class="row"><span class="lb">${label}</span><b>${this._temp(id)}</b></div>` : "";
    const tiles = tile(this._t("evaporator"), c.temp_evaporator) + tile(this._t("condenser"), c.temp_condenser) +
      tile(this._t("compressor"), c.temp_compressor) + tile(this._t("outside"), this._outdoorId(), this._opt("outdoor_entity") ? " ·" : "");
    const rows = row(this._t("pre_evaporator"), c.temp_pre_evaporator) + row(this._t("post_preheat"), c.temp_post_preheat) +
      row(this._t("pre_condenser"), c.temp_pre_condenser);
    if (!tiles && !rows) return "";
    return `<ha-card>${this._header("mdi:thermometer", this._t("refrigerant"), this._t("diagnostic"))}
      <div class="kgrid">${tiles}</div><div style="margin-top:10px">${rows}</div></ha-card>`;
  }

  // Filter age and forced-shutdown deadline as extra lines under the filter row of the status section.
  _filterDetail(c) {
    const f = this._filterInfo(c);
    if (!f.known && f.left === null) return "";
    const age = f.known ? `<div class="row">${this._icon("mdi:calendar-clock")}${this._t("f_age")}<b>${this._t("f_day_of", String(Math.round(f.age)), String(f.iv))}</b></div>` : "";
    const left = f.left !== null ? `<div class="row">${this._icon("mdi:timer-alert-outline")}${this._t("f_shutdown", this._days(f.left))}</div>` : "";
    const btn = c.filter_changed && (f.due || f.known) ? `<div class="row"><button class="vbtn" data-act="filterchg">${this._icon("mdi:check")}${this._t("f_btn")}</button></div>` : "";
    return age + left + btn;
  }

  _sec_status(d) {
    const c = d.central;
    const prob = (id, label, okText, badText, icon) => this._ok(id)
      ? `<div class="row">${this._icon(icon)}${label}<b style="color:${this._on(id) ? "#c98400" : GREEN}">${this._on(id) ? badText : okText}</b></div>` : "";
    const change = c.mode_change_possible && this._ok(c.mode_change_possible)
      ? `<div class="row">${this._icon("mdi:shuffle-variant")}${this._t("mode_change")}<b>${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}</b></div>` : "";
    const html = prob(c.error_system, this._t("error"), this._t("no_error"), this._t("has_error"), "mdi:check-circle-outline") +
      prob(c.filter_device, this._t("filter_device"), this._t("ok"), this._t("change_due"), "mdi:air-filter") + this._filterDetail(c) +
      (this._recirc() ? prob(c.filter_recirculation, this._t("filter_recirc"), this._t("ok"), this._t("change_due"), "mdi:air-filter") : "") + change;
    if (!html) return "";
    return `<ha-card>${this._header("mdi:shield-check-outline", this._t("status"))}${html.replace('class="row"', 'class="row first"')}</ha-card>`;
  }

  _roomDetail(sel) {
    const a = sel.s.attributes;
    const unavailable = sel.s.state === "unavailable";
    return `<div class="det"><div class="dtop"><div class="cur"><div class="lb" style="font-weight:400">${sel.r.name} · ${this._t("actual")}</div>${sel.cur == null ? "–" : this._fmt(sel.cur) + "°"}</div>
      <div class="adj">${this._btn('data-act="down"', "round", this._icon("mdi:minus"), unavailable)}
      <div style="text-align:center"><div class="lb">${this._t("target")}</div><div style="font-size:22px;font-weight:500">${sel.tgt == null ? "–" : this._fmt(sel.tgt, 0) + "°"}</div></div>
      ${this._btn('data-act="up"', "round", this._icon("mdi:plus"), unavailable)}</div></div>
      ${a.min_temp != null ? `<div class="note">${this._t("adjustable")} ${this._fmt(a.min_temp, 0)}–${this._fmt(a.max_temp, 0)} °C</div>` : ""}
      <div class="dgrid">
        ${sel.co2 != null ? `<div class="k"><div class="lb">${this._t("co2")}</div><div class="v small">${Math.round(sel.co2)} ppm</div></div>` : ""}
        ${sel.rf != null ? `<div class="k"><div class="lb">${this._t("humidity")}</div><div class="v small">${Math.round(sel.rf)} %</div></div>` : ""}
        ${sel.r.ents.ptc_active ? `<div class="k"><div class="lb">${this._t("ptc")}</div><div class="v small">${sel.ptcA ? this._t("ptc_active") : this._t("ptc_off")}</div></div>` : ""}
        ${sel.ptcE ? `<div class="k" style="display:flex;align-items:center;gap:8px"><div><div class="lb">${this._t("ptc_enabled")}</div><div class="v small">${this._on(sel.ptcE) ? this._t("yes") : this._t("no")}</div></div>
          <span class="sp" style="margin-left:auto"><ha-switch data-act="ptc" ${this._on(sel.ptcE) ? "checked" : ""} ${this._ok(sel.ptcE) ? "" : "disabled"}></ha-switch></span></div>` : ""}
      </div></div>`;
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
      return Math.abs(i.dev) <= 0.3 ? "--hc:#3fa660;--ha:6%" : `--hc:${i.dev < 0 ? BLUE : CORAL};--ha:${Math.round(a)}%`;
    };
    let list;
    if (this._view === "tiles") {
      list = `<div class="tiles">${info.map((i, n) => `<button class="tile ${n === this._room ? "s" : ""}" style="${tint(i)}" data-act="room" data-v="${n}">
        <div class="n">${this._icon(this._roomIcon(i.r.name))}${i.r.name}${Math.abs(i.dev) > 0.3 ? this._icon(i.dev < 0 ? "mdi:arrow-down" : "mdi:arrow-up", 'class="dv"') : ""}</div><div class="t">${i.cur == null ? "–" : this._fmt(i.cur) + "°"}</div>
        <div class="lb">${this._t("target")} ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</div>
        <div class="chips"><span class="chip ${i.heats ? "w" : "g"}">${this._icon(i.heats ? "mdi:fire" : "mdi:check")}${i.heats ? this._t("heats") : this._t("fine")}</span>
        ${i.ptcA ? `<span class="chip w">${this._icon("mdi:lightning-bolt")}PTC</span>` : ""}
        ${i.co2 != null ? `<span class="chip ${co2c(i.co2)}">${this._icon("mdi:molecule-co2")}${Math.round(i.co2)}</span>` : ""}</div></button>`).join("")}</div>`;
    } else {
      list = info.map((i, n) => `<div class="rw ${n === this._room ? "s" : ""}" style="${tint(i)}" role="button" tabindex="0" data-act="room" data-v="${n}">
        <span>${this._icon(this._roomIcon(i.r.name))}${i.r.name}</span><span class="lb">${[i.co2 != null ? `${Math.round(i.co2)} ppm` : "", i.rf != null ? `${Math.round(i.rf)} %` : ""].filter(Boolean).join(" · ")}</span>
        <span class="chip ${i.heats ? "w" : "g"}">${i.heats ? this._t("heats") : this._t("fine")}</span>
        <b>${i.cur == null ? "–" : this._fmt(i.cur) + "°"} <span class="lb">→ ${i.tgt == null ? "–" : this._fmt(i.tgt, 0) + "°"}</span></b></div>`).join("");
    }
    const det = this._drawerMode ? "" : this._roomDetail(info[this._room]);
    return `<ha-card><div class="h">${this._icon("mdi:home-outline")}${this._t("rooms")}<span class="lb" style="margin-left:6px">${heating} ${this._t("of")} ${rooms.length} ${this._t("heating_n")}</span>
      <span class="r"><span class="lb">${this._t("heatmap")}</span>
      <button class="vbtn ${this._view === "tiles" ? "a" : ""}" data-act="view" data-v="tiles">${this._icon("mdi:view-grid-outline")}${this._t("tiles")}</button>
      <button class="vbtn ${this._view === "list" ? "a" : ""}" data-act="view" data-v="list">${this._icon("mdi:format-list-bulleted")}${this._t("list")}</button></span></div>${list}<div class="rlegend"><span>${this._icon("mdi:arrow-down")}${this._t("legend_cool")}</span><span>${this._icon("mdi:check")}${this._t("legend_ok")}</span><span>${this._icon("mdi:arrow-up")}${this._t("legend_warm")}</span></div>${det}</ha-card>`;
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

  // Heat pump runtime and starts per day for the last 7 days, from the recorder history.
  _hpBars() {
    const hp = this._hp(), iv = hp && hp.iv;
    if (!iv) return `<div class="note">${this._t("hp_no_data")}</div>`;
    const lang = this._hass.language, now = Date.now() / 1000;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - i);
      const a = d0.getTime() / 1000, b = Math.min(now, a + 86400);
      let sec = 0, starts = 0;
      for (const [s0, s1] of iv) {
        sec += Math.max(0, Math.min(s1, b) - Math.max(s0, a));
        if (s0 >= a && s0 < a + 86400 && s0 > hp.t0 + 60) starts++;
      }
      days.push({ label: d0.toLocaleDateString(lang, { weekday: "short" }), full: d0.toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "2-digit" }), h: sec / 3600, starts });
    }
    const W = Math.max(300, (this.clientWidth || 680) - 80), H = 150, pt = 22, pb = 34;
    const max = Math.max(4, Math.ceil(Math.max(...days.map((d) => d.h))));
    const slot = (W - 16) / days.length, bw = Math.min(46, slot * 0.6);
    const bars = days.map((d, i) => {
      const cx = 8 + slot * (i + 0.5), bh = (d.h / max) * (H - pt - pb), y = H - pb - bh;
      return `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(bh, d.h > 0 ? 2 : 0)}" rx="4" fill="#3fa660" opacity="${i === days.length - 1 ? 1 : 0.7}"/>
        <text class="st" x="${cx}" y="${y - 5}" text-anchor="middle" style="font-size:11px">${d.h.toLocaleString(lang, { maximumFractionDigits: 1 })} h</text>
        <text class="st" x="${cx}" y="${H - 18}" text-anchor="middle" style="font-size:11px">${d.label}</text>
        <text class="st" x="${cx}" y="${H - 5}" text-anchor="middle" style="font-size:10px;opacity:.75">${d.starts}×</text>
        <rect x="${(8 + slot * i).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${H - pb}" fill="transparent" data-tip="${d.full}|${d.h.toLocaleString(lang, { maximumFractionDigits: 1 })} h · ${d.starts} ${this._t("hp_starts")}"/>`;
    }).join("");
    return `<div class="chw"><svg style="max-width:100%" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("hp_per_day")}">
      <line x1="8" x2="${W - 8}" y1="${H - pb}" y2="${H - pb}" stroke="var(--divider-color)" stroke-width=".8"/>${bars}</svg><div class="tip" style="display:none"></div></div>
      <div class="legend"><span><i style="background:#3fa660"></i>${this._t("hp_per_day")} · ${this._t("hp_starts")}</span></div>`;
  }

}

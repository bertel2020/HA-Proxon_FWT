import { BLUE, CORAL, GREEN, DISMISS_GRACE_MS, BAD } from "./constants.js";

export class HintsMethods {
  // ---- dismissing hints --------------------------------------------------
  // Warnings and infos can be hidden for 24 hours (kept in the Home Assistant user profile, so it
  // follows the user across devices); errors cannot. A hint whose cause has been gone for 30 minutes is forgotten.

  _dismissable(i) {
    return !!i.key && i.lvl !== "r" && i.lvl !== "o";
  }

  _isHidden(i) {
    const ts = this._dismissed && this._dismissed[i.key];
    return this._dismissable(i) && ts !== undefined && Date.now() - ts < 864e5;
  }

  _insights(d) {
    const all = this._insightsAll(d);
    this._pruneDismissed(all);
    const vis = all.filter((i) => !this._isHidden(i));
    if (all.length !== vis.length && !vis.length) return [];
    return vis;
  }

  _hiddenInsights(d) {
    return this._insightsAll(d).filter((i) => this._isHidden(i));
  }

  _pruneDismissed(all) {
    if (!this._dismissed || !this._dismissedLoaded) return;
    const live = new Set(all.map((i) => i.key).filter(Boolean));
    const now = Date.now(), seen = (this._seen = this._seen || {});
    for (const k of live) seen[k] = now;
    let changed = false;
    for (const k of Object.keys(this._dismissed)) {
      // A cause that vanishes only briefly (unavailable sensor, value wobbling around a limit) must not undo the dismissal.
      const gone = !live.has(k) && now - (seen[k] ?? (seen[k] = now)) >= DISMISS_GRACE_MS;
      if (gone || now - this._dismissed[k] >= 864e5) { delete this._dismissed[k]; changed = true; }
    }
    if (changed) this._saveDismissed();
  }

  async _loadDismissed() {
    this._dismissed = {};
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "proxon_fwt_dismissed" });
      if (r && r.value && typeof r.value === "object") this._dismissed = { ...r.value };
    } catch (e) {
      try { this._dismissed = JSON.parse(localStorage.getItem("proxon_fwt_dismissed") || "{}"); } catch (e2) { /* ignore */ }
    }
    this._dismissedLoaded = true;
    this._sig = "";
    this._update();
  }

  _saveDismissed() {
    try { localStorage.setItem("proxon_fwt_dismissed", JSON.stringify(this._dismissed)); } catch (e) { /* ignore */ }
    this._hass.callWS({ type: "frontend/set_user_data", key: "proxon_fwt_dismissed", value: this._dismissed }).catch(() => {});
  }

  _sec_insights(d) {
    const ins = this._insights(d).slice(0, 3), hidden = this._hiddenInsights(d);
    const items = ins.map((i) => `<div class="ins ${i.lvl}">${this._icon(i.icon)}<div class="it${i.ent ? " lk" : ""}" ${i.ent ? `role="button" tabindex="0" data-act="more" data-v="${i.ent}"` : ""}><b>${i.title}</b><small>${i.text}</small></div>
      ${i.tab ? `<button class="vbtn" data-act="tab" data-v="${i.tab}">${this._t(i.go)}</button>` : ""}
      ${this._dismissable(i) ? `<button class="x" data-act="dismiss" data-v="${i.key}" title="${this._t("dismiss")}" aria-label="${this._t("dismiss")}">${this._icon("mdi:close")}</button>` : ""}</div>`).join("");
    const more = hidden.length
      ? `<div class="hid"><span title="${this._t("hidden_note")}">${this._t("hidden_n", String(hidden.length))}</span> · <button class="lnk" data-act="undismiss">${this._t("show_again")}</button></div>` : "";
    if (!items && !more) return "";
    if (!items) return `<div class="hid slim">${this._icon("mdi:lightbulb-outline")} ${more.replace(/^<div class="hid">/, "").replace(/<\/div>$/, "")}</div>`; // only dismissed notices: a slim line instead of an empty card
    return `<ha-card>${this._header("mdi:lightbulb-on-outline", this._t("hints"))}<div class="alerts">${items}</div>${more}</ha-card>`;
  }

  _boostMode(c) {
    if (c.boost && this._state(c.boost) && this._state(c.boost).state !== "unavailable") return "timer"; // handled by the integration, with automatic return
    if (c.fan_intensive && this._on(c.intensive_ventilation_selectable)) return "intensive";
    const sel = this._state(c.fan_stage);
    if (c.fan_stage && sel && !BAD.includes(sel.state) && (!c.fan_stage_4_selectable || this._on(c.fan_stage_4_selectable))) return "stage";
    return null;
  }

  // Boost ventilation: duration chips (timer in the integration) or one button for units without it.
  // The default duration only gets a frame and a tooltip; text stays out of the buttons.
  _boostBlock(c, withTitle) {
    const mode = this._boostMode(c);
    if (!mode) return "";
    let note, body;
    if (mode === "timer") {
      const st = this._state(c.boost);
      if (st.state === "on") {
        const until = st.attributes.until ? new Date(st.attributes.until) : null;
        note = until ? this._t("boost_until", until.toLocaleTimeString(this._hass.language, { hour: "2-digit", minute: "2-digit" })) : "";
        body = `<button class="fchip a" data-act="boost">${this._icon("mdi:stop")}${this._t("boost_stop")}</button>`;
      } else {
        const dflt = Number(st.attributes.duration_minutes) || 30;
        note = this._t("boost_d_t");
        body = [15, 30, 60].map((m) => `<button class="fchip ${m === dflt ? "dflt" : ""}" data-act="boostmin" data-v="${m}"${m === dflt ? ` title="${this._t("boost_std")}"` : ""}>${this._t("boost_min", String(m))}</button>`).join("");
      }
    } else {
      const active = mode === "intensive" ? this._on(c.fan_intensive) : !!this._boost && this._state(c.fan_stage).state === "stage_4";
      note = this._t(mode === "intensive" ? "boost_d_i" : "boost_d_s");
      body = `<button class="fchip ${active ? "a" : ""}" data-act="boost">${this._icon(active ? "mdi:stop" : "mdi:play")}${this._t(active ? "boost_stop" : "boost_go")}</button>`;
    }
    return `<div ${withTitle ? 'class="bblk"' : ""}><div class="lbl2">${withTitle ? `<b>${this._t("boost")}</b>` : ""}<small>${note}</small></div><div class="bch">${body}</div></div>`;
  }

  _sec_measure(d) {
    const c = d.central;
    const t = (label, id) => this._ok(id) ? [label, this._temp(id), id] : null;
    const n = (label, id, unit, dg = 0) => this._ok(id) && this._num(id) !== null ? [label, `${this._fmt(this._num(id), dg)} ${unit}`, id] : null;
    const groups = [
      [this._t("g_air"), [t(this._t("fresh"), c.temp_fresh_air), t(this._t("exhaust"), c.temp_exhaust_air), t(this._t("extract"), c.temp_extract_air),
        t(this._t("supply"), c.temp_supply_air), t(this._t("outside"), this._outdoorId())]],
      [this._t("g_circuit"), [t(this._t("pre_evaporator"), c.temp_pre_evaporator), t(this._t("evaporator"), c.temp_evaporator), t(this._t("post_preheat"), c.temp_post_preheat),
        t(this._t("pre_condenser"), c.temp_pre_condenser), t(this._t("condenser"), c.temp_condenser), t(this._t("compressor"), c.temp_compressor)]],
      [this._t("g_drive"), [n(this._t("compressor"), c.compressor_speed, "rpm"), n(this._t("supply_fan"), c.fan_speed_supply, "rpm"),
        n(this._t("extract_fan"), c.fan_speed_extract, "rpm"), this._pnum() === null ? null : [this._t("power_long"), `${this._fmt(this._pnum(), this._pnum() % 1 ? 1 : 0)} W`, this._powerId()]]],
    ].map(([g, rows]) => [g, rows.filter(Boolean)]).filter(([, rows]) => rows.length);
    if (!groups.length) return "";
    return `<ha-card>${this._header("mdi:table", this._t("measure"))}<div class="mtgrid">${groups.map(([g, rows]) => `<div><div class="mg">${g}</div>
      ${rows.map(([l, v, id]) => `<div class="mr${id ? " lk" : ""}" ${id ? `role="button" tabindex="0" data-act="more" data-v="${id}"` : ""}><span>${l}</span><b>${v}</b></div>`).join("")}</div>`).join("")}</div></ha-card>`;
  }

  // Diagnosis tab: status tiles on top, measurements across the full width, then runtime / starts.
  _diagTab(d) {
    const c = d.central, lang = this._hass.language;
    const tile = (icon, col, title, value, sub, extra = "", id = "") => `<div class="srow" style="--c:${col}"><span class="ic">${this._icon(icon)}</span><div class="b"><div class="sl"><span>${title}</span>${this._lk(id, `<b>${value}</b>`)}</div>${sub ? `<div class="s">${sub}</div>` : ""}${extra}</div></div>`;
    const tiles = [];
    // heat pump
    if (c.heat_pump_heating || c.compressor_speed) {
      const cool = this._on(c.heat_pump_cooling), heat = this._on(c.heat_pump_heating);
      const rpm = this._num(c.compressor_speed), pw = this._pnum();
      const sub = [rpm === null ? "" : this._lk(c.compressor_speed, `${rpm.toLocaleString(lang)} rpm`), pw === null ? "" : this._lk(this._powerId(), `${this._fmt(pw, pw % 1 ? 1 : 0)} W`)].filter(Boolean).join(" · ");
      const sw = c.cooling_enable ? `<div class="s sw">${this._t("cooling_enable")}<ha-switch data-act="coolsw" ${this._on(c.cooling_enable) ? "checked" : ""} ${this._ok(c.cooling_enable) ? "" : "disabled"}></ha-switch></div>` : "";
      const col = cool ? BLUE : heat ? GREEN : "var(--secondary-text-color)";
      const frac = rpm === null ? 0 : Math.min(100, Math.round((rpm / (this._config.max_compressor_rpm || 6000)) * 100));
      const bar = rpm === null ? "" : `<div class="pbar" style="margin:8px 0 2px"><i style="width:${frac}%;background:${col}"></i></div><div class="s">${this._t("compressor")} ${frac} %</div>`;
      const chips = [[c.heat_pump_continuous, "mdi:autorenew", this._t("hp_continuous")], [c.cooling_available, "mdi:snowflake-check", this._t("cooling_available")]]
        .filter(([id]) => id && this._ok(id) && this._on(id)).map(([, ic, l]) => `<span class="chip">${this._icon(ic)}${l}</span>`).join("");
      tiles.push(tile(cool ? "mdi:snowflake" : "mdi:heat-pump", col, this._t("heatpump"),
        this._t(cool ? "hp_cooling" : heat ? "hp_heating" : "hp_idle"), sub, `${bar}${chips ? `<div class="chips" style="margin-top:8px">${chips}</div>` : ""}${sw}`, cool ? c.heat_pump_cooling : c.heat_pump_heating));
    }
    // PTC auxiliary heating: power of all elements, one segment per room (lit = element runs)
    const ptcRooms = d.rooms.filter((r) => r.ents && r.ents.ptc_active), pId = this._ptcP(), pW = pId ? this._watts(pId) : null;
    if (ptcRooms.length) {
      const [on, n, ena] = this._ptcRooms(d);
      const segs = ptcRooms.map((r) => `<i class="${this._on(r.ents.ptc_active) ? "on" : ""}" title="${r.name}"></i>`).join("");
      const names = ptcRooms.filter((r) => this._on(r.ents.ptc_active)).map((r) => r.name).join(", ");
      tiles.push(tile("mdi:radiator", on ? CORAL : "var(--secondary-text-color)", this._t("ptc_heating"),
        pW !== null ? (pW >= 1000 ? `${this._fmt(pW / 1000, 2)} kW` : `${this._fmt(pW, 0)} W`) : this._t(on ? "ptc_active" : "ptc_off"),
        [on ? names : this._t("ptc_idle"), this._t("ptc_rooms_en", ena, n)].filter(Boolean).join(" · "), `<div class="pseg" aria-hidden="true">${segs}</div>`, pId || ""));
    }
    // filter
    const f = this._filterInfo(c);
    if (this._ok(c.filter_device) || f.known) {
      const pct = f.known ? Math.min(100, Math.round((f.age / f.iv) * 100)) : (f.due ? 100 : 0);
      const near = f.due && f.left !== null && f.left <= 7;
      const col = near || (!f.due && pct >= 100) ? "#db4437" : f.due || pct >= 90 ? "#f2a516" : GREEN;
      const sub = f.due && f.left !== null ? this._t("f_shutdown", this._days(f.left))
        : f.known ? this._t("f_age_text", String(Math.round(f.age)), String(f.iv), String(Math.max(0, Math.round(f.iv - f.age)))) : this._t("f_unknown");
      const btn = c.filter_changed ? `<button class="vbtn" data-act="filterchg">${this._icon("mdi:check")}${this._t("f_btn")}</button>` : "";
      const rc = this._recirc() && this._ok(c.filter_recirculation)
        ? `<div class="s">${this._t("filter_recirc")}: <b style="color:${this._on(c.filter_recirculation) ? "#c98400" : GREEN}">${this._on(c.filter_recirculation) ? this._t("change_due") : this._t("ok")}</b></div>` : "";
      tiles.push(tile("mdi:air-filter", col, this._t("filter_device"), f.due ? this._t("change_due") : this._t("ok"), this._lk(c.filter_age_days, sub),
        `<div class="pbar" style="margin:8px 0 6px"><i style="width:${pct}%;background:${col}"></i></div>${rc}${btn}`, c.filter_device));
    }
    // system
    if (this._ok(c.error_system)) {
      const bad = this._on(c.error_system);
      const chg = c.mode_change_possible && this._ok(c.mode_change_possible) ? `${this._t("mode_change")}: ${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}` : "";
      tiles.push(tile(bad ? "mdi:alert-circle-outline" : "mdi:check-circle-outline", bad ? "#db4437" : GREEN, this._t("error"), bad ? this._t("has_error") : this._t("no_error"), chg, "", c.error_system));
      // the bypass is a state of its own, so it gets its own row instead of a line squeezed under the error
      if (c.bypass_active && this._ok(c.bypass_active)) {
        const open = this._on(c.bypass_active);
        tiles.push(tile("mdi:routes", open ? BLUE : "var(--secondary-text-color)", this._t("bypass_t"), this._t(open ? "bp_open" : "bp_closed"), this._t("bp_auto"), "", c.bypass_active));
      }
    }
    // runtime and starts
    const st = (icon, color, label, val, unit, id) => val === null ? "" : `<div class="mr${id ? " lk" : ""}" ${id ? `role="button" tabindex="0" data-act="more" data-v="${id}"` : ""}><span>${label}</span><b>${val}${unit}</b></div>`;
    const sv = (id, dg) => this._num(id) === null ? null : this._fmt(this._num(id), dg);
    const stHtml = st("mdi:clock-outline", GREEN, this._t("rt_today"), sv(c.hp_runtime_today, 1), " h", c.hp_runtime_today) + st("mdi:counter", BLUE, this._t("starts_today"), sv(c.hp_starts_today, 0), "×", c.hp_starts_today) +
      st("mdi:history", GREEN, this._t("rt_total"), sv(c.hp_runtime_total, 1), " h", c.hp_runtime_total) + st("mdi:counter", BLUE, this._t("starts_total"), sv(c.hp_starts_total, 0), "×", c.hp_starts_total);
    // PTC consumption: the meter reading and, from its statistics, what it consumed since midnight
    let ptcRows = "";
    if (this._ptcE()) {
      const tot = this._kwh(this._ptcE()), b = this._hget("b|24h", () => this._loadBuckets(d, "24h")), mid = new Date().setHours(0, 0, 0, 0) / 1000;
      const today = b ? b.filter((x) => x.pkwh !== undefined && x.t >= mid).reduce((a, x) => a + x.pkwh, 0) : null;
      const has = b && b.some((x) => x.pkwh !== undefined && x.t >= mid);
      ptcRows = st("mdi:radiator", CORAL, this._t("ptc_today"), has ? this._fmt(today, 2) : null, " kWh", this._ptcE()) + st("mdi:radiator", CORAL, this._t("ptc_total"), tot === null ? null : this._fmt(tot, tot < 100 ? 2 : 0), " kWh", this._ptcE());
    }
    const stats = stHtml || ptcRows ? `<ha-card>${this._header("mdi:counter", this._t("stats"))}<div class="mtgrid">${stHtml}${ptcRows}</div></ha-card>` : "";
    return `${tiles.length ? `<ha-card>${this._header("mdi:stethoscope", this._t("status"))}<div class="srows">${tiles.join("")}</div></ha-card>` : ""}${this._sec_measure(d)}${stats}`;
  }

}

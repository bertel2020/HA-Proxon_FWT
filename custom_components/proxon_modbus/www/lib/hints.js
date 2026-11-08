import { BLUE, GREEN, DISMISS_GRACE_MS, BAD } from "./constants.js";

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
    const items = ins.map((i) => `<div class="ins ${i.lvl}">${this._icon(i.icon)}<div class="it"><b>${i.title}</b><small>${i.text}</small></div>
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

  _sec_quick(d) {
    const c = d.central, mode = this._boostMode(c);
    const btns = [];
    if (mode) {
      let active, sub;
      if (mode === "timer") {
        const st = this._state(c.boost), until = st.attributes.until ? new Date(st.attributes.until) : null;
        active = st.state === "on";
        if (!active) {
          const dflt = Number(st.attributes.duration_minutes) || 30;
          const chips = [15, 30, 60].map((m) => `<button class="fchip" data-act="boostmin" data-v="${m}">${this._t("boost_min", String(m))}${m === dflt ? `<small class="dtag">${this._t("boost_std")}</small>` : ""}</button>`).join("");
          btns.push(`<div class="qa bst">${this._icon("mdi:weather-windy")}<span><b>${this._t("boost")}</b><small>${this._t("boost_d_t")}</small><span class="bch">${chips}</span></span></div>`);
          sub = null;
        } else {
          sub = until ? this._t("boost_until", until.toLocaleTimeString(this._hass.language, { hour: "2-digit", minute: "2-digit" })) : "";
        }
      } else {
        active = mode === "intensive" ? this._on(c.fan_intensive) : !!this._boost && this._state(c.fan_stage).state === "stage_4";
        sub = this._t(mode === "intensive" ? "boost_d_i" : "boost_d_s");
      }
      if (sub !== null) btns.push(`<button class="qa ${active ? "a" : ""}" data-act="boost">${this._icon("mdi:weather-windy")}<span><b>${this._t(active ? "boost_end" : "boost")}</b><small>${sub}</small></span></button>`);
    }
    if (d.rooms.length) {
      btns.push(`<button class="qa" data-act="allroom" data-v="1">${this._icon("mdi:thermometer-plus")}<span><b>${this._t("all_up")}</b></span></button>`);
      btns.push(`<button class="qa" data-act="allroom" data-v="-1">${this._icon("mdi:thermometer-minus")}<span><b>${this._t("all_down")}</b></span></button>`);
    }
    if (!btns.length) return "";
    return `<ha-card>${this._header("mdi:flash-outline", this._t("quick"))}<div class="qgrid">${btns.join("")}</div></ha-card>`;
  }

  _sec_measure(d) {
    const c = d.central;
    const t = (label, id) => this._ok(id) ? [label, this._temp(id)] : null;
    const n = (label, id, unit, dg = 0) => this._ok(id) && this._num(id) !== null ? [label, `${this._fmt(this._num(id), dg)} ${unit}`] : null;
    const groups = [
      [this._t("g_air"), [t(this._t("fresh"), c.temp_fresh_air), t(this._t("exhaust"), c.temp_exhaust_air), t(this._t("extract"), c.temp_extract_air),
        t(this._t("supply"), c.temp_supply_air), t(this._t("outside"), this._outdoorId())]],
      [this._t("g_circuit"), [t(this._t("pre_evaporator"), c.temp_pre_evaporator), t(this._t("evaporator"), c.temp_evaporator), t(this._t("post_preheat"), c.temp_post_preheat),
        t(this._t("pre_condenser"), c.temp_pre_condenser), t(this._t("condenser"), c.temp_condenser), t(this._t("compressor"), c.temp_compressor)]],
      [this._t("g_drive"), [n(this._t("compressor"), c.compressor_speed, "rpm"), n(this._t("supply_fan"), c.fan_speed_supply, "rpm"),
        n(this._t("extract_fan"), c.fan_speed_extract, "rpm"), this._pnum() === null ? null : [this._t("power_long"), `${this._fmt(this._pnum(), this._pnum() % 1 ? 1 : 0)} W`]]],
    ].map(([g, rows]) => [g, rows.filter(Boolean)]).filter(([, rows]) => rows.length);
    if (!groups.length) return "";
    return `<ha-card>${this._header("mdi:table", this._t("measure"))}<div class="mtgrid">${groups.map(([g, rows]) => `<div><div class="mg">${g}</div>
      ${rows.map(([l, v]) => `<div class="mr"><span>${l}</span><b>${v}</b></div>`).join("")}</div>`).join("")}</div></ha-card>`;
  }

  // Diagnosis tab: status tiles on top, measurements across the full width, then runtime / starts.
  _diagTab(d) {
    const c = d.central, lang = this._hass.language;
    const tile = (icon, col, title, value, sub, extra = "") => `<div class="dt" style="--c:${col}"><span class="ic">${this._icon(icon)}</span><div class="b"><small>${title}</small><b>${value}</b>${sub ? `<div class="s">${sub}</div>` : ""}${extra}</div></div>`;
    const tiles = [];
    // heat pump
    if (c.heat_pump_heating || c.compressor_speed) {
      const cool = this._on(c.heat_pump_cooling), heat = this._on(c.heat_pump_heating);
      const rpm = this._num(c.compressor_speed), pw = this._pnum();
      const sub = [rpm === null ? "" : `${rpm.toLocaleString(lang)} rpm`, pw === null ? "" : `${this._fmt(pw, pw % 1 ? 1 : 0)} W`].filter(Boolean).join(" · ");
      const sw = c.cooling_enable ? `<div class="s sw">${this._t("cooling_enable")}<ha-switch data-act="coolsw" ${this._on(c.cooling_enable) ? "checked" : ""} ${this._ok(c.cooling_enable) ? "" : "disabled"}></ha-switch></div>` : "";
      const col = cool ? BLUE : heat ? GREEN : "var(--secondary-text-color)";
      const frac = rpm === null ? 0 : Math.min(100, Math.round((rpm / (this._config.max_compressor_rpm || 6000)) * 100));
      const bar = rpm === null ? "" : `<div class="pbar" style="margin:8px 0 2px"><i style="width:${frac}%;background:${col}"></i></div><div class="s">${this._t("compressor")} ${frac} %</div>`;
      const chips = [[c.heat_pump_continuous, "mdi:autorenew", this._t("hp_continuous")], [c.cooling_available, "mdi:snowflake-check", this._t("cooling_available")]]
        .filter(([id]) => id && this._ok(id) && this._on(id)).map(([, ic, l]) => `<span class="chip">${this._icon(ic)}${l}</span>`).join("");
      tiles.push(tile(cool ? "mdi:snowflake" : "mdi:heat-pump", col, this._t("heatpump"),
        this._t(cool ? "hp_cooling" : heat ? "hp_heating" : "hp_idle"), sub, `${bar}${chips ? `<div class="chips" style="margin-top:8px">${chips}</div>` : ""}${sw}`));
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
      tiles.push(tile("mdi:air-filter", col, this._t("filter_device"), f.due ? this._t("change_due") : this._t("ok"), sub,
        `<div class="pbar" style="margin:8px 0 6px"><i style="width:${pct}%;background:${col}"></i></div>${rc}${btn}`));
    }
    // system
    if (this._ok(c.error_system)) {
      const bad = this._on(c.error_system);
      const chg = c.mode_change_possible && this._ok(c.mode_change_possible) ? `${this._t("mode_change")}: ${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}` : "";
      const byp = c.bypass_active && this._ok(c.bypass_active) ? `<div class="s">${this._icon("mdi:routes")} ${this._t(this._on(c.bypass_active) ? "bypass_open" : "bypass_closed")}</div>` : "";
      tiles.push(tile(bad ? "mdi:alert-circle-outline" : "mdi:check-circle-outline", bad ? "#db4437" : GREEN, this._t("error"), bad ? this._t("has_error") : this._t("no_error"), chg, byp));
    }
    // runtime and starts
    const st = (icon, color, label, val, unit) => val === null ? "" : `<div class="rs" style="--c:${color}"><span class="ic">${this._icon(icon)}</span><div><small>${label}</small><b>${val}<span>${unit}</span></b></div></div>`;
    const sv = (id, dg) => this._num(id) === null ? null : this._fmt(this._num(id), dg);
    const stHtml = st("mdi:clock-outline", GREEN, this._t("rt_today"), sv(c.hp_runtime_today, 1), " h") + st("mdi:counter", BLUE, this._t("starts_today"), sv(c.hp_starts_today, 0), "×") +
      st("mdi:history", GREEN, this._t("rt_total"), sv(c.hp_runtime_total, 1), " h") + st("mdi:counter", BLUE, this._t("starts_total"), sv(c.hp_starts_total, 0), "×");
    const stats = stHtml ? `<ha-card>${this._header("mdi:counter", this._t("stats"))}<div class="rsum" style="margin-bottom:0">${stHtml}</div></ha-card>` : "";
    return `${tiles.length ? `<div class="dtiles">${tiles.join("")}</div>` : ""}${this._sec_measure(d)}${stats}`;
  }

  _sec_maint(d) {
    const c = d.central, f = this._filterInfo(c);
    const fbar = () => {
      if (!this._ok(c.filter_device) && !f.known) return "";
      const pct = f.known ? Math.min(100, Math.round((f.age / f.iv) * 100)) : (f.due ? 100 : 0);
      const near = f.due && f.left !== null && f.left <= 7;
      const col = near || (!f.due && pct >= 100) ? "#db4437" : f.due || pct >= 90 ? "#f2a516" : GREEN;
      const sub = f.due && f.left !== null ? `<b style="color:${near ? "#db4437" : "#c98400"}">${this._t("f_shutdown", this._days(f.left))}</b>`
        : f.known ? this._t("f_age_text", String(Math.round(f.age)), String(f.iv), String(Math.max(0, Math.round(f.iv - f.age)))) : this._t("f_unknown");
      const btn = c.filter_changed ? `<button class="vbtn" style="margin-top:8px" data-act="filterchg">${this._icon("mdi:check")}${this._t("f_btn")}</button>` : "";
      return `<div class="mrow"><div class="mh"><span>${this._icon("mdi:air-filter")}${this._t("filter_device")}</span><b style="color:${col}">${f.due ? this._t("change_due") : this._t("ok")}</b></div>
        <div class="pbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%;background:${col}"></i></div>
        <div class="lb">${sub}</div>${btn}</div>`;
    };
    const rbar = () => {
      if (!this._recirc() || !this._ok(c.filter_recirculation)) return "";
      const due = this._on(c.filter_recirculation);
      return `<div class="mrow"><div class="mh"><span>${this._icon("mdi:air-filter")}${this._t("filter_recirc")}</span><b style="color:${due ? "#c98400" : GREEN}">${due ? this._t("change_due") : this._t("ok")}</b></div></div>`;
    };
    const row = (icon, label, val) => val === null ? "" : `<div class="row">${this._icon(icon)}${label}<b>${val}</b></div>`;
    const hv = (id) => this._num(id) === null ? null : `${this._fmt(this._num(id), 1)} h`;
    const iv0 = (id) => this._num(id) === null ? null : this._fmt(this._num(id), 0);
    const err = this._ok(c.error_system) ? `<div class="row">${this._icon("mdi:check-circle-outline")}${this._t("error")}<b style="color:${this._on(c.error_system) ? "#db4437" : GREEN}">${this._on(c.error_system) ? this._t("has_error") : this._t("no_error")}</b></div>` : "";
    const chg = c.mode_change_possible && this._ok(c.mode_change_possible)
      ? `<div class="row">${this._icon("mdi:shuffle-variant")}${this._t("mode_change")}<b>${this._on(c.mode_change_possible) ? this._t("possible") : this._t("not_possible")}</b></div>` : "";
    const stats = row("mdi:heat-pump", this._t("rt_today"), hv(c.hp_runtime_today)) + row("mdi:counter", this._t("starts_today"), iv0(c.hp_starts_today)) +
      row("mdi:heat-pump-outline", this._t("rt_total"), hv(c.hp_runtime_total)) + row("mdi:counter", this._t("starts_total"), iv0(c.hp_starts_total));
    const filters = fbar() + rbar();
    const html = filters + (err || chg ? `<div class="msep">${(err + chg).replace('class="row"', 'class="row first"')}</div>` : "") + (stats ? `<div class="msep">${stats.replace('class="row"', 'class="row first"')}</div>` : "");
    if (!html) return "";
    return `<ha-card>${this._header("mdi:wrench-outline", this._t("maint"))}${html}</ha-card>`;
  }

}

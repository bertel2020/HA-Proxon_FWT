import { BLUE, GREEN, BAD } from "./constants.js";

export class PanelSectionsMethods {
  // ---- panel-only sections ---------------------------------------------

  // Status of the heat pump and the operating mode as two quiet chips on the right of the header.
  _headChips(d) {
    if (!d) return "";
    const c = d.central, st = c.heat_pump_heating && this._state(c.heat_pump_heating);
    const mode = this._state(c.operating_mode);
    if (mode && mode.state === "unavailable") return `<span class="hchip s" style="--dc:#db4437"><span class="dot"></span>${this._t("live_lost")}</span>`;
    const cool = this._on(c.heat_pump_cooling), heat = this._on(c.heat_pump_heating);
    const label = this._t(cool ? "hd_cool" : heat ? "hd_heat" : "hd_idle");
    const modeKey = mode && !BAD.includes(mode.state) ? mode.state : this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    let since = "";
    if ((cool || heat) && st && st.last_changed) {
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(st.last_changed)) / 60000));
      since = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    }
    const status = `<span class="hchip s" style="--dc:${cool ? BLUE : heat ? GREEN : "#8a8f98"}"><span class="dot"></span>${label}${since ? `<small class="hm">${since}</small>` : ""}</span>`;
    return status + (modeKey ? `<span class="hchip m">${this._t(modeKey)}</span>` : "") + this._twHeadChip(d);
  }

  // Overview status block: one quiet row per topic (icon, label, value). The heat pump state stays in the header chips, the fan stage in the controls.
  _sec_status(d) {
    const c = d.central, rows = [];
    const row = (icon, col, label, value, go = "") => `<div class="srow2 ${go ? "go" : ""}" ${go ? `role="button" tabindex="0" data-act="tab" data-v="${go}"` : ""}>
      <span class="ic" style="color:${col}">${this._icon(icon)}</span><span class="lb2">${label}</span><b style="color:${col}">${value}</b></div>`;
    const MUTED = "var(--primary-text-color)", WARN = "#c98400", BADC = "#db4437";
    if (this._ok(c.error_system)) {
      const bad = this._on(c.error_system);
      rows.push(row(bad ? "mdi:alert-circle-outline" : "mdi:check-circle-outline", bad ? BADC : GREEN, this._t("error"), this._t(bad ? "has_error" : "no_error"), bad ? "diag" : ""));
    }
    const f = this._filterInfo(c);
    if (this._ok(c.filter_device) || f.known) {
      rows.push(row("mdi:air-filter", f.due ? WARN : GREEN, this._t("filter_device"), this._t(f.due ? "change_due" : "ok"), "diag"));
    }
    if (c.mode_change_possible && this._ok(c.mode_change_possible)) {
      const ok = this._on(c.mode_change_possible);
      rows.push(row("mdi:swap-horizontal", MUTED, this._t("mode_change"), this._t(ok ? "possible" : "not_possible")));
    }
    if (c.bypass_active && this._ok(c.bypass_active)) {
      const open = this._on(c.bypass_active), txt = this._t(open ? "bypass_open" : "bypass_closed");
      rows.push(row("mdi:routes", open ? BLUE : MUTED, txt.replace(/\s*\(.*\)$/, ""), ""));
    }
    const ptc = d.rooms.filter((r) => this._on(r.ents.ptc_active)).length;
    const ptcEna = d.rooms.filter((r) => r.ents.ptc_enable && this._on(r.ents.ptc_enable)).length;
    if (d.rooms.length) rows.push(row("mdi:home-outline", ptc ? WARN : MUTED, `${this._t("rooms")} · ${this._t("rs_heat")}`, `${ptc} ${this._t("rs_active")} · ${ptcEna} ${this._t("rs_enabled")}`, "rooms"));
    if (!rows.length) return "";
    return `<ha-card>${this._header("mdi:clipboard-check-outline", this._t("status"))}<div class="srows2">${rows.join("")}</div></ha-card>`;
  }

  _insightsAll(d) {
    const c = d.central, out = [], f = this._filterInfo(c);
    if (f.due) {
      const near = f.left !== null && f.left <= 7;
      out.push({ key: "filter_now", lvl: near ? "r" : "w", icon: "mdi:air-filter", title: this._t("ins_filter_now", this._t("filter_device")),
        text: f.left !== null ? this._t("ins_shutdown_d", this._days(f.left)) : this._t("ins_filter_now_d"), tab: "diag", go: "go_maint" });
    } else if (f.known && f.age >= f.iv - 14) {
      out.push({ key: "filter_soon", lvl: "w", icon: "mdi:air-filter", title: this._t("ins_filter_soon", this._t("filter_device")),
        text: this._t("ins_filter_soon_d", String(Math.round(f.age)), String(f.iv)), tab: "diag", go: "go_maint" });
    }
    if (this._recirc() && this._on(c.filter_recirculation)) {
      out.push({ key: "filter_recirc", lvl: "w", icon: "mdi:air-filter", title: this._t("ins_filter_now", this._t("filter_recirc")), text: this._t("ins_filter_now_d"), tab: "diag", go: "go_maint" });
    }
    const starts = this._num(c.hp_starts_today);
    if (starts !== null && starts >= 8) out.push({ key: "cycle", lvl: "i", icon: "mdi:repeat", title: this._t("ins_cycle_t"), text: this._t("ins_cycle_d", String(Math.round(starts))), tab: "history", go: "go_hist" });
    const eff = this._efficiency();
    if (eff !== null && eff < 75 && !this._on(c.bypass_active)) out.push({ key: "eff", lvl: "w", icon: "mdi:percent-circle-outline", title: this._t("ins_eff_t"), text: this._t("ins_eff_d", String(eff)), tab: "diag", go: "go_diag" });
    const hi = d.rooms.map((r) => ({ r, v: this._num(r.co2) })).filter((x) => x.v !== null && x.v > 1000).sort((a, b) => b.v - a.v)[0];
    if (hi) out.push({ key: "co2", lvl: "w", icon: "mdi:molecule-co2", title: this._t("ins_co2_t"), text: this._t("ins_co2_d", hi.r.name, String(Math.round(hi.v))), tab: "rooms", go: "tab_rooms" });
    if (!out.length) {
      const bits = [eff !== null ? this._t("ins_ok_eff", String(eff)) : "", this._t("ins_ok_d")].filter(Boolean).join(" ");
      out.push({ lvl: "o", icon: "mdi:check-circle-outline", title: this._t("ins_ok_t"), text: bits });
    }
    const rank = { r: 0, w: 1, i: 2, o: 3 };
    return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]);
  }

}

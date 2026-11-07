import { BLUE, GREEN, BAD } from "./constants.js";

export class PanelSectionsMethods {
  // ---- panel-only sections ---------------------------------------------

  _subline(d) {
    if (!d) return "";
    const c = d.central, st = c.heat_pump_heating && this._state(c.heat_pump_heating);
    const mode = this._state(c.operating_mode);
    if (mode && mode.state === "unavailable") return `<span class="dot" style="--dc:#db4437"></span><b>${this._t("live_lost")}</b>`;
    const cool = this._on(c.heat_pump_cooling), heat = this._on(c.heat_pump_heating);
    const label = cool ? this._t("hp_cooling") : heat ? this._t("hp_heating") : this._t("hp_idle");
    const modeKey = mode && !BAD.includes(mode.state) ? mode.state : this._ok(c.operating_mode_state) ? this._state(c.operating_mode_state).state : null;
    let since = "";
    if ((cool || heat) && st && st.last_changed) {
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(st.last_changed)) / 60000));
      since = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    }
    return `<span class="dot" style="--dc:${cool ? BLUE : heat ? GREEN : "#8a8f98"}"></span><b>${label}</b>${modeKey ? `<span class="sep">·</span>${this._t(modeKey)}` : ""}${since ? `<span class="sep hm">·</span><span class="hm">${this._t("since")} ${since}</span>` : ""}`;
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

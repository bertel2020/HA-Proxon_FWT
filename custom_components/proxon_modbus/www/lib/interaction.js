import { UI_ACTS } from "./constants.js";

export class InteractionMethods {
  // ---- interaction ------------------------------------------------------

  // Target temperature: a not yet written step wins over the value the unit last reported.
  _tgt(id, a) {
    const p = this._pend && this._pend[id];
    return p ? p.t : a.temperature;
  }

  // Steps of the +/- buttons add up on a pending target and are written once, shortly after the last click.
  _bump(id, dir) {
    const a = (this._state(id) || {}).attributes || {}, step = a.target_temp_step || 1;
    const pend = (this._pend = this._pend || {}), e = pend[id] || {};
    const t = Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 18, (e.t ?? a.temperature ?? a.current_temperature ?? 21) + dir * step));
    clearTimeout(e.timer);
    const fire = () => {
      if (this._wbusy) { pend[id].timer = setTimeout(fire, 200); return; }
      this._write(() => this._hass.callService("climate", "set_temperature", { entity_id: id, temperature: t }))
        .finally(() => { if (pend[id] && pend[id].t === t) delete pend[id]; this._sig = ""; this._update(); });
    };
    pend[id] = { t, timer: setTimeout(fire, 500) };
    this._sig = ""; this._update();
  }

  // Runs service calls one after another; while they run, controls are locked and a failure is shown as a toast.
  async _write(fn) {
    if (this._wbusy) return;
    this._wbusy = true;
    this.toggleAttribute("busy", true);
    try {
      await fn();
    } catch (err) {
      const message = `${this._t("write_err")}: ${(err && err.message) || err}`;
      this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message }, bubbles: true, composed: true }));
    } finally {
      this._wbusy = false;
      this.toggleAttribute("busy", false);
    }
  }

  _click(ev) {
    const el = ev.composedPath().find((n) => n.dataset && n.dataset.act);
    if (!el || !this._d || el.disabled) return;
    const act = el.dataset.act, v = el.dataset.v, c = this._d.central, h = this._hass;
    if (this._wbusy && !UI_ACTS.has(act)) return;
    const call = (domain, service, data) => this._write(() => h.callService(domain, service, data));
    switch (act) {
      case "mode": call("select", "select_option", { entity_id: c.operating_mode, option: v }); break;
      case "fan": this._write(async () => {
        await h.callService("select", "select_option", { entity_id: c.fan_stage, option: v });
        if (this._on(c.fan_auto)) await h.callService("switch", "turn_off", { entity_id: c.fan_auto });
      }); break;
      case "fanauto": call("switch", this._on(c.fan_auto) ? "turn_off" : "turn_on", { entity_id: c.fan_auto }); break;
      case "autosw": call("switch", "toggle", { entity_id: c.fan_auto }); break;
      case "hcmp": this._hcmp = !this._hcmp; this._update(); break;
      case "hrange": this._histRange = v; this._update(); break;
      case "metric": this._metric = v; this._update(); break;
      case "ymetric": this._ymetric = v; this._sig = ""; this._update(); break;
      case "dismiss": this._dismissed = this._dismissed || {}; this._dismissed[v] = Date.now(); this._saveDismissed(); this._sig = ""; this._update(); break;
      case "undismiss": this._dismissed = {}; this._saveDismissed(); this._sig = ""; this._update(); break;
      case "kpi": this._metric = v; this._tab = "history"; this._sig = ""; this._update(); if (this.scrollIntoView) this.scrollIntoView({ block: "start" }); break;
      case "tab": this._tab = v; this._sig = ""; this._update(); if (this.scrollIntoView) this.scrollIntoView({ block: "start" }); break;
      case "rview": this._rview = v; this._sig = ""; this._update(); break;
      case "rfilter": this._rfilter = v === this._rfilter ? "all" : v; this._sig = ""; this._update(); break;
      case "rtoggle": {
        const id = this._d.rooms[Number(v)].climate;
        this._ropen = this._ropen || new Set();
        const was = this._ropen.has(id);
        this._ropen.clear();
        if (!was) { this._ropen.add(id); this._focusReq = "open"; this._lastRoom = v; } else this._focusReq = `close:${v}`;
        this._sig = ""; this._update(); break;
      }
      case "rclose":
        if (el.classList && el.classList.contains("rdlg") && this._pd !== el) break; // a drag that ended on the backdrop is not a close
        if (this._ropen) this._ropen.clear();
        if (this._lastRoom != null) this._focusReq = `close:${this._lastRoom}`;
        this._sig = ""; this._update(); break;
      case "noop": break;
      case "rstep": {
        const [n, dir] = v.split("|"), id = this._d.rooms[Number(n)].climate;
        this._bump(id, Number(dir));
        break;
      }
      case "rptc": call("switch", "toggle", { entity_id: this._d.rooms[Number(v)].ents.ptc_enable }); break;
      case "boost": this._toggleBoost(); break;
      case "boostmin": { const c = this._d.central; if (c.boost) call("proxon_modbus", "start_boost", { entity_id: c.boost, minutes: Number(v) }); break; }
      case "filterchg": if (c.filter_changed && window.confirm(this._t("f_confirm"))) call("button", "press", { entity_id: c.filter_changed }); break;
      case "restoresw": call("switch", "toggle", { entity_id: c.fan_stage_restore }); break;
      case "intensive": call("switch", "toggle", { entity_id: c.fan_intensive }); break;
      case "coolsw": call("switch", "toggle", { entity_id: c.cooling_enable }); break;
      case "ptc": call("switch", "toggle", { entity_id: this._d.rooms[this._room].ents.ptc_enable }); break;
      case "view": this._view = v; this._sig = ""; this._update(); break;
      case "room": this._room = Number(v); this._sig = ""; this._update(); break;
      case "menu": this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); break;
      case "up": case "down": this._bump(this._d.rooms[this._room].climate, act === "up" ? 1 : -1); break;
    }
  }

  _toggleBoost() {
    const c = this._d.central, h = this._hass;
    const mode = this._boostMode(c);
    if (mode === "timer") { this._write(() => h.callService("switch", this._on(c.boost) ? "turn_off" : "turn_on", { entity_id: c.boost })); return; }
    if (mode === "intensive") { this._write(() => h.callService("switch", this._on(c.fan_intensive) ? "turn_off" : "turn_on", { entity_id: c.fan_intensive })); return; }
    if (mode !== "stage") return;
    if (this._wbusy) return;
    if (this._boost) {
      const b = this._boost;
      this._boost = null;
      try { localStorage.removeItem("proxon_fwt_boost"); } catch (e) { /* ignore */ }
      this._write(async () => {
        await h.callService("select", "select_option", { entity_id: c.fan_stage, option: b.stage });
        if (b.auto) await h.callService("switch", "turn_on", { entity_id: c.fan_auto });
      });
    } else {
      this._boost = { stage: this._state(c.fan_stage).state, auto: this._on(c.fan_auto) };
      try { localStorage.setItem("proxon_fwt_boost", JSON.stringify(this._boost)); } catch (e) { /* ignore */ }
      const auto = this._boost.auto;
      this._write(async () => {
        if (auto) await h.callService("switch", "turn_off", { entity_id: c.fan_auto });
        await h.callService("select", "select_option", { entity_id: c.fan_stage, option: "stage_4" });
      });
    }
    this._sig = ""; this._update();
  }

}

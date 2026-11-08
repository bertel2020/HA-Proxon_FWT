// Panel/card stylesheet; one constructable sheet is shared by all instances.
export const CSS = `
  :host([busy]) [data-act]:not([data-act="tab"]):not([data-act="view"]):not([data-act="room"]):not([data-act="rclose"]):not([data-act="noop"]):not([data-act="rstep"]):not([data-act="up"]):not([data-act="down"]) { opacity: .6; pointer-events: none; }
:host { display: block; color: var(--primary-text-color); --pbd: color-mix(in srgb, var(--primary-text-color) 24%, transparent); }
* { box-sizing: border-box; }
.ov { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 12px; align-items: start; }
@media (max-width: 1180px) { .ov { grid-template-columns: minmax(0, 1fr); } .ov > .col:last-child { order: -1; } }
.stack { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.top { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 12px; align-items: start; }
.col { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; }
.stack > *, .grid > *, .top > * { min-width: 0; }
ha-card { padding: 14px 16px; display: block; border: 1px solid var(--ha-card-border-color, var(--pbd)); box-sizing: border-box; }
.h { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; margin-bottom: 12px; flex-wrap: wrap; }
.h > ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.h .r { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; align-items: center; min-width: 0; }
.lb { font-size: 12px; color: var(--secondary-text-color); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 4px; }
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 3px 10px; border-radius: 99px;
  background: var(--secondary-background-color); color: var(--secondary-text-color); white-space: nowrap; }
.chip ha-icon { --mdc-icon-size: 14px; }
.chip.g { background: color-mix(in srgb, #3fa660 20%, transparent); color: #3fa660; }
.chip.w { background: color-mix(in srgb, #f2a516 22%, transparent); color: #c98400; }
.chip.r { background: color-mix(in srgb, #db4437 20%, transparent); color: #db4437; }
.chip.a { background: color-mix(in srgb, var(--primary-color) 20%, transparent); color: var(--primary-color); }
.banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 500; }
.banner ha-icon { --mdc-icon-size: 20px; }
.banner.w { background: color-mix(in srgb, #f2a516 18%, transparent); color: #b87900; }
.banner.r { background: color-mix(in srgb, #db4437 16%, transparent); color: #c5392d; }
.alerts { display: grid; gap: 8px; }
.seg { display: grid; gap: 6px; }
.opw { container-type: inline-size; }
.lbl2 { font-size: 12px; color: var(--secondary-text-color); margin: 12px 0 6px; display: flex; gap: 8px; align-items: center; }
.opw .lbl2:first-of-type { margin-top: 0; }
.seg.cmp { background: var(--secondary-background-color); border-radius: 12px; padding: 4px; gap: 4px; border: 1px solid var(--pbd); }
.seg.cmp button { display: flex; gap: 6px; align-items: center; justify-content: center; padding: 8px 4px; border-radius: 9px; background: transparent; border-color: transparent; white-space: nowrap; }
.seg.cmp button ha-icon { display: inline-block; margin: 0; --mdc-icon-size: 18px; }
.seg.cmp button.a { background: var(--card-background-color); box-shadow: 0 1px 3px #0002; border-color: transparent; color: var(--mc, var(--primary-color)); }
.seg.cmp .ls { display: none; }
@container (max-width: 560px) { .seg.cmp.mo button { flex-direction: column; gap: 2px; font-size: 12px; padding: 6px 2px; } .seg.cmp .lf { display: none; } .seg.cmp .ls { display: inline; } }
.oinline { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; font-size: 13px; color: var(--secondary-text-color); }
.oinline .rp { display: inline-flex; gap: 10px; align-items: center; } .oinline .tg { margin-left: auto; display: inline-flex; gap: 8px; align-items: center; color: var(--primary-text-color); }
.tag { font-size: 11px; background: color-mix(in srgb, var(--amber, #e8a13a) 18%, transparent); border-radius: 99px; padding: 2px 8px; }

.seg button { font: inherit; font-size: 13px; padding: 10px 4px 8px; border: 1.5px solid var(--pbd); border-radius: 12px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--primary-text-color); transition: background .15s, border-color .15s; }
.seg button ha-icon { display: block; margin: 0 auto 3px; --mdc-icon-size: 24px; color: var(--mc, var(--secondary-text-color)); }
.seg button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--mc, var(--primary-color)) 45%, transparent); }
.seg button.a { background: color-mix(in srgb, var(--mc, var(--primary-color)) 18%, transparent); border-color: var(--mc, var(--primary-color)); font-weight: 600; }
.seg button:disabled { opacity: .4; cursor: default; }
.row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 7px 0; border-top: 1px solid var(--divider-color); }
.row.first { border-top: 0; padding-top: 0; }
.row > ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
.row b { margin-left: auto; font-weight: 500; }
.row .sp { margin-left: auto; }
.bar { height: 6px; width: 110px; margin-left: auto; border-radius: 3px; background: var(--secondary-background-color); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; background: var(--primary-color); }
.k { background: var(--secondary-background-color); border-radius: 12px; padding: 10px 12px; }
.k .v { font-size: 18px; font-weight: 500; }
.k .v.small { font-size: 15px; }
.kgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kpiw { container-type: inline-size; }
.kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
@container (max-width: 640px) { .kpi { grid-template-columns: repeat(2, 1fr); } .kpi .k:last-child:nth-child(odd) { grid-column: 1 / -1; } }
@container (max-width: 520px) { .kpi .ic { width: 30px; height: 30px; } .kpi .k { gap: 8px; } }
.kpi .k { display: flex; gap: 10px; align-items: center; min-width: 0; }
.kpi .k > div:last-child { min-width: 0; }
.kpi .k.go { cursor: pointer; border-radius: 12px; } .kpi .k.go:hover .ic { filter: brightness(.95); outline: 1px solid color-mix(in srgb, var(--kc) 50%, transparent); }
.spk { display: block; width: 110px; max-width: 100%; height: 22px; margin-top: 2px; }
.kpi .lb { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi .ic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none;
  background: color-mix(in srgb, var(--kc) 18%, transparent); color: var(--kc); }
.kpi .ic ha-icon { --mdc-icon-size: 20px; }
.kpi .v { font-size: 22px; font-weight: 500; line-height: 1.15; }
.kpi .v small { font-size: 12px; color: var(--secondary-text-color); font-weight: 400; }
.note { font-size: 12px; color: var(--secondary-text-color); margin-top: 8px; }
.hp { display: flex; align-items: center; gap: 16px; }
.big { font-size: 26px; font-weight: 500; }
.big small { font-size: 14px; color: var(--secondary-text-color); font-weight: 400; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.tile { font: inherit; text-align: left; cursor: pointer; border: 2px solid transparent; border-radius: 12px; padding: 10px 12px;
  background: color-mix(in srgb, var(--hc, transparent) var(--ha, 0%), var(--secondary-background-color)); color: var(--primary-text-color); }
.tile.s { border-color: var(--primary-color); }
.tile .n { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
.tile .n ha-icon { --mdc-icon-size: 18px; color: var(--hc, var(--secondary-text-color)); }
.tile .t { font-size: 24px; font-weight: 500; margin: 6px 0 2px; }
.tile .lb { margin-bottom: 4px; }
.tile .chips { margin: 0; gap: 4px; }
.rw { display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; align-items: center; padding: 9px 8px;
  border-top: 1px solid var(--divider-color); cursor: pointer; border-radius: 8px; }
.rw > span:first-child { display: flex; align-items: center; gap: 8px; }
.rw ha-icon { --mdc-icon-size: 18px; color: var(--hc, var(--secondary-text-color)); }
.rw.s { background: var(--secondary-background-color); }
.vbtn { font: inherit; font-size: 13px; padding: 5px 12px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--secondary-background-color); color: var(--secondary-text-color); display: inline-flex; gap: 4px; align-items: center; }
.vbtn ha-icon { --mdc-icon-size: 16px; }
.vbtn.a { background: var(--primary-color); color: var(--text-primary-color, #fff); }
.det { margin-top: 12px; border-top: 1px solid var(--divider-color); padding-top: 12px; }
.dtop { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.dtop .cur { flex: 1; min-width: 150px; font-size: 32px; font-weight: 500; line-height: 1.1; }
.adj { display: flex; align-items: center; gap: 12px; }
.round { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--pbd); cursor: pointer; padding: 0;
  background: var(--card-background-color); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; }
.round:hover { border-color: var(--primary-color); color: var(--primary-color); }
.dgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 12px; }
.fl { stroke-dasharray: 6 5; animation: fl 1s linear infinite; }
.sp-rot { transform-box: fill-box; transform-origin: center; animation: rot 1.2s linear infinite; }
.off .fl, .off .sp-rot { animation: none; }
@keyframes fl { to { stroke-dashoffset: -11; } }
@keyframes rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .fl, .sp-rot { animation: none; } }
.sch .st { paint-order: stroke; stroke: var(--secondary-background-color); stroke-width: 3px; stroke-linejoin: round; }
.sch .nh { stroke: none; }
.sch .duct { fill: none; stroke-width: 13; stroke-linecap: round; stroke-linejoin: round; opacity: .13; }
.sch .core { fill: none; stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; opacity: .4; }
.sch .dots { fill: none; stroke-width: 3.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: .1 14; }
.sch .refr { fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 7 5; }
.sch .dim { opacity: .22; }
.sch .go { animation: sflow var(--spd, 1.2s) linear infinite; }
.sch .rgo { animation: smarsh var(--rsp, 1s) linear infinite; }
.sch .rot { animation: sspin var(--fan, .7s) linear infinite; }
.sch .ripple { transform-box: fill-box; transform-origin: center; animation: srip 2.4s ease-out infinite; }
/* Offsets equal one full dash period (.1 + 14 and 7 + 5), so the loop restarts without a jump. */
@keyframes sflow { to { stroke-dashoffset: -14.1; } }
@keyframes smarsh { to { stroke-dashoffset: -12; } }
@keyframes sspin { to { transform: rotate(360deg); } }
@keyframes srip { 0% { transform: scale(1); opacity: .45; } 100% { transform: scale(1.7); opacity: 0; } }
.sch.off .go, .sch.off .rgo, .sch.off .rot, .sch.off .ripple { animation-play-state: paused; }
.sch.off .ripple { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .sch .go, .sch .rgo, .sch .rot, .sch .ripple { animation: none; } }
svg text { fill: var(--primary-text-color); font-family: inherit; }
svg .st { font-size: 12px; fill: var(--secondary-text-color); }
svg .sh { font-size: 13px; font-weight: 500; }
.empty { padding: 16px; color: var(--secondary-text-color); }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--secondary-text-color); margin-top: 6px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.panel { padding: 16px; max-width: 1500px; margin: 0 auto; }
.bar-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.bar-top .title { font-size: 20px; font-weight: 500; display: flex; align-items: center; gap: 10px; }
.bar-top .title ha-icon { --mdc-icon-size: 26px; color: var(--primary-color); }
.bar-top .grow { flex: 1; }
.menu { display: none; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--divider-color); margin: 0 0 14px; overflow-x: auto; }
.tabbtn { font: inherit; font-size: 14px; display: inline-flex; gap: 6px; align-items: center; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent;
  background: none; color: var(--secondary-text-color); cursor: pointer; white-space: nowrap; }
.tabbtn ha-icon { --mdc-icon-size: 20px; }
.tabbtn.a { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 500; }
.badge { min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #f2a516; color: #fff; font-size: 11px; display: inline-grid; place-items: center; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.logo { width: 38px; height: 38px; border-radius: 11px; background: #fff; display: grid; place-items: center; flex: none; border: 1px solid var(--divider-color); overflow: hidden; }
.logo img { width: 30px; height: 30px; display: block; }
.brand h1 { font-size: 20px; font-weight: 500; margin: 0; line-height: 1.2; }
.hchips { display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
.hchip { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; padding: 5px 12px; border-radius: 99px; white-space: nowrap;
  border: 1px solid var(--divider-color); color: var(--primary-text-color); }
.hchip.s { font-weight: 500; background: color-mix(in srgb, var(--dc) 14%, transparent); border-color: color-mix(in srgb, var(--dc) 38%, transparent); }
.hchip small { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
.hchip small::before { content: "·"; margin-right: 7px; opacity: .6; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dc, #8a8f98); flex: none; }
.ins { display: flex; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 12px; border-left: 4px solid var(--ic);
  background: color-mix(in srgb, var(--ic) 12%, transparent); }
.ins > ha-icon { --mdc-icon-size: 22px; color: var(--ic); flex: none; }
.ins .it { flex: 1; min-width: 0; display: grid; gap: 2px; }
.ins .it b { font-size: 14px; font-weight: 500; }
.ins .it small { font-size: 12px; color: var(--secondary-text-color); }
.ins .x { font: inherit; border: 0; background: transparent; color: var(--secondary-text-color); cursor: pointer; border-radius: 50%; width: 30px; height: 30px; display: grid; place-items: center; flex: none; }
.ins .x:hover { background: color-mix(in srgb, var(--primary-text-color) 10%, transparent); } .ins .x ha-icon { --mdc-icon-size: 18px; }
.hid.slim { display: flex; align-items: center; gap: 6px; margin: 0 4px; } .hid.slim ha-icon { --mdc-icon-size: 16px; }
.hid { font-size: 12px; color: var(--secondary-text-color); margin: 8px 2px 0; } .hid .lnk { font: inherit; border: 0; background: none; color: var(--primary-color); cursor: pointer; padding: 0; }
.ins.r { --ic: #db4437; } .ins.w { --ic: #f2a516; } .ins.i { --ic: #3d8be0; } .ins.o { --ic: #3fa660; }
.bch { display: flex; flex-wrap: wrap; gap: 8px; }
.lbl2 small { font-size: 11px; }
.mchips { display: flex; gap: 6px; flex-wrap: wrap; margin: -2px 0 10px; }
.chw { position: relative; }
.hsts { margin-top: 8px; display: grid; gap: 4px; font-size: 12.5px; color: var(--secondary-text-color); }
.hst { display: flex; flex-wrap: wrap; gap: 4px 14px; } .hst .n { min-width: 120px; color: var(--primary-text-color); } .hst b { font-weight: 600; color: var(--primary-text-color); }
.hst i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.tip { position: absolute; top: 4px; pointer-events: none; z-index: 2; font-size: 12px; padding: 6px 10px; border-radius: 8px; white-space: nowrap;
  background: var(--card-background-color); border: 1px solid var(--divider-color); box-shadow: 0 2px 8px rgba(0,0,0,.18); }
.tip b { font-weight: 600; } .tip > b { display: block; margin-bottom: 2px; }
.tip i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.sk { border-radius: 10px; background: linear-gradient(90deg, var(--secondary-background-color) 25%, color-mix(in srgb, var(--divider-color) 60%, var(--secondary-background-color)) 50%, var(--secondary-background-color) 75%);
  background-size: 200% 100%; animation: sk 1.3s linear infinite; }
@keyframes sk { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
.dtiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; align-items: stretch; }
.dt { display: flex; gap: 14px; align-items: flex-start; background: var(--ha-card-background, var(--card-background-color)); border-radius: var(--ha-card-border-radius, 18px); padding: 16px; box-shadow: var(--ha-card-box-shadow, none); border: 1px solid var(--ha-card-border-color, var(--pbd)); }
.dt .ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); }
.dt .b { min-width: 0; flex: 1; } .dt small { display: block; color: var(--secondary-text-color); font-size: 12.5px; }
.dt .b > b { display: block; font-size: 20px; font-weight: 500; margin: 1px 0 2px; } .dt .s { font-size: 13px; color: var(--secondary-text-color); }
.dt .s.sw { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; } .dt .vbtn { margin-top: 8px; }
.dstat { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px 32px; }
.dsr { display: flex; gap: 32px; } .dsr b { display: block; font-size: 22px; font-weight: 500; } .dsr small { color: var(--secondary-text-color); font-size: 12.5px; }
.mtgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 4px 24px; }
.mg { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); margin: 4px 0; }
.mr { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 6px 0; border-top: 1px solid var(--divider-color); }
.mr b { font-weight: 500; font-variant-numeric: tabular-nums; }
.mrow { margin-bottom: 14px; } .mh { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.mh > span { display: flex; align-items: center; gap: 8px; } .mh ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); } .mh b { margin-left: auto; font-weight: 500; }
.pbar { height: 8px; border-radius: 4px; background: var(--secondary-background-color); overflow: hidden; margin-bottom: 4px; }
.pbar i { display: block; height: 100%; border-radius: 4px; }
.msep { border-top: 1px solid var(--divider-color); padding-top: 8px; margin-top: 4px; }
.rtop { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.rtop .grow { flex: 1; }
.rseg { display: inline-flex; background: var(--secondary-background-color); border-radius: 10px; padding: 3px; gap: 2px; border: 1px solid var(--pbd); }
.rseg button { font: inherit; font-size: 13px; border: 0; background: none; color: var(--secondary-text-color); padding: 6px 12px; border-radius: 8px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.rseg button.a { background: var(--card-background-color); color: var(--primary-text-color); font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
.rseg ha-icon, .fchip ha-icon { --mdc-icon-size: 16px; }
.rfil { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
.fchip { font: inherit; font-size: 13px; cursor: pointer; display: inline-flex; gap: 5px; align-items: center; padding: 5px 12px; border-radius: 99px;
  border: 1px solid var(--pbd); background: var(--card-background-color); color: var(--primary-text-color); }
.fchip.dflt { border-color: color-mix(in srgb, var(--primary-color) 55%, var(--pbd)); }
.fchip.a { background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color)); border-color: var(--primary-color); color: var(--primary-color); }
.rsum { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 14px; }
.rs { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; background: var(--secondary-background-color); border: 1px solid var(--pbd); }
.rs .ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none;
  background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); --mdc-icon-size: 22px; }
.rs small { display: block; color: var(--secondary-text-color); font-size: 12px; }
.rs b { font-size: 19px; font-weight: 500; } .rs b span { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
.rgrid { display: grid; grid-template-columns: repeat(var(--rc, 3), minmax(0, 1fr)); gap: 12px; }
.rc { border-radius: 18px; padding: 14px; background: var(--secondary-background-color); border: 1px solid var(--pbd); min-width: 0; container-type: inline-size; }
@container (min-width: 330px) { .rc .rb { flex-direction: row; justify-content: space-around; } }
.rc:hover { border-color: color-mix(in srgb, var(--primary-color) 40%, transparent); }
.rh { display: flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0; }
.rh .ri { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; flex: none; background: var(--card-background-color); color: var(--secondary-text-color); --mdc-icon-size: 18px; }
.rh b { font-weight: 500; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rh .st { margin-left: auto; font-size: 12px; display: inline-flex; gap: 3px; align-items: center; padding: 2px 9px; border-radius: 99px; flex: none;
  background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); --mdc-icon-size: 14px; }
.rh .chev { color: var(--secondary-text-color); --mdc-icon-size: 18px; transition: transform .2s; flex: none; }
.rdlg { position: fixed; inset: 0; z-index: 10; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: 16px; }
.rsheet { width: min(640px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overscroll-behavior: contain; overflow: auto; background: var(--card-background-color); border-radius: 22px; padding: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, .35); cursor: default; }
.rsheet .rh { cursor: default; }
.rsheet .x { margin-left: 8px; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--pbd); background: var(--secondary-background-color); color: var(--primary-text-color); display: grid; place-items: center; cursor: pointer; padding: 0; flex: none; }
.rb { display: flex; flex-direction: column; gap: 8px; align-items: center; margin-top: 6px; }
.rc.open .rb { flex-direction: row; justify-content: space-around; flex-wrap: wrap; }
.ring { position: relative; width: 140px; height: 140px; flex: none; }
.ring svg { width: 100%; height: 100%; display: block; }
.ring .c { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.ring .c b { display: block; font-size: 28px; font-weight: 500; line-height: 1.1; }
.ring .c small { display: block; color: var(--secondary-text-color); font-size: 12px; }
.rctl { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.stp { display: flex; align-items: center; gap: 6px; justify-content: center; }
.stp .t { min-width: 70px; text-align: center; } .stp .t small { display: block; color: var(--secondary-text-color); font-size: 11px; } .stp .t b { font-size: 18px; font-weight: 500; }
.mp { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.mp .chip { margin: 0; }
.rmore { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
.rmore h4 { margin: 0 0 6px; font-size: 12px; font-weight: 500; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .04em; }
.rmore .f { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--divider-color); font-size: 13px; }
.rmore .f:first-of-type { border-top: 0; } .rmore .f b { font-weight: 500; }
.rcmp { display: grid; }
.crow { display: grid; grid-template-columns: 150px minmax(0, 1fr) 110px; gap: 14px; align-items: center; padding: 10px 0; border-top: 1px solid var(--divider-color); cursor: pointer; }
.crow.first { border-top: 0; }
.crow .n { display: flex; gap: 8px; align-items: center; font-weight: 500; min-width: 0; --mdc-icon-size: 18px; }
.crow .n ha-icon { color: var(--secondary-text-color); flex: none; }
.crow .v { text-align: right; } .crow .v b { font-weight: 500; font-size: 16px; } .crow .v small { color: var(--secondary-text-color); margin-left: 4px; }
.axis { position: relative; height: 26px; }
.axis:before { content: ""; position: absolute; left: 0; right: 0; top: 12px; height: 2px; background: var(--divider-color); }
.axis .zero { position: absolute; left: 50%; top: 2px; bottom: 2px; width: 2px; background: var(--secondary-text-color); opacity: .5; }
.axis .bar { position: absolute; top: 7px; height: 12px; border-radius: 6px; background: var(--c); }
.axis .dot { position: absolute; top: 4px; width: 18px; height: 18px; border-radius: 50%; background: var(--c); border: 3px solid var(--card-background-color); transform: translateX(-50%); }
.cscale { display: grid; grid-template-columns: 150px minmax(0, 1fr) 110px; gap: 14px; font-size: 11px; color: var(--secondary-text-color); padding-bottom: 4px; }
.cscale div:nth-child(2) { display: flex; justify-content: space-between; }
.cx { padding: 4px 0 8px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; border-top: 0; }
.cx .rspark { flex: 1; min-width: 220px; max-width: 360px; }
.lrow { display: flex; align-items: center; gap: 10px; }
.lrow .t2 { margin-left: auto; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.lcard { border-radius: 14px; padding: 8px 14px; background: var(--secondary-background-color); margin-bottom: 8px; }
@media (max-width: 640px) {
  .rgrid { grid-template-columns: minmax(0, 1fr); } .rmore { grid-template-columns: 1fr; }
  .rdlg { place-items: end center; padding: 0; } .rsheet { width: 100%; max-height: 90vh; max-height: 90dvh; border-radius: 22px 22px 0 0; padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
  .rc .rb { flex-direction: row; justify-content: space-around; } .ring { width: 118px; height: 118px; }
  .crow, .cscale { grid-template-columns: 96px minmax(0, 1fr) 66px; gap: 8px; } .crow .v small { display: none; }
  .rsum { grid-template-columns: 1fr 1fr; }
}
.rlegend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--secondary-text-color); margin: 10px 0 0; align-items: center; }
.rlegend span { display: inline-flex; gap: 4px; align-items: center; } .rlegend ha-icon { --mdc-icon-size: 14px; }
.tile .dv { --mdc-icon-size: 14px; }
.hot { cursor: pointer; }
.hot:hover polygon, .hot:hover circle { stroke: var(--primary-color); }
.info { --mdc-icon-size: 14px; vertical-align: -2px; color: var(--secondary-text-color); cursor: help; }
button:focus-visible, [role="button"]:focus-visible, .hot:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 8px; }
@media (max-width: 640px) {
  .panel { padding: 12px 12px 84px; }
  .tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; margin: 0; justify-content: space-around; overflow: visible;
    background: var(--card-background-color); border-top: 1px solid var(--divider-color); border-bottom: 0; padding-bottom: env(safe-area-inset-bottom, 0); }
  .tabbtn { flex: 1; flex-direction: column; gap: 2px; font-size: 11px; padding: 8px 2px 6px; border-bottom: 0; border-top: 2px solid transparent; position: relative; }
  .tabbtn.a { border-top-color: var(--primary-color); }
  .badge { position: absolute; top: 2px; left: 55%; }
  .hm { display: none; }
  .bar-top .vbtn { font-size: 0; padding: 6px 8px; gap: 0; }
  .brand h1 { font-size: 18px; }
  .bar-top { flex-wrap: wrap; row-gap: 8px; }
  .hchips { width: 100%; justify-content: flex-start; }
}
:host([narrow]) .menu { display: inline-flex; }
`;

let SHEET; // one constructable stylesheet shared by every card/panel instead of a <style> per render
export const sharedSheet = () => {
  if (SHEET === undefined) {
    try { SHEET = new CSSStyleSheet(); SHEET.replaceSync(CSS); } catch (e) { SHEET = null; }
  }
  return SHEET;
};

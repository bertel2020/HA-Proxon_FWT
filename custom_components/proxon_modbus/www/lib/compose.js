// Assembles ProxonFwtBase from its method groups (they share one prototype, as they did in the single file).
import { ProxonFwtBase } from "./base.js";
import { SectionsMethods } from "./sections.js";
import { HistoryDataMethods } from "./history-data.js";
import { HistorySectionsMethods } from "./history-sections.js";
import { ChartsMethods } from "./charts.js";
import { PanelSectionsMethods } from "./panel-sections.js";
import { HintsMethods } from "./hints.js";
import { InteractionMethods } from "./interaction.js";

function mixin(target, source) {
  for (const key of Object.getOwnPropertyNames(source.prototype)) {
    if (key !== "constructor") Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(source.prototype, key));
  }
  for (const key of Object.getOwnPropertyNames(source)) {
    if (!["length", "name", "prototype"].includes(key)) Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
  }
}

mixin(ProxonFwtBase, SectionsMethods);
mixin(ProxonFwtBase, HistoryDataMethods);
mixin(ProxonFwtBase, HistorySectionsMethods);
mixin(ProxonFwtBase, ChartsMethods);
mixin(ProxonFwtBase, PanelSectionsMethods);
mixin(ProxonFwtBase, HintsMethods);
mixin(ProxonFwtBase, InteractionMethods);

export { ProxonFwtBase };

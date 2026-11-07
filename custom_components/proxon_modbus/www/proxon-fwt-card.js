/*
 * Proxon FWT - dashboard card and side panel, shipped with the proxon_modbus
 * integration (one file, two custom elements):
 *
 *   custom:proxon-fwt-card   a card for any dashboard
 *   proxon-fwt-panel         the full-page side panel (sidebar entry "Proxon FWT")
 *
 * All entities are discovered automatically from the integration.
 */

import { TEXT } from "./lib/text.js";
import { ALL_SECTIONS } from "./lib/constants.js";
import { esc } from "./lib/constants.js";
import { ProxonFwtBase } from "./lib/compose.js";
import { ProxonFwtCard } from "./lib/card.js";
import { ProxonFwtPanel } from "./lib/panel.js";
import { ProxonFwtCardEditor } from "./lib/editor.js";

for (const [name, cls] of [["proxon-fwt-card", ProxonFwtCard], ["proxon-fwt-panel", ProxonFwtPanel], ["proxon-fwt-card-editor", ProxonFwtCardEditor]]) {
  if (!customElements.get(name)) customElements.define(name, cls);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "proxon-fwt-card")) {
  window.customCards.push({
    type: "proxon-fwt-card",
    name: "Proxon FWT",
    description: "Dashboard card for the Proxon FWT (Modbus) integration: operating mode, air paths, ventilation, heat pump, rooms.",
    preview: false,
    documentationURL: "https://github.com/bertel2020/HA-Proxon_FWT#dashboard-karte",
  });
}


export { ProxonFwtBase, ProxonFwtCard, ProxonFwtPanel, ProxonFwtCardEditor, ALL_SECTIONS, TEXT, esc };

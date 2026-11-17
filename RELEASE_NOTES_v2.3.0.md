# English

## 2.3.0 – 2026-11-17

**Changed**
- **Room thermostats (`climate`):** The mode now only reflects the room's PTC element: "Heat" while it is enabled, otherwise "Off". Changing it sets the room's PTC enable (like the switch). "Heat/Cool" is gone. The new action (`hvac_action`) shows "Heating" while the PTC element is running, otherwise "Idle" or "Off". **Automations** that test for the state `heat_cool` or a fixed state `heat` need adjusting.
- **Panel – history:** One shared range switch applies to history, heat pump runtime and energy (bars per hour, day or month; the running bar is marked and the legend shows when the data was loaded). The "yearly overview" card is gone, it is covered by the "1 year" range.
- **Panel – rooms:** The room ring can be dragged by its dot (also with the arrow keys), spans the room's settable range and no longer has an empty bottom. The room dialog is redesigned. Value chips are larger, the operating mode in the header is a chip, the key figures always show four tiles ("–" and the reason "no value" or "no source" when a value is missing), and the PTC row in the overview also names the enabled rooms.
- **Panel – updates:** New values only change the affected parts instead of rebuilding the whole page. The scroll position no longer jumps to the top.

**Fixed**
- **Panel – focus:** Restoring the focus after an update (for example after closing the room dialog) raised a JavaScript error (`CSS.escape`; the name `CSS` was the stylesheet text in the code), which aborted the update. Found by the new browser test.
- **Feedback after writing:** A second command shortly after the first (for example PTC on, then off) waited up to 10 seconds for the device's confirmation. The gap between two read-backs is now 1 second.

**Added**
- **Energy meter:** New optional setting `energy_entity` (integration options and dashboard editor). With a meter the energy card shows the measured consumption per hour, day or month from the long-term statistics (Wh, kWh and MWh) instead of an estimate from the mean power. Without a meter it stays an estimate.
- **Preferred stage can be set:** New select `select.…_preferred_fan_stage` (stage 1-4) and a stage selector in the panel. It sets the fan stage restored after the heat pump has run.
- New screenshots of the side panel (light and dark) in the README.
- `tests/browser/harness.html` and `tests/browser/smoke.py`: a test page for the panel with sample data and a browser test that also runs in CI.

# Deutsch

## 2.3.0 – 2026-11-17

**Geändert**
- **Raum-Thermostate (`climate`):** Die Betriebsart zeigt nur noch das PTC-Element des Raums: „Heizen“, solange es freigegeben ist, sonst „Aus“. Das Umschalten setzt die PTC-Freigabe des Raums (wie der Schalter). „Heizen/Kühlen“ entfällt. Die neue Aktion (`hvac_action`) zeigt „Heizt“, solange das PTC-Element läuft, sonst „Leerlauf“ bzw. „Aus“. **Automationen**, die auf den Zustand `heat_cool` oder auf einen festen Zustand `heat` prüfen, müssen angepasst werden.
- **Panel – Verlauf:** Ein gemeinsamer Zeitraum-Schalter gilt für Verlauf, Wärmepumpen-Laufzeit und Energie (Balken je Stunde, Tag oder Monat, der laufende Balken ist markiert, die Legende nennt den Stand der Daten). Die Karte „Jahresübersicht“ entfällt, sie geht im Zeitraum „1 Jahr“ auf.
- **Panel – Räume:** Der Ring im Raum lässt sich über den Punkt ziehen (auch per Pfeiltasten), umfasst den einstellbaren Bereich des Raums und hat keinen leeren Boden mehr. Das Raum-Popup ist neu gestaltet. Die Werte-Chips sind größer, die Betriebsart im Kopf ist ein Chip, die Kennzahlen zeigen immer vier Kacheln („–“ und der Grund „kein Wert“ oder „keine Quelle“ bei fehlendem Wert), und die PTC-Zeile in der Übersicht nennt auch die freigegebenen Räume.
- **Panel – Aktualisierung:** Neue Werte ändern nur noch die betroffenen Stellen, statt die ganze Oberfläche neu aufzubauen. Die Scroll-Position springt nicht mehr nach oben.

**Korrigiert**
- **Panel – Fokus:** Beim Wiederherstellen des Fokus nach einer Aktualisierung (zum Beispiel nach dem Schließen des Raum-Popups) trat ein JavaScript-Fehler auf (`CSS.escape`, der Name `CSS` war im Code der Stylesheet-Text). Das Panel hat dadurch die Aktualisierung abgebrochen. Gefunden vom neuen Browser-Test.
- **Rückmeldung nach dem Schreiben:** Ein zweiter Befehl kurz nach dem ersten (zum Beispiel PTC erst an, dann aus) wartete bis zu 10 Sekunden auf die Bestätigung des Geräts. Die Wartezeit zwischen zwei Rückmeldungen beträgt jetzt 1 Sekunde.

**Neu**
- **Energiezähler:** Neue optionale Einstellung `energy_entity` (Optionen der Integration und Dashboard-Editor). Mit einem Zähler zeigt die Energie-Karte den gemessenen Verbrauch je Stunde, Tag oder Monat aus der Langzeitstatistik (Wh, kWh und MWh) statt einer Schätzung aus der mittleren Leistung. Ohne Zähler bleibt es bei der Schätzung.
- **Wunschstufe einstellbar:** Neue Auswahl `select.…_preferred_fan_stage` (Stufe 1–4) und eine Stufenauswahl im Panel. Sie setzt die Lüfterstufe, die nach dem Wärmepumpenlauf wiederhergestellt wird.
- Neue Screenshots des Seitenpanels (hell und dunkel) in der README.
- `tests/browser/harness.html` und `tests/browser/smoke.py`: Testseite für das Panel mit Beispieldaten und ein Browser-Test, der auch in der CI läuft.

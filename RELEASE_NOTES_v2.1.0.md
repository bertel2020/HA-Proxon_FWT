# English

## 2.1.0 – 2026-11-02

**New**
- **Dashboard card `custom:proxon-fwt-card` and side panel "Proxon FWT":** shipped with the integration and loaded automatically. Operating mode, cross-flow heat exchanger diagram with all temperature probes (reverses in cooling mode), ventilation, heat pump, refrigerant circuit, status, rooms with heat map, key figures including the heat recovery rate, notice banners and a 24-hour history. Graphical card editor included.
- **Restore fan stage after heat pump:** new switch (off by default) that remembers the fan stage you chose while the heat pump idles and sets it back after each run. The unit otherwise leaves it raised.
- **Heat pump and filter statistics:** runtime and starts of the heat pump (today/total) and filter operating hours, counted by the integration and kept across restarts.
- **Rebuilt side panel:** four tabs (overview, rooms, history, diagnostics) with a system diagram that follows the unit's layout, a rooms page with ring gauges, target stepper, summary and card/compare/list views, a 30-day history with runtime and energy, a **yearly overview** per month and the project logo.
- **Device filter in days with forced-shutdown countdown:** age since the last change (default interval 180 days), the unit's change message starts a 21-day countdown to the forced shutdown with a Repairs entry, a **"Filter changed" button**, and an optional recirculation filter that is hidden unless enabled. New sensors "Device filter age" and "Days until forced shutdown".
- **Boost ventilation with timer:** new switch that goes to the highest level and restores the previous state automatically after the chosen duration (default 30 minutes; 15/30/60 in the panel, any value via the `proxon_modbus.start_boost` service), also without the panel and across restarts.
- **Heat recovery rate corrected:** calculated from the extract air after the heat exchanger, not shown while the summer bypass is open.
- **Setup:** asks for the outdoor-air side and has a names step for rooms and Home Assistant areas, with the current names as suggestions.
- **Blueprint "Night fan stage setback":** lower fan stage at night, normal in the morning.
- **Dashboard settings in the integration options:** outdoor side of the heat exchanger, own power sensor and own outdoor temperature sensor, applied to card and panel in every browser.
- **Blueprints:** CO₂-controlled intensive ventilation and maintenance/fault notification.
- **Mid-room temperature** is now enabled by default (existing installations may need to enable it once by hand).
- **Room → Home Assistant area:** the names step of the options lets you optionally assign each room to an area. The room's device is then placed in that area. Rooms without an area stay untouched (areas set by hand are never overwritten).
- **Skip rooms that are not installed:** an empty room name in the names step of the options leaves that room out — no device, no entities. This covers gaps in the room numbering (e.g. rooms 1–3 and 5 but no room 4); the registers are still read because the order determines the register address.
- **Orphaned room devices are removed:** when the room count is reduced in the options, the devices of rooms that are no longer configured disappear from Home Assistant on reload (only this integration's devices).
- **Change the connection later:** new reconfigure step (Settings → Devices & Services → Proxon FWT → ⋮ → **Reconfigure**): host, port, serial parameters, unit ID and even switching between TCP and RTU can be changed without deleting the integration. The form is prefilled with the current values and the connection is tested before saving. Entities and history are kept.
- **Diagnostics download:** Settings → Devices & Services → Proxon FWT → Download diagnostics (host/serial port redacted), including the blocks that failed in the last poll and the decoded data.
- **New diagnostic sensor "Last write error":** shows the most recent failed write (register, value, reason). Attributes: time and number of errors since startup. A command the device rejected is visible without reading the log.

**Improved**
- **Failures per register block:** if reading one register block fails (device briefly busy, block not present), only the entities depending on it become unavailable. The whole poll now only fails when no block answers at all (typically a lost connection). Previously a single read error made *all* entities unavailable.
- **Device page grouped better:** the technical refrigerant-circuit values (temperature before evaporator, evaporator, after preheater, before condenser, condenser, compressor, compressor speed) and the heat pump operating states (heating, cooling, continuous) are now under "Diagnostic". The entities stay enabled; error and filter messages and the normal temperatures stay under "Sensors". Note: diagnostic entities don't appear in auto-generated dashboards and area cards.
- **Icons added:** PTC element active (radiator, crossed out when off), heat pump heating (`mdi:heat-pump`), cooling (`mdi:snowflake`), continuous operation (`mdi:autorenew`), operating mode (full state) and the unlock flags ("… selectable") previously only had the default icon.
- **Switch renamed:** "Lüfter-Automatik (Eco Sommer/Winter)" is now just "Lüfter-Automatik" (English "Fan auto mode"). The restriction to Eco summer/winter is still documented in the README. Existing entity IDs are unchanged; new setups get `switch.<name>_fan_auto_mode`.

**Fixed**
- **Thermostat mode:** the `climate` entity always showed "Heat/Cool". It is now "Heat", and "Heat/Cool" only when "Cooling available on this unit" is on, the device has unlocked cooling (register 315, bit 8) and the cooling release (register 306) is on.
- **Settable temperature range:** instead of a fixed 18–24 °C the range follows the register list: room 1 (Wohnen) 18–30 °C directly, every other room its mid temperature (register 220+) ±3 °C in whole degrees, clamped to 18–30 °C. Without a plausible mid temperature 18–30 °C applies.
- **Minimum version:** Home Assistant **2026.9.0** instead of 2026.8.0 (the `modbus` unit API is available from that version). `modbus-connection[tmodbus]>=4.12.1` is now listed explicitly under `requirements` in `manifest.json`.

# Deutsch

## 2.1.0 – 2026-11-02

**Neu**
- **Dashboard-Karte `custom:proxon-fwt-card` und Seitenpanel „Proxon FWT“:** Werden mit der Integration ausgeliefert und automatisch geladen. Betriebsart, Anlagenschema mit Kreuzstrom-Wärmetauscher und allen Temperaturmesspunkten (kehrt im Kühlbetrieb um), Lüftung, Wärmepumpe, Kältekreis, Status, Räume mit Heatmap, Kennzahlen inkl. Rückwärmzahl, Hinweis-Banner und 24-Stunden-Verlauf. Mit grafischem Karten-Editor.
- **Lüfterstufe nach Wärmepumpe wiederherstellen:** neuer Schalter (standardmäßig aus), der die bei stehender Wärmepumpe gewählte Lüfterstufe merkt und nach jedem Lauf zurücksetzt. Die Anlage lässt sie sonst angehoben.
- **Statistiken zu Wärmepumpe und Filtern:** Laufzeit und Starts der Wärmepumpe (heute/gesamt) und Filter-Betriebsstunden, von der Integration gezählt und neustartfest.
- **Seitenpanel neu aufgebaut:** vier Reiter (Übersicht, Räume, Verlauf, Diagnose) mit einem Anlagenschema nach dem Aufbau des Geräts, einer Räume-Seite mit Ringanzeigen, Soll-Stepper, Zusammenfassung und Karten-/Vergleichs-/Listenansicht, einem 30-Tage-Verlauf mit Laufzeit und Energie, einer **Jahresübersicht** pro Monat und dem Projekt-Logo.
- **Gerätefilter in Tagen mit Zwangsabschaltungs-Countdown:** Alter seit dem letzten Wechsel (Standard-Intervall 180 Tage), die Wechselmeldung der Anlage startet einen 21-Tage-Countdown bis zur Zwangsabschaltung samt Reparaturen-Eintrag, ein **Button „Filter getauscht“** und ein optionaler Umluftfilter, der ohne Aktivierung ausgeblendet bleibt. Neue Sensoren „Alter Gerätefilter“ und „Tage bis Zwangsabschaltung“.
- **Stoßlüften mit Timer:** Neuer Schalter, der auf die höchste Stufe geht und nach der gewählten Dauer (Standard 30 Minuten; 15/30/60 im Panel, beliebig über den Dienst `proxon_modbus.start_boost`) automatisch den vorherigen Zustand wiederherstellt, auch ohne Panel und über Neustarts hinweg.
- **Rückwärmzahl korrigiert und als Sensor:** Berechnet aus der Abluft nach dem Wärmetauscher, bei offenem Sommerbypass leer. Neuer Sensor „Rückwärmzahl“ mit Langzeitstatistik.
- **Verlauf erweitert:** 1 Tag / 1 Woche / 1 Monat / 1 Jahr, Min/Max/Mittelwert (Leistung auch kWh), Vorzeitraum-Vergleich, Bypass-Phasen markiert, sofortige Tooltips an allen Diagrammen.
- **Diagnose neu gestaltet, Hinweise dort:** Status-Kacheln, Messwerte in voller Breite, Laufzeit und Starts; Hinweise stehen jetzt oben im Diagnose-Reiter und lassen sich 24 Stunden ausblenden.
- **Eigene CO₂-/Feuchtesensoren pro Raum:** im Namen-Schritt der Optionen wählbar, ersetzen die Eingänge der Anlage in Karte und Panel.
- **Einrichtung:** Fragt die Seite der Außenluft ab und hat einen Namen-Schritt für Räume und Home-Assistant-Bereiche, mit den aktuellen Namen als Vorschlag.
- **Blueprint „Nachtabsenkung der Lüfterstufe“:** nachts niedrigere Lüfterstufe, morgens wieder die normale.
- **Dashboard-Einstellungen in den Integrationsoptionen:** Außenseite des Wärmetauschers, eigener Leistungs- und Außentemperatursensor; gelten für Karte und Panel in jedem Browser.
- **Blueprints:** CO₂-gesteuerte Intensivlüftung sowie Benachrichtigung bei Wartung und Störung.
- **Mittentemperatur** ist jetzt standardmäßig aktiviert (bestehende Installationen müssen sie einmal von Hand aktivieren).
- **Raum → Home-Assistant-Bereich:** Im Namen-Schritt der Optionen lässt sich jedem Raum optional ein Bereich zuordnen. Das Raumgerät wird dann in diesen Bereich gelegt. Räume ohne Bereich bleiben unverändert (von Hand gesetzte Bereiche werden nie überschrieben).
- **Nicht verbaute Räume überspringen:** Ein leerer Raumname im Namen-Schritt der Optionen lässt diesen Raum aus — kein Gerät, keine Entities. So lassen sich Lücken in der Raumnummerierung abbilden (z. B. Raum 1–3 und 5, aber kein Raum 4); die Register werden weiter mitgelesen, weil die Reihenfolge die Registeradresse bestimmt.
- **Verwaiste Raumgeräte werden entfernt:** Wird die Raumanzahl in den Optionen verringert, verschwinden die Geräte der nicht mehr konfigurierten Räume beim Neuladen automatisch aus Home Assistant (nur Geräte dieser Integration).
- **Verbindung nachträglich ändern:** Neuer Reconfigure-Schritt (Einstellungen → Geräte & Dienste → Proxon FWT → ⋮ → **Neu konfigurieren**): Host, Port, serielle Parameter, Unit-ID und sogar der Wechsel zwischen TCP und RTU lassen sich ändern, ohne die Integration zu löschen. Das Formular ist mit den aktuellen Werten vorbelegt, die Verbindung wird vor dem Speichern getestet. Entities und Verlauf bleiben erhalten.
- **Diagnose-Download:** Unter Einstellungen → Geräte & Dienste → Proxon FWT → Diagnose herunterladen (Host/serielle Schnittstelle geschwärzt), inklusive der zuletzt fehlgeschlagenen Blöcke und der dekodierten Daten.
- **Neuer Diagnose-Sensor „Letzter Schreibfehler“:** Zeigt das zuletzt fehlgeschlagene Schreiben (Register, Wert, Grund). Attribute: Zeitpunkt und Anzahl der Fehler seit dem Start. So ist ein vom Gerät abgelehnter Befehl sichtbar, ohne ins Log zu schauen.

**Verbessert**
- **Ausfall pro Registerblock:** Schlägt das Lesen eines Registerblocks fehl (Gerät kurz beschäftigt, Block nicht vorhanden), werden nur die davon abhängigen Entities „nicht verfügbar“. Das gesamte Abfragen scheitert nur noch, wenn kein einziger Block antwortet (typisch: Verbindung weg). Bisher machte ein einzelner Lesefehler *alle* Entities nicht verfügbar.
- **Geräteseite besser gruppiert:** Die technischen Kältekreis-Werte (Temperatur vor Verdampfer, Verdampfer, nach Vorwärme, vor Kondensator, Kondensator, Kompressor, Drehzahl Kompressor) und die Wärmepumpen-Betriebszustände (Heiz-, Kühl-, Dauerbetrieb) stehen jetzt unter „Diagnose“. Die Entities bleiben aktiviert; Fehler-, Filter-Meldungen und die normalen Temperaturen bleiben unter „Sensoren“. Hinweis: Diagnose-Entities erscheinen nicht in automatisch erzeugten Dashboards und Bereichskarten.
- **Icons ergänzt:** PTC-Element aktiv (Heizkörper, durchgestrichen, wenn aus), Wärmepumpe Heizbetrieb (`mdi:heat-pump`), Kühlbetrieb (`mdi:snowflake`), Dauerbetrieb (`mdi:autorenew`), Betriebsart (vollständiger Zustand) und die Freischaltungs-Flags („… wählbar“) hatten bisher nur das Standard-Icon.
- **Schalter umbenannt:** „Lüfter-Automatik (Eco Sommer/Winter)“ heißt jetzt „Lüfter-Automatik“ (englisch „Fan auto mode“). Die Einschränkung auf Eco Sommer/Winter steht weiterhin in der README. Bestehende Entity-IDs bleiben unverändert; bei neuen Einrichtungen lautet sie `switch.<name>_lufter_automatik`.

**Korrigiert**
- **Thermostat-Betriebsart:** Die `climate`-Entity zeigte immer „Heizen/Kühlen“. Jetzt ist sie „Heizen“ und nur dann „Heizen/Kühlen“, wenn „Kühlen am Gerät verfügbar“ aktiv ist, das Gerät Kühlen freigeschaltet hat (Register 315, Bit 8) und die Kühlfreigabe (Register 306) an ist.
- **Einstellbarer Temperaturbereich:** Statt fest 18–24 °C gilt der Bereich laut Registerliste: Raum 1 (Wohnen) 18–30 °C direkt, alle anderen Räume ihre Mittentemperatur (Register 220+) ±3 °C in ganzen Grad, begrenzt auf 18–30 °C. Fehlt eine plausible Mittentemperatur, gilt 18–30 °C.
- **Mindestversion:** Home Assistant **2026.9.0** statt 2026.8.0 (ab dieser Version steht die `modbus`-Unit-API bereit). `modbus-connection[tmodbus]>=4.12.1` ist jetzt explizit in `manifest.json` unter `requirements` eingetragen.

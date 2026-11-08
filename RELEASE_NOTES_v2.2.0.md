# English

## 2.2.0 – 2026-11-08

**Changed**
- **Side panel header:** logo and title on the left, two quiet chips on the right: the heat pump state ("Heating", "Cooling", "Idle", with the duration next to it) and the operating mode. The chip turns red when the connection is lost. On phones the chips sit below the title.
- **Boost ventilation in the Operation card:** the quick actions card is gone from the panel. Boost ventilation now sits below operating mode and fan stage: three duration chips without text (the default from the options is outlined); while a boost runs it shows the end time and an "End" button. The card section `quick` stays valid and now shows boost ventilation only.
- **"All rooms ±1 °C" removed:** it was hardly needed and looked like a filter next to the filters.
- **Rooms as a dialog:** a room's details no longer expand inside the grid (which shifted everything) but open a dialog, a bottom sheet on phones, with Esc and focus handling.
- **Phone:** hint button below the text instead of beside it, room tiles without icon (with a colour stripe instead), history ranges as one equal-width row, the last key figure tile fills its row.
- **Hint badge** sits on the "Diagnostics" tab, where the hints are listed.
- **How the panel is served:** the files are modules below `/proxon_modbus/<version>/`, so the browser fetches them anew after every update. The card's old path stays as an alias; manually added resources keep working.
- **Capability flags (register 315)** are honoured on writes: fan stage, operating mode, fan auto mode and intensive ventilation are not written when the unit clearly refuses them. A clear message is shown.

**Fixed**
- **Panel:** room names and other texts are escaped; writes run one after the other, lock the controls and report failures as a Home Assistant notice; quick clicks on the setpoint stepper are no longer lost; the history cache is tied to the unit and data source (failures are retried after 15 s); integration options apply without a reload; power in kW/MW is converted; the CO₂ hint can be dismissed and does not come back after short gaps; the 7-day runtime has a tooltip; the room order follows the room number; the write error banner disappears after an hour.
- **Statistics:** runtime, starts and filter hours were practically never saved during operation. Now at most every 5 minutes and on unload.
- **PTC enable:** rooms switched in parallel overwrote each other (shared register). The writes are now serialised.
- **Boost ventilation:** no leftover timer after a failed setup; a partial failure at the start no longer leaves fan auto mode off; start and end lock each other; ending is retried at most five times; nothing is written back after an operating mode change; an intensive ventilation that was already on stays on. `start_boost` on another switch now explains that it only works for boost ventilation.
- **"Filter changed"** is no longer lost on restart.
- **Connection loss:** a poll on a dead connection took a multiple of the timeout; it now aborts after two connection errors.
- **Cleanup:** entities the integration no longer provides (fewer CO₂/humidity sensors, cooling or recirculation filter switched off) are removed from the registry, storage files are deleted when the integration is removed, the panel is no longer re-registered on option changes. Reconfigure keeps the title.
- **Home Assistant 2027.8:** the deprecations reported by HA 2026.10 are fixed (room devices via `via_device_id`, device lookup via `async_get_device_by_identifier`, `UnitOfRatio` for ppm).

**Internal**
- The frontend is split into ES modules under `www/lib/` (no build step).
- New tests: coordinator with small stubs, render tests for all panel tabs, and 26 integration tests against a real test Home Assistant (setup, entities, served files, control, boost after a restart, diagnostics, config, options and reconfigure flow). CI runs them in three jobs.

# Deutsch

## 2.2.0 – 2026-11-08

**Geändert**
- **Seitenpanel, Kopf:** Links Logo und Titel, rechts zwei ruhige Chips: der Zustand der Wärmepumpe („Heizt“, „Kühlt“, „Bereit“, mit der Dauer daneben) und die Betriebsart. Bei Verbindungsverlust wird der Chip rot. Auf dem Handy stehen die Chips unter dem Titel.
- **Stoßlüften in der Karte „Betrieb“:** Die Karte „Schnellaktionen“ ist im Panel entfallen. Stoßlüften steht jetzt unter Betriebsart und Lüfterstufe: drei Dauer-Chips ohne Text (der Standard aus den Optionen ist umrandet), während des Boosts das Ende und ein Knopf „Beenden“. Der Karten-Abschnitt `quick` bleibt gültig und zeigt nur noch Stoßlüften.
- **„Alle Räume ±1 °C“ entfernt:** Die Aktion war kaum nötig und sah neben den Filtern aus wie ein Filter.
- **Räume als Dialog:** Die Details eines Raums klappen nicht mehr im Raster auf (alles verschob sich), sondern öffnen einen Dialog, auf dem Handy als Bottom-Sheet, mit Esc und Fokusführung.
- **Handy:** Hinweis-Knopf unter dem Text statt daneben, Raum-Kacheln ohne Icon (dafür mit Farbstreifen), Zeiträume im Verlauf als gleich breite Zeile, letzte Kennzahl-Kachel füllt die Zeile.
- **Hinweis-Abzeichen** sitzt auf dem Reiter „Diagnose“, wo die Hinweise stehen.
- **Auslieferung des Panels:** Die Dateien liegen als Module unter `/proxon_modbus/<Version>/`, dadurch lädt der Browser sie nach jedem Update neu. Der alte Pfad der Karte bleibt als Alias erhalten, manuell eingetragene Ressourcen funktionieren weiter.
- **Fähigkeits-Flags (Register 315)** werden beim Schreiben beachtet: Lüfterstufe, Betriebsart, Lüfter-Automatik und Intensivlüftung werden nicht geschrieben, wenn das Gerät sie eindeutig ablehnt. Es kommt eine verständliche Meldung.

**Korrigiert**
- **Panel:** Raumnamen und andere Texte werden maskiert; Schreibaktionen laufen nacheinander, sperren die Bedienung und melden Fehler als HA-Hinweis; schnelle Klicks am Soll-Stepper gehen nicht mehr verloren; der Verlaufscache ist an Gerät und Datenquelle gebunden (Fehler werden nach 15 s erneut versucht); Integrationsoptionen gelten ohne Neuladen; Leistung in kW/MW wird umgerechnet; der CO₂-Hinweis lässt sich ausblenden und kommt nicht bei kurzen Aussetzern zurück; die 7-Tage-Laufzeit hat einen Tooltip; die Raumreihenfolge folgt der Raumnummer; das Schreibfehler-Banner verschwindet nach einer Stunde.
- **Statistik:** Laufzeit, Starts und Filterstunden wurden im Betrieb praktisch nie gespeichert. Jetzt höchstens alle 5 Minuten und beim Entladen.
- **PTC-Freigabe:** Parallel geschaltete Räume überschrieben sich gegenseitig (gemeinsames Register). Die Schaltvorgänge sind jetzt serialisiert.
- **Stoßlüften:** kein Timer-Rest mehr bei fehlgeschlagenem Setup; ein Teilfehler beim Start lässt die Lüfter-Automatik nicht mehr aus; Start und Ende sind gegeneinander gesperrt; das Beenden wird höchstens fünfmal wiederholt; nach einem Moduswechsel wird nichts zurückgeschrieben; eine schon vorher laufende Intensivlüftung bleibt an. `start_boost` auf einem anderen Schalter meldet verständlich, dass es nur für Stoßlüften gilt.
- **„Filter getauscht“** geht beim Neustart nicht mehr verloren.
- **Verbindungsabbruch:** Ein Abfragezyklus bei toter Verbindung dauerte ein Vielfaches des Timeouts; er bricht jetzt nach zwei Verbindungsfehlern ab.
- **Aufräumen:** Nicht mehr bereitgestellte Entities (weniger CO₂-/Feuchtesensoren, Kühlen oder Umluftfilter abgeschaltet) werden aus der Registry entfernt, Storage-Dateien beim Entfernen der Integration gelöscht, das Panel wird bei Optionsänderungen nicht mehr neu registriert. Beim Neukonfigurieren wird der Titel übernommen.
- **Home Assistant 2027.8:** Die von HA 2026.10 gemeldeten Veraltungen sind behoben (Raumgeräte per `via_device_id`, Geräte-Lookup über `async_get_device_by_identifier`, `UnitOfRatio` für ppm).

**Intern**
- Das Frontend ist in ES-Module unter `www/lib/` aufgeteilt (kein Build-Schritt).
- Neue Tests: Coordinator mit schlanken Stubs, Render-Tests für alle Panel-Tabs, und 26 Integrationstests gegen ein echtes Test-Home-Assistant (Setup, Entities, ausgelieferte Dateien, Steuerung, Boost nach Neustart, Diagnose, Config-, Options- und Reconfigure-Flow). Die CI führt sie in drei Jobs aus.

# Code-Review: HA-Proxon_FWT

Stand: 8. November 2026 (nach Umsetzung der Befunde und der Integrationstests)  
Schwerpunkt: Home-Assistant-Integration (`custom_components/proxon_modbus/`) und Seitenpanel (`www/`)

Der erste Review (Frontend) und ein zweiter Durchgang mit zwei unabhängigen Prüfern (Panel und Backend) haben
die unten genannten Befunde ergeben. Die meisten sind behoben, jeweils in einem eigenen Commit. Offen ist,
was in „Offene Punkte“ steht.

## Behoben

### Panel (Frontend)

| Befund | Behebung |
|---|---|
| Raumnamen aus der Geräteverwaltung landeten ungefiltert in HTML | Maskierung (`esc()`) an der Quelle; unbekannte Übersetzungsschlüssel (rohe Zustände), Select-Optionen in `data-v` und das Schreibfehler-Banner werden ebenfalls maskiert; Balken-Tooltips bauen Textknoten statt Markup |
| Filteralter-Text überschrieben (`f_age` doppelt) | eigener Schlüssel `f_age_text`; Test auf doppelte und fehlende Übersetzungsschlüssel |
| Integrationsoptionen erst nach Neuladen wirksam | Neuladen alle 60 s, Neu-Rendern nur bei echter Änderung |
| Verlaufscache nicht an Gerät und Datenquelle gebunden; Verlauf lud doppelt; Fehler wurden 5 min gecacht | Cache-Scope aus Gerät, Leistungs-/Außensensor und Außenseite; Historie wartet auf die Optionen; Fehler werden nach 15 s erneut versucht; veraltete Antworten werden verworfen |
| Schreibaktionen ohne Reihenfolge und Rückmeldung | sequenziell, Bedienelemente während der Aktion gesperrt, Fehler als HA-Hinweis |
| Stepper verlor schnelle Klicks | Klicks summieren sich auf einen Zielwert, der einmal geschrieben wird |
| Aufklappende Raumkarten verschoben das Raster | Details als Dialog (Bottom-Sheet auf dem Handy) mit Esc, Fokusführung und erhaltener Scrollposition |
| 7-Tage-Wärmepumpenlaufzeit ohne Tooltip | Hit-Flächen und Tooltip ergänzt |
| CO₂-Hinweis ließ sich nicht ausblenden; ausgeblendete Hinweise kamen bei kurzen Aussetzern zurück | stabiler Schlüssel, 30 min Karenz |
| Leistung fest als W angenommen | kW/MW werden normalisiert (Anzeige, Verlauf, Energie) |
| Schreibfehler-Banner verschwand nie | nur eine Stunde lang sichtbar |
| Raumreihenfolge folgte der Registry | Sortierung nach Raumnummer aus dem Device-Identifier |
| Komplett-Rendering und Discovery bei jedem `hass`-Update | Discovery wird bis zur nächsten Registry-Änderung wiederverwendet, CSS als `adoptedStyleSheet` |
| 2.400-Zeilen-Einzeldatei | ES-Module unter `www/lib/` (Texte, Styles, Konstanten, Basisklasse mit Methodengruppen, Karte, Panel, Editor); `www/` wird unter einem versionierten Pfad ausgeliefert, das erledigt das Cache-Busting aller Module |
| Header mit drei gleichrangigen Aussagen in einer Zeile | Titel links, Status (Wärmepumpe mit Dauer) und Betriebsart als zwei Chips rechts |
| Schnellaktionen-Karte mit textlastigen Dauer-Knöpfen und kaum genutzten „Alle Räume ±1 °C“ | Stoßlüften sitzt in der Karte „Betrieb“, die Dauer-Chips tragen keinen Text (Standard nur per Rahmen und Tooltip); Karten-Abschnitt `quick` bleibt gültig und zeigt nur Stoßlüften; die Alle-Räume-Aktion ist entfernt |
| Handy: Hinweis-Knopf presste den Text, Raum-Kacheln brachen um, Zeitraum-Knöpfe liefen über, letzte Kennzahl allein | Knopf unter dem Text, Kacheln ohne Icon mit Farbstreifen, Zeiträume als gleich breite Zeile, letzte Kachel füllt die Zeile |
| Hinweis-Abzeichen stand auf einem anderen Tab als die Hinweise | Abzeichen sitzt auf „Diagnose“, wo die Hinweise stehen |

### Backend

| Befund | Behebung |
|---|---|
| Statistik wurde im Betrieb praktisch nie gespeichert (`async_delay_save` setzt den Timer bei jedem Poll zurück) | Speichern höchstens alle 5 min und beim Entladen |
| PTC-Freigabe: parallele Schaltvorgänge überschrieben sich | Lock und lokal gemerkte Maske |
| Boost: Timer leckte bei fehlgeschlagenem Setup; Teilfehler ließ die Automatik aus; Start/Ende ohne Lock; Wiederholung unbegrenzt; Intensivlüftung wurde nach dem Boost abgeschaltet | Cancel-Hook vor dem Laden, Rückschalten der Automatik, Lock, höchstens 5 Wiederholungen, kein Zurückschreiben nach Moduswechsel, vorheriger Intensivzustand bleibt |
| `ProxonModbusError` erbte von `Exception` (Tracebacks statt Meldung) | erbt von `HomeAssistantError` |
| `start_boost` stürzte auf anderen Switches ab | verständliche `ServiceValidationError` |
| „Filter gewechselt“ ging nach Neustart verloren | wird gespeichert |
| Poll bei toter Verbindung dauerte ein Vielfaches des Timeouts | Abbruch nach zwei Verbindungsfehlern, solange kein Block geantwortet hat |
| Fähigkeits-Flags (Register 315) wurden beim Schreiben ignoriert | Lüfterstufe, Betriebsart, Automatik und Intensivlüftung werden bei eindeutiger Ablehnung durch das Gerät nicht geschrieben |
| Verwaiste Entities, Storage-Dateien, Panel bei jeder Optionsänderung neu registriert | Bereinigung nach dem Setup, `async_remove_entry`, Panel bleibt registriert |
| Kleinkram | ungenutzte Konstante und doppelte Imports entfernt, Reconfigure übernimmt den Titel; ungenutzte lokale Variablen im Frontend entfernt |
| Von Home Assistant 2026.10 gemeldete Veraltungen (entfallen mit 2027.8): `via_device`, `device_registry.async_get_device`, `CONCENTRATION_PARTS_PER_MILLION` | Raumgeräte werden per `via_device_id` an das vorab angelegte Zentralgerät gehängt, Lookups über `async_get_device_by_identifier`, `UnitOfRatio.PARTS_PER_MILLION`; die neuen APIs gibt es schon in 2026.9.0 (Mindestversion) |

## Offene Punkte

- **Test in der eigenen HA-Instanz steht aus.** Setup, Entities, Panel-Registrierung, ausgelieferte Frontend-Dateien,
  Schreibpfade und Flows laufen jetzt in den Integrationstests gegen ein echtes (Test-)Home-Assistant, aber mit einem
  simulierten Gerät. Offen sind das Verhalten im echten Browser (Dialog, Stepper, Sperren während des Schreibens),
  die Raumreihenfolge (setzt voraus, dass `hass.devices` die `identifiers` liefert) und das Gerät selbst. Das dunkle
  Theme wurde in einem lokalen Browser mit den üblichen HA-Dark-Werten in allen Tabs gesehen, nicht in HA selbst.
- **Aktuelle Screenshots** für Desktop, Mobil, helles und dunkles Theme fehlen; `docs/` zeigt eine ältere Ansicht.
- **Rendering:** das Panel baut bei jeder relevanten Zustandsänderung die ganze Ansicht neu auf. Die Signatur deckt
  alle Entities der Ansicht ab; eine Signatur pro Tab würde nur die Entity-Liste einschränken. Das spart wenig
  (das Rendern selbst ist günstig), birgt aber das Risiko veralteter Anzeigen, sobald eine Abhängigkeit fehlt.
  Deshalb bewusst nicht umgesetzt.

## Tests und Prüfung

| Prüfung | Ergebnis |
|---|---|
| `python3 -m pytest -q tests` (ohne Home Assistant) | 44 Tests bestanden: Logik, Konstanten, Übersetzungen und der Coordinator (Boost, PTC-Maske, Statistik-Speicherung, Verbindungsabbruch, Flags) mit schlanken HA-Stubs |
| `python -m pytest -q tests` (Python 3.14, Home Assistant 2026.10.4 mit `pytest-homeassistant-custom-component`) | 61 Tests bestanden, davon 26 Integrationstests: Setup und Entladen, Geräte und Entities, `via_device_id`, Panel und Kartenmodul, Auslieferung der Dateien unter dem versionierten Pfad, WebSocket-Einstellungen, Statistik und Panel bei Reload und Entfernen, Neuversuch bei unerreichbarem Gerät, Entfernen verwaister Entities, Climate/PTC/Selects/Boost mit Flags und Schreibfehlern, Boost nach Neustart, Diagnose-Download, Config-Flow (TCP und seriell), Reconfigure, Options-Flow |
| Mutationsprüfung der Integrationstests | ohne Flag-Prüfung im Select, ohne `async_remove_panel`, ohne Übernahme des Boosts nach dem Neustart bzw. ohne Schwärzen der Adresse in der Diagnose schlagen die jeweils zuständigen Tests fehl |
| `node --test tests/panel.test.mjs tests/panel-render.test.mjs` | 22 Tests bestanden: Übersetzungsschlüssel, Escaping, Cache-Scope, Schreibaktionen, Stepper, Dialog, Discovery, Raumreihenfolge, Rendering aller Tabs und Ansichten |
| Render-Snapshot vor und nach der Modulaufteilung | 13 Renderings (alle Tabs, Raumansichten, Historienzeiträume, Dialog, Karte de/en) byte-identisch |
| Mutationsprüfung der Coordinator-Tests | Lock, Speicher-Drosselung, früher Abbruch und Intensiv-Vorzustand: jeweils ein Test schlägt bei Entfernen der Korrektur fehl |
| Modulgraph im Browser | lädt ohne Fehler, drei Elemente registriert, `adoptedStyleSheets` aktiv |

## Gesamtbewertung

| Bereich | Einschätzung |
|---|---|
| Codequalität | Python-Struktur sinnvoll getrennt; das Frontend ist jetzt in Module mit klaren Verantwortlichkeiten aufgeteilt, die Basisklasse bleibt aber groß (Methodengruppen teilen sich einen Prototyp). |
| Sicherheit | Variable Texte werden an den bekannten Stellen maskiert; der Rest hängt daran, dass neue Stellen `esc()` nutzen. Das Panel ist weiterhin für Nicht-Admins sichtbar (`require_admin=False`), die Dienste ohnehin. |
| Zuverlässigkeit | Schreibpfade (PTC, Boost, Statistik) sind serialisiert und fehlertolerant; Wiederholungen sind begrenzt. |
| Usability | Ruhiges Raster, Dialog für Details, Rückmeldung bei Fehlern, gesperrte Bedienung während Schreibaktionen. |
| Testbarkeit | Reine Logik, Coordinator, Entities, Services, Flows und Frontend sind getestet; die Integrationstests laufen in der CI mit einem aktuellen Home Assistant und melden so Veraltungen früh. |

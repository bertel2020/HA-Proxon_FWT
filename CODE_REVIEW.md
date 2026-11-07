# Code-Review: HA-Proxon_FWT

Stand: 7. November 2026 (nach Umsetzung der Befunde)  
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
| Kleinkram | ungenutzte Konstante und doppelte Imports entfernt, Reconfigure übernimmt den Titel |

## Offene Punkte

- **Echter Test in Home Assistant steht aus.** Alles Backend-Verhalten ist nur gegen Stubs getestet, das Panel
  nur gegen eine synthetische `hass`-Struktur und einmal in einem lokalen Browser (Module laden, Elemente
  registriert, Styles greifen, Raumname maskiert). Dialog, Stepper, Flags, Entity-Bereinigung, Statistik-Speicher
  und die Raumreihenfolge (setzt voraus, dass `hass.devices` die `identifiers` liefert) sollten einmal in der
  laufenden Instanz geprüft werden.
- **Aktuelle Screenshots** für Desktop, Mobil, helles und dunkles Theme fehlen; `docs/` zeigt eine ältere Ansicht.
- **Rendering:** das Panel baut bei jeder relevanten Zustandsänderung die ganze Ansicht neu auf. Eine Signatur
  pro Tab würde das reduzieren, setzt aber eine genaue Zuordnung von Entities zu Tabs voraus und wurde
  bewusst nicht umgesetzt.
- **Integrationstests mit `pytest-homeassistant-custom-component`** fehlen weiterhin (das Paket verlangt eine
  neuere Python-Version als die lokale Entwicklungsumgebung). Entities, Config-/Options-Flow, Services und die
  WebSocket-Befehle sind ungetestet.
- Einzelne ungenutzte lokale Variablen im Frontend (`lang`, `hv`, `iv0`, `powerId`), nur Aufräumarbeit.

## Tests und Prüfung

| Prüfung | Ergebnis |
|---|---|
| `python3 -m pytest -q` | 44 Tests bestanden: Logik, Konstanten, Übersetzungen und der Coordinator (Boost, PTC-Maske, Statistik-Speicherung, Verbindungsabbruch, Flags) mit schlanken HA-Stubs |
| `node --test tests/panel.test.mjs tests/panel-render.test.mjs` | 20 Tests bestanden: Übersetzungsschlüssel, Escaping, Cache-Scope, Schreibaktionen, Stepper, Dialog, Discovery, Raumreihenfolge, Rendering aller Tabs und Ansichten |
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
| Testbarkeit | Reine Logik, Coordinator (gestubbt) und Frontend sind getestet; Entities und Flows nicht. |

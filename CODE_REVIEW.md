# Code-Review: HA-Proxon_FWT

Stand: 7. November 2026  
Schwerpunkt: Home-Assistant-Integration und Seitenpanel (`custom_components/proxon_modbus/www/proxon-fwt-card.js`)

## Kurzfazit

Das Python-Backend ist sinnvoll in Modbus-Zugriff, Koordinator, Entitäten und reine Logik getrennt. Das Panel bietet viele nützliche Ansichten und eine erkennbare Gestaltung für helle und dunkle Themes. Die größten Risiken liegen im Frontend: ungefilterte HTML-Ausgaben, veraltete Einstellungen und nicht gerätegebundene Verlaufscaches. Die über 2.200 Zeilen lange JavaScript-Datei erschwert Wartung und Prüfung.

## Befunde nach Priorität

### Hoch: Variable Texte werden ungefiltert als HTML eingesetzt

Raumnamen aus der Geräteverwaltung gelangen unmittelbar in HTML-Templates, etwa in den Raumansichten (`proxon-fwt-card.js`, Zeilen 2114–2138) und im CO₂-Hinweis (um Zeile 1669). Danach schreibt `_render()` das Ergebnis mit `shadowRoot.innerHTML` (Zeile 2204). Auch Tooltip-Inhalte werden mit `innerHTML` gesetzt (Zeilen 1536 und 1570). Ein entsprechend präparierter Name kann Markup einschleusen. Da das Panel mit `require_admin=False` registriert ist (`__init__.py`, Zeile 143), ist die Ausgabe auch für andere angemeldete Nutzer relevant.

**Empfehlung:** Variable Texte vor der Verwendung im Template kontextgerecht maskieren; für dynamische Tooltip-Texte nach Möglichkeit `textContent` verwenden. Text- und Attributkontexte getrennt behandeln.

### Mittel: Geänderte Integrationsoptionen erscheinen erst nach Neuladen

`_loadSettings()` lädt die Optionen nur beim ersten Auftreten einer zentralen Geräte-ID (`proxon-fwt-card.js`, Zeilen 566–625). Eine Änderung von `outdoor_side`, `power_entity`, `outdoor_entity`, Raum-Sensorzuordnungen oder Filteroptionen aktualisiert ein bereits geöffnetes Panel nicht zuverlässig.

**Empfehlung:** Einstellungen bei einem passenden Config-Entry-/Registry-Ereignis erneut laden oder mit einem begrenzten Ablaufdatum versehen. Nach einer Änderung die davon abhängigen Verlaufsdaten invalidieren.

### Mittel: Verlaufscache ist nicht an Gerät und Entity-IDs gebunden

Die Cache-Schlüssel für Messreihen enthalten Zeitraum und Messgröße, aber keine Geräte- oder Entity-ID (`proxon-fwt-card.js`, Zeile 1417); für Laufzeit und Jahreswerte sind sie noch allgemeiner (`run`, `year`). Wenn eine Dashboard-Karte auf eine andere Anlage umgestellt wird, können bis zum Cache-Ablauf Daten der vorherigen Anlage angezeigt werden. Auch geänderte externe Sensoren sind betroffen.

**Empfehlung:** Geräte- und Entity-IDs in die Cache-Schlüssel aufnehmen oder den Cache beim Wechsel der Datenquelle leeren.

### Mittel: Schreibaktionen werden nicht durchgängig geordnet und quittiert

Bei Wahl einer Lüfterstufe werden `select.select_option` und gegebenenfalls `switch.turn_off` für die Automatik direkt nacheinander ausgelöst, ohne die Promises abzuwarten (`proxon-fwt-card.js`, Zeilen 1880–1882). Auch die Sammelaktion für alle Räume sendet mehrere Schreibaufrufe ohne Rückmeldung (Zeilen 1910–1914). Ein Fehler ist für die bedienende Person nicht unmittelbar sichtbar.

**Empfehlung:** Abhängige Aktionen sequenziell ausführen, Fehler abfangen und im Panel anzeigen. Während einer laufenden Aktion betroffene Bedienelemente vorübergehend sperren.

### Mittel: Filteralter-Text ist in beiden Sprachen doppelt definiert

`f_age` kommt in Deutsch und Englisch jeweils zweimal im `TEXT`-Objekt vor (`proxon-fwt-card.js`, Zeilen 66–67 und 139–140). Der spätere Eintrag („Alter“/„Age“) überschreibt den Text mit Platzhaltern. Die Verwendungen in der Diagnose und Wartung (Zeilen 1814 und 1847) zeigen daher nicht „Tag X von Y …“.

**Empfehlung:** Für Beschriftung und Satz unterschiedliche Schlüssel verwenden und Übersetzungsschlüssel auf Duplikate prüfen.

## Gesamtbewertung

| Bereich | Einschätzung |
|---|---|
| Codequalität | Solide Python-Struktur und verständliche Kernlogik; das Frontend ist für eine einzelne Datei zu groß und enthält Rendering, CSS, Übersetzungen, Datenabfragen und Aktionen zugleich. |
| Sicherheit | Kein offensichtlicher Umgang mit Zugangsdaten im Panel; die ungefilterten HTML-Ausgaben sind jedoch ein konkretes Sicherheitsproblem. |
| Konsistenz | Entitäten werden überwiegend über Registry-Merkmale statt feste IDs gefunden. Doppelte Übersetzungsschlüssel und nicht vollständig aktualisierte Optionen stören die Konsistenz. |
| Logik | Boost, Statistik und Lüfter-Rückstellung sind als reine Logik testbar. Im Panel brauchen Cache- und Schreibabläufe mehr Absicherung. |
| Usability | Vier Reiter, Raumfilter, Schnellaktionen und Diagramme decken typische Aufgaben gut ab. Fehlerrückmeldungen und Ladezustände bei Aktionen fehlen. |
| Look & Feel | Die vorhandenen Bilder zeigen eine klare Hierarchie und gute Hell/Dunkel-Anpassung; `prefers-reduced-motion` wird berücksichtigt. Die Bilder zeigen jedoch eine ältere Panel-Ansicht und belegen nicht das aktuelle Rendering. |

## Prüfung und Grenzen

- `python3 -m pytest -q`: **33 Tests bestanden**. Die Tests decken vor allem reine Python-Logik ab; automatisierte Panel-Tests fehlen.
- `node --check custom_components/proxon_modbus/www/proxon-fwt-card.js`: **bestanden**.
- Python-Kompilierung mit `PYTHONPYCACHEPREFIX` außerhalb des Repositorys: **bestanden**.
- Keine laufende Home-Assistant-Instanz für einen aktuellen Browser- und Mobiltest verfügbar. Die Bilder unter `docs/` zeigen nicht die aktuelle Implementierung mit vier Reitern.
- Dieser Review hat keine Implementierungsdateien verändert.

## Empfohlene Reihenfolge

1. HTML-Ausgaben absichern und den `f_age`-Fehler beheben.
2. Einstellungsaktualisierung und Cache-Invalidierung korrigieren.
3. Schreibaktionen geordnet ausführen und Fehler im Panel sichtbar machen.
4. Frontend in kleinere Module aufteilen und gezielte Tests für Discovery, Rendering, Interaktion und Cache-Verhalten ergänzen.
5. Aktuelle Screenshots für Desktop, Mobil, helles und dunkles Theme erstellen und Bedienbarkeit in einer laufenden HA-Instanz prüfen.

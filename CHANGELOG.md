# Änderungsprotokoll

*[🇬🇧 English version](CHANGELOG.en.md)*

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.
Versionen folgen dem Feld `version` in
`custom_components/proxon_modbus/manifest.json`.

## 1.2.1 – 2026-09-05

- **Neue Option "Kühlen am Gerät verfügbar"** (Ersteinrichtung und Options-Flow, Standard: Ja) als Hauptschalter für alle Kühl-Entities:
  - **Ja (Standard):** `switch.cooling_enable` und `binary_sensor.heat_pump_cooling` werden wie gewohnt angelegt; ihre Verfügbarkeit richtet sich weiterhin live nach dem Kühlfähigkeits-Bit aus Register 315 (Bit 8) — unverändert zum bisherigen Verhalten.
  - **Nein:** `switch.cooling_enable`, `binary_sensor.heat_pump_cooling` und `binary_sensor.cooling_available` werden gar nicht erst angelegt, statt nur "nicht verfügbar" zu sein — für Anlagen, bei denen sich das Bit als unzuverlässig erwiesen hat.
- "Kompressor-Drehzahl" → "Drehzahl Kompressor" (passend zum Schema der Lüfterdrehzahlen); "Temperatur nach Vorwärmer" → "Temperatur nach Vorwärme"; "Wärmepumpe im Heiz-/Kühlbetrieb" → "Wärmepumpe Heiz-/Kühlbetrieb".
- CO₂-/Feuchte-Sensor-Standardnamen "CO2 1"/"Luftfeuchte 1" → "CO2-Sensor 1"/"Luftfeuchte-Sensor 1".
- Toten Übersetzungseintrag `cooling_enable_possible` entfernt (keine Entity nutzt ihn mehr seit `binary_sensor.cooling_available` eingeführt wurde).
- READMEs: vollständige Entity-Liste mit Friendly Name, Entity-ID und Beschreibung ergänzt, inklusive Erklärung, wie sich Entity-IDs aus Gerätename und Oberflächensprache ergeben.

## 1.2.0 – 2026-09-05

- **CO₂-/Feuchtesensoren können jetzt optional einem Raum zugeordnet werden.** In den Integrationsoptionen (Namen-Schritt) gibt es je Sensor ein Dropdown "Zentral (kein Raum)" oder einen der konfigurierten Räume — bei Zuordnung landet der Sensor auf dem Gerät dieses Raums statt auf dem zentralen Gerät. Ohne Zuordnung ändert sich nichts.
- Standard-Sensornamen "CO2 1" / "Luftfeuchte 1" heißen jetzt "CO2-Sensor 1" / "Luftfeuchte-Sensor 1".
- Temperatursensoren des zentralen Geräts einheitlich nach dem Schema "Temperatur *Ort*" benannt (z. B. "Temperatur Zuluft" statt "Zuluft-Temperatur").
- `binary_sensor`-Entities für Wärmepumpe im Heiz-/Kühl-/Dauerbetrieb zeigen jetzt "An"/"Aus" statt "In Betrieb"/"Außer Betrieb" (gleicher Grund wie der `ptc_active`-Fix in 1.1.1: die Geräteklasse `running` liest sich wie eine Verfügbarkeits- statt eine Ein/Aus-Aussage).
- Alle bisher standardmäßig deaktivierten Entities sind jetzt von Anfang an aktiviert (Kältemittelkreislauf-Temperaturen, Freischaltungs-Diagnose-Sensoren aus Register 315) — außer der Mittentemperatur je Raum, die weiterhin standardmäßig deaktiviert bleibt.

## 1.1.1 – 2026-09-05

- Bugfix: `binary_sensor.ptc_active` zeigte "Normal"/"Hot" statt "An"/"Aus", weil die Entity fälschlich die Home-Assistant-Geräteklasse `heat` nutzte (die für Temperatur-Warnschwellen gedacht ist, nicht für einen einfachen Ein/Aus-Zustand). Zeigt jetzt korrekt "An"/"Aus".

## 1.1.0 – 2026-09-05

- **Räume und Zentralfunktionen sind jetzt getrennte Geräte.** Es gibt weiterhin ein zentrales Gerät (Zu-/Ab-/Fortluft-Sensorik, Kühl-/Lüfter-Schalter, Lüfterstufe/Betriebsart), aber jeder Raum bekommt zusätzlich sein eigenes, mit dem zentralen Gerät verknüpftes Gerät (climate, PTC-Element-Zustand und -Freigabe, Mittentemperatur). Dadurch lassen sich die Entities eines Raums (z. B. der PTC-Zustand) viel leichter finden.
- **Neuer Sensor `binary_sensor.cooling_available`** (zentrales Gerät, standardmäßig aktiviert): zeigt direkt an, ob die Anlage laut Gerät (Register 315, Bit 8) überhaupt Kühlen unterstützt.
- Ist Kühlen laut diesem Bit nicht möglich, wird `switch.cooling_enable` **nicht verfügbar** (wie die bestehenden Lüfterstufen-/Automatik-Bedienelemente außerhalb ihrer Betriebsart), ebenso `binary_sensor.heat_pump_cooling`, da die Anlage diesen Zustand dann ohnehin nie melden kann.
- Terminologie: "Zusatzheizung" heißt jetzt durchgängig "PTC-Element".
- Interner Kommentar in `const.py`, der noch den Namen des Gateway-Herstellers zitierte, entfernt.

## 1.0.4 – 2026-09-05

- Terminologie korrigiert: "Proxon FWT" ist eine Frischluftwärmetechnik-
  Anlage (nicht "Wärmerückgewinnungs-/Wärmepumpen-Lüftungsanlage"), und das
  Gateway heißt "FWT Modbus-Gateway" (nicht "BusBridge Zimmermann"). Der
  Markenhinweis nennt jetzt nur noch "Proxon" als Marke.

## 1.0.3 – 2026-09-05

- Bugfix: Jeder Register-Zugriff (Verbindungstest im Config-Flow **und**
  normaler Betrieb) scheiterte mit `'float' object has no attribute
  'to_bytes'`. Ursache: Home Assistants `NumberSelector` liefert für die
  Felder "Port" und "Modbus-Teilnehmeradresse (Unit-ID)" einen `float`
  (z. B. `10.0`) statt eines `int`, und dieser Wert wurde nirgends
  explizit umgewandelt, bevor er bis zur PDU-Kodierung von pymodbus
  durchgereicht wurde. Jetzt werden Port und Unit-ID im Config-Flow und
  zusätzlich defensiv in `hub.py` (Port, Unit-ID, Baudrate, Datenbits,
  Stopbits) in `int` umgewandelt.

## 1.0.2 – 2026-09-05

- Der Config-Flow protokolliert jetzt den tatsächlichen Grund eines
  fehlgeschlagenen Verbindungstests (bisher nur bei wirklich unerwarteten
  Fehlern, nicht beim regulären "cannot_connect"-Fall) — sichtbar unter
  Einstellungen → System → Protokolle als "Proxon FWT connection test
  failed: ...".

## 1.0.1 – 2026-09-05

- Bugfix: Ein fehlgeschlagener Verbindungsaufbau zeigte im Config-Flow
  "Unerwarteter Fehler." statt einer verständlichen Meldung, weil `connect()`
  bei manchen pymodbus-/pyserial-Versionen eine Exception wirft statt sauber
  `False` zurückzugeben — das wurde nirgends abgefangen. Betraf auch einen
  Reconnect-Versuch mitten im laufenden Betrieb bei Lese-/Schreibzugriffen.

## 1.0.0 – 2026-09-05

Erstveröffentlichung.

- Config-Flow: Einrichtung per Modbus TCP oder Modbus RTU (USB-zu-Seriell),
  keine YAML-Konfiguration nötig.
- Options-Flow: Räume/externe Sensoren umbenennen, Raumanzahl (bis 16) und
  Abfrageintervall ändern, ohne die Integration neu einzurichten.
- `climate`-Entity pro Raum (Ist- und Solltemperatur).
- `sensor`-Entities für alle Messwerte auf Geräteebene (Luft-/
  Kältemittelkreislauf-Temperaturen, Kompressor-/Lüfterdrehzahlen,
  Leistungsaufnahme), Mittentemperatur je Raum, CO₂- und Feuchtesensoren,
  sowie ein diagnostischer Sensor für den vollständigen Betriebsart-Zustand.
- `binary_sensor`-Entities für Bypass-Zustand, Zusatzheizung (PTC) je Raum,
  System-/Filtermeldungen und Wärmepumpen-Betriebszustände.
- `switch`-Entities für globale Kühlfreigabe, Lüfter-Automatik,
  Intensivlüftung und Zusatzheizung (PTC) je Raum.
- `select`-Entities für Lüfterstufe und Betriebsart.
- Deutsche und englische Übersetzungen.
- Der Sollwert-Regler der Raum-`climate`-Entities ist auf 18–24 °C begrenzt.
- `select.fan_stage` und `switch.fan_auto` werden außerhalb von Eco
  Sommer/Winter nicht verfügbar, `switch.fan_intensive` außerhalb von
  Komfort — abgeglichen sowohl mit dem ursprünglichen Symcon-Dashboard als
  auch mit den bisherigen Home-Assistant-Automationen, die diese Integration
  ersetzt.
- Nach jedem Schreibvorgang wird jetzt `WRITE_SETTLE_DELAY` (2 s,
  `const.py`) gewartet, bevor die Bestätigung abgefragt wird — damit die
  Anlage einen Moment Zeit hat, den neuen Wert tatsächlich zu übernehmen,
  statt den Zustand von vor dem Schreiben zurückzulesen.
- Eigenständig gestaltetes Integrations-Icon (`brands/`), einreichungsfertig
  für das `home-assistant/brands`-Repository, damit es in der
  Home-Assistant-Oberfläche erscheint.
- README auf Deutsch (Standard, `README.md`) und Englisch (`README.en.md`)
  verfügbar, inklusive Haftungsausschluss und Copyright-/Lizenzhinweis.
- Der Config-Flow testet die Verbindung jetzt wirklich (verbinden und ein
  bekanntes Register lesen), bevor der Eintrag angelegt wird, statt erst
  danach stillschweigend zu scheitern; dabei auch einen Bug behoben, durch
  den Baudrate/Datenbits/Stopbits bei der RTU-Einrichtung als Text statt als
  Zahl gespeichert wurden.
- Schlägt der Verbindungsaufbau beim Start von Home Assistant fehl (Gerät
  gerade nicht erreichbar), löst die Integration jetzt `ConfigEntryNotReady`
  aus, damit Home Assistant automatisch mit Backoff erneut versucht, statt
  den Eintrag dauerhaft als fehlgeschlagen zu markieren.

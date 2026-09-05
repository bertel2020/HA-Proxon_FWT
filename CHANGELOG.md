# Änderungsprotokoll

*[🇬🇧 English version](CHANGELOG.en.md)*

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.
Versionen folgen dem Feld `version` in
`custom_components/proxon_modbus/manifest.json`.

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

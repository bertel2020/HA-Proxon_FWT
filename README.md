# Proxon FWT (Modbus) – Home-Assistant-Integration

*[🇬🇧 English version](README.en.md)*

<img src="https://raw.githubusercontent.com/bertel2020/HA-Proxon_FWT/main/brands/icon.png" alt="" width="64" height="64" align="left" style="margin-right: 12px">

Eine über die Oberfläche konfigurierbare Home-Assistant-Custom-Integration für die **Proxon FWT** Wärmerückgewinnungs-/Wärmepumpen-Lüftungsanlage, die per Modbus mit ihrem **BusBridge Zimmermann**-Gateway kommuniziert. Sie nutzt eine vollwertige Config-Entry-Integration: einen Config-Flow, einen gemeinsam genutzten `DataUpdateCoordinator` und typisierte Entities (`climate`, `sensor`, `binary_sensor`, `switch`, `select`) — im Sinne der [modernisierten Modbus-Architektur](https://developers.home-assistant.io/blog/2026/07/05/modernizing-modbus/) (Einrichtung über einen Config-Entry statt handgeschriebener YAML-Registerlisten, eine gemeinsame Verbindung pro Gerät, Plattformen auf Basis von Entity-Descriptions).

Beide Übertragungsarten werden unterstützt:
- **Modbus TCP** — das Gateway über das Netzwerk erreichbar (z.B. `192.168.x.x:502`).
- **Modbus RTU** — eine direkte USB-zu-Seriell-Verbindung (RS-485), z.B. `/dev/ttyUSB0`.

## Installation

### Über HACS (empfohlen)

[![HACS-Repository in My Home Assistant öffnen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=bertel2020&repository=HA-Proxon_FWT&category=integration)
[![Proxon FWT (Modbus) zu My Home Assistant hinzufügen](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=proxon_modbus)

1. Über den ersten Button das Proxon-FWT-Repository in HACS öffnen.
2. **Proxon FWT (Modbus)** herunterladen und Home Assistant neu starten.
3. Über den zweiten Button die Integration hinzufügen. Alternativ in Home
   Assistant **Einstellungen → Geräte & Dienste → Integration hinzufügen →
   Proxon FWT (Modbus)** öffnen.

Falls der erste Button nicht funktioniert, in HACS unter **Integrationen →
Benutzerdefinierte Repositories**
`https://github.com/bertel2020/HA-Proxon_FWT` als Kategorie **Integration**
eintragen.

### Manuell

Das Verzeichnis `custom_components/proxon_modbus` nach
`/config/custom_components/proxon_modbus` kopieren und Home Assistant neu
starten.

## Einrichtung

Einstellungen → Geräte & Dienste → Integration hinzufügen → **Proxon FWT (Modbus)**.

1. **Netzwerk (Modbus TCP)** oder **USB / RS-485 (Modbus RTU)** wählen.
   - TCP: Host/IP, Port (Standard `502`), Modbus-Unit-ID (Standard `10`).
   - RTU: serielle Schnittstelle, Baudrate (Standard `9600`), Datenbits (`8`), Parität (Standard `E`/Even), Stopbits (`1`), Modbus-Unit-ID.
2. Anzahl der Räume (1–16) und externen CO₂-/Feuchtesensoren (0–5) festlegen, für die Entities angelegt werden.
3. Danach über den **Konfigurieren**-Button (Optionen) der Integration Räume/Sensoren umbenennen oder Anzahl/Abfrageintervall ändern, ohne die Integration neu einzurichten.

## Entities

Es wird ein Gerät angelegt (standardmäßig "Proxon FWT") mit:

- **`climate.<raum>`** — eines pro Raum: aktuelle Temperatur (Register `150+n`), Solltemperatur (gelesen von `180+n`, geschrieben auf das separate, nur schreibbare Register `200+n`). Der Home-Assistant-Regler ist auf 18–24 °C begrenzt.
- **`sensor.*`** — Zu-/Ab-/Fort-/Frischlufttemperaturen, Kältemittelkreislauf-Temperaturen, Außentemperatur, Kompressor-Drehzahl, Leistungsaufnahme, Lüfterdrehzahlen, dazu ein diagnostischer "Betriebsart (vollständiger Zustand)"-Sensor, Mittentemperatur-Sensoren pro Raum (Raum 2–N, Rückmeldung vom Bedienteil) sowie alle konfigurierten CO₂-/Feuchtesensoren.
- **`binary_sensor.*`** — Bypass-Zustand, Zusatzheizung (PTC) aktiv je Raum, System-/Filtermeldungen, Wärmepumpe im Heiz-/Kühl-/Dauerbetrieb, sowie (standardmäßig deaktiviert, Diagnose) die "ist X gerade wählbar"-Freischaltungs-Flags aus Register 315.
- **`switch.*`** — globale Kühlfreigabe, Lüfter-Automatik (Eco Sommer/Winter), Intensivlüftung, sowie Zusatzheizung (PTC) je Raum.
- **`select.*`** — Lüfterstufe (Aus/1–4) und Betriebsart (Aus/Eco Sommer/Eco Winter/Komfort/Ofenbetrieb).

Drei Bedienelemente ergeben nur in bestimmten Betriebsarten Sinn und werden außerhalb davon **nicht verfügbar**:

| Entity | Nur verfügbar bei |
|---|---|
| `select.fan_stage` | Eco Sommer / Eco Winter |
| `switch.fan_auto` | Eco Sommer / Eco Winter |
| `switch.fan_intensive` | Komfort |

Eine "nicht verfügbare" Entity existiert weiterhin (damit Automationen, die darauf verweisen, beim Moduswechsel nicht kaputtgehen), nimmt aber keine Befehle an und wird im Dashboard üblicherweise ausgegraut dargestellt.

## Registerbelegung

Siehe [`custom_components/proxon_modbus/const.py`](custom_components/proxon_modbus/const.py) für die vollständige, kommentierte Adressliste. Wissenswert:

- **Zusatzheizung (PTC): Zustand, Freigabe je Raum und Freigabe-Rücklesung (Register 300/301/302) sind einzelne 16-Bit-Bitfelder**, ein Bit pro Raum (Bit *N* = Raum *N+1*), keine Register pro Raum. Da Register 301 nur schreibbar ist (keine eigene Rücklesung), liest das Umschalten der PTC-Freigabe eines Raums den aktuellen Zustand aus Register 302, kippt nur das Bit dieses Raums und schreibt die gesamte Maske zurück. Diese rekonstruierte Maske ist eine Momentaufnahme des letzten Abfragezyklus: Werden zwei Räume schneller als ein Abfragezyklus hintereinander umgeschaltet, könnten sie sich theoretisch gegenseitig überschreiben — für die manuelle Bedienung im Dashboard unkritisch, aber relevant, wenn mehrere Räume automatisiert gleichzeitig geschaltet werden.
- **Mittentemperatur (Register `220+n`, nur Raum 2–16)** hat keine dokumentierte Skalierung und wird analog zu allen anderen Temperaturregistern behandelt (vorzeichenbehaftet, ×0,1 °C); standardmäßig deaktiviert, da sie in der Praxis offenbar nicht genutzt wird.
- **Raum-Sollwerte (`200+n`) nehmen für jeden Raum einen einfachen absoluten Ganzzahl-Gradwert** entgegen, keinen Offset relativ zum physischen Bedienteil-Drehregler.
- **Drei Bedienelemente sind an die Betriebsart gekoppelt** — siehe Tabelle oben. Register 315 ("Freischaltungen") liefert dieselbe Information live vom Gerät und wird als diagnostische Freischaltungs-`binary_sensor`s bereitgestellt (standardmäßig deaktiviert), falls du lieber auf das Live-Signal statt auf die Modus-Nummer aufbauen willst.

## Wie Soll und Ist zusammenspielen

Fast jeder steuerbare Wert am Gerät hat **zwei getrennte Register**: ein nur schreibbares "Soll"-Register und ein nur lesbares "Ist"-Register, das zurückmeldet, was das Gerät tatsächlich übernommen hat (Raum-Sollwert 200+n / 180+n, Lüfterstufe 307/308, Lüfter-Automatik 309/310, Intensivlüftung 311/312, Kühlung 305/306, Betriebsart 313/314; die Zusatzheizung ist mit ihrem Bitfeld die oben beschriebene Ausnahme). Diese Integration folgt dabei immer demselben Muster:

1. **Jede Entity zeigt das "Ist"-Register an**, nie den gerade angeforderten Wert. `climate.target_temperature` liest Register `180+n`, `select.fan_stage.current_option` liest `308`, `switch.cooling_enable.is_on` liest `306`, und so weiter.
2. **Ein Befehl (`set_temperature`, `select_option`, `turn_on`/`turn_off`) schreibt nur das "Soll"-Register**, danach wird sofort `async_request_refresh()` des Coordinators aufgerufen — eine außerplanmäßige Abfrage aller Register, einschließlich des "Ist"-Registers, statt auf das nächste reguläre Intervall zu warten.
3. **Es gibt keinen optimistischen lokalen Zustand.** Die Entity zeigt weiterhin den vorherigen Wert, bis dieser Refresh bestätigt, dass das Gerät die Änderung tatsächlich übernommen hat (üblicherweise deutlich unter einer Sekunde, aber real). Schlägt der Schreibvorgang fehl (Verbindung weg, Gerät lehnt den Wert ab), zeigt die Entity einfach weiterhin den wahren, unbestätigten Zustand, statt einen Wert, den das Gerät nie erreicht hat.

Beispiel — den Thermostat eines Raums auf 21 °C ziehen: `climate.set_temperature(21)` → auf `21` runden → Register `200+raumindex` schreiben → Refresh anfordern → der Coordinator liest alle Register neu ein, einschließlich `180+raumindex` → sobald das Gerät bestätigt, zeigt `target_temperature` `21`. `current_temperature` ist davon unabhängig — sie kommt aus dem eigenen Sensor-Register des Raums (`150+raumindex`) und ändert sich nur, wenn der Raum sich tatsächlich erwärmt oder abkühlt.

## Migration von der alten YAML-Einrichtung

Der bisherige `modbus:`-Plattform-Block in der `configuration.yaml` wird nach der Einrichtung dieser Integration nicht mehr benötigt — entferne ihn, um doppeltes Abfragen desselben Geräts zu vermeiden. Entity-IDs ändern sich dabei (Raum-Sollwerte sind jetzt `climate`-Entities, andere Entities sind einem einzelnen Gerät zugeordnet), Dashboards und Automationen, die auf alte Entity-IDs verweisen, müssen entsprechend angepasst werden.

## Mitwirken

Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Änderungsprotokoll

Siehe [CHANGELOG.md](CHANGELOG.md).

## Haftungsausschluss

Dies ist eine unabhängige, community-entwickelte Integration. Sie steht in keiner Verbindung zu Proxon, Zimmermann oder anderen Herstellern der angesprochenen Hardware und wird von diesen weder unterstützt noch empfohlen. Die zugrunde liegende Registerbelegung wurde unabhängig ermittelt und kann für dein konkretes Gerät oder deine Firmware-Version unvollständig oder ungenau sein.

Diese Integration kann Werte auf echte Heizungs- und Lüftungshardware schreiben. Sie wird **"wie besehen", ohne jegliche Gewährleistung** bereitgestellt (siehe [LICENSE](LICENSE)) — die Nutzung erfolgt auf eigenes Risiko; überprüfe ihr Verhalten an deiner eigenen Anlage, bevor du dich darauf verlässt, und setze sie nicht in sicherheitskritischem Zusammenhang ein.

## Markenhinweis

„Proxon“, „BusBridge Zimmermann“ sowie alle sonstigen in diesem Repository genannten Produkt- und Firmennamen sind Marken oder eingetragene Marken ihrer jeweiligen Inhaber. Ihre Nennung dient ausschließlich der Beschreibung, mit welcher Hardware diese Integration kompatibel ist, und impliziert keine Zugehörigkeit, Empfehlung oder Unterstützung durch die jeweiligen Markeninhaber. „Home Assistant“ ist eine Marke der Open Home Foundation.

## Copyright & Lizenz

Copyright © 2026 bertel2020. Lizenziert unter der [MIT-Lizenz](LICENSE).

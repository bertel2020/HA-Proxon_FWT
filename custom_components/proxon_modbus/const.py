"""Constants for the Proxon FWT Modbus integration.

Register map reverse-engineered from:
- "Modbus Parameterbeschreibung - 24.10.13.xlsx" (gateway parameter documentation)
- Symcon/IP-Symcon PHP scripts controlling the same device
- The previously used `modbus:` YAML platform configuration

All registers are Modbus holding registers (function codes 3/6/16), addressed
as plain zero-based offsets (the "4x" prefix in the source doc is the classic
Modicon holding-register area marker and is not part of the wire address).
"""
from __future__ import annotations

DOMAIN = "proxon_modbus"

MANUFACTURER = "Proxon"
MODEL = "FWT - Frischluftwärmetechnik"

# --- Config flow keys -------------------------------------------------------

CONF_CONNECTION_TYPE = "connection_type"
CONNECTION_TYPE_TCP = "tcp"
CONNECTION_TYPE_SERIAL = "serial"

CONF_UNIT_ID = "unit_id"
CONF_SERIAL_PORT = "serial_port"
CONF_BAUDRATE = "baudrate"
CONF_BYTESIZE = "bytesize"
CONF_PARITY = "parity"
CONF_STOPBITS = "stopbits"

CONF_NUM_ROOMS = "num_rooms"
CONF_ROOM_NAMES = "room_names"
CONF_NUM_CO2_SENSORS = "num_co2_sensors"
CONF_NUM_RF_SENSORS = "num_rf_sensors"
CONF_CO2_NAMES = "co2_sensor_names"
CONF_RF_NAMES = "rf_sensor_names"
CONF_SCAN_INTERVAL = "scan_interval"

# --- Defaults ----------------------------------------------------------------

DEFAULT_NAME = "Proxon FWT"
DEFAULT_TCP_PORT = 502
DEFAULT_UNIT_ID = 10
DEFAULT_BAUDRATE = 9600
DEFAULT_BYTESIZE = 8
DEFAULT_PARITY = "E"
DEFAULT_STOPBITS = 1
DEFAULT_SCAN_INTERVAL = 30
DEFAULT_TIMEOUT = 5

# How long to wait after writing a "Soll" register before polling for
# confirmation - the device needs a moment to actually apply a new value,
# and polling immediately would just read back the pre-write "Ist" value.
# Starting value only; adjust after observing real settle time on the device.
WRITE_SETTLE_DELAY = 2

DEFAULT_NUM_ROOMS = 7
DEFAULT_NUM_CO2_SENSORS = 1
DEFAULT_NUM_RF_SENSORS = 1

MAX_ROOMS = 16
MAX_EXTERNAL_SENSORS = 5

# Room names as configured in the original installation (Tabelle2 of the
# parameter sheet). Rooms beyond this list default to "Raum N".
DEFAULT_ROOM_NAMES = [
    "Wohnen",
    "Diele",
    "Gast",
    "Schlafen",
    "Zimmer 1 (Ost)",
    "Zimmer 2 (West)",
    "Arbeiten",
]

ROOM_SETPOINT_MIN = 18
ROOM_SETPOINT_MAX = 24

# --- Register addresses -------------------------------------------------------

# Anlagendaten (device/system data), int16, scale 0.1 unless noted
REG_TEMP_SUPPLY_AIR = 100  # Zuluft
REG_TEMP_EXTRACT_AIR = 101  # Abluft
REG_TEMP_EXHAUST_AIR = 102  # Fortluft
REG_TEMP_FRESH_AIR = 103  # Frischluft
REG_TEMP_PRE_EVAPORATOR = 104  # vor Verdampfer
REG_TEMP_EVAPORATOR = 105  # Verdampfer
REG_TEMP_POST_PREHEAT = 106  # nach Vorwaerme
REG_TEMP_PRE_CONDENSER = 107  # vor Kondensator
REG_TEMP_CONDENSER = 108  # Kondensator
REG_TEMP_COMPRESSOR = 109  # Kompressor
REG_TEMP_OUTSIDE = 110  # Aussen
REG_COMPRESSOR_SPEED = 111  # rpm, no scale
REG_BYPASS_STATE = 112  # 0/1
REG_POWER_CONSUMPTION = 113  # W, scale 0.1
REG_FAN_SPEED_SUPPLY = 114  # rpm, no scale
REG_FAN_SPEED_EXTRACT = 115  # rpm, no scale

REG_DEVICE_DATA_BASE = REG_TEMP_SUPPLY_AIR
REG_DEVICE_DATA_COUNT = 16  # 100..115

# Bereich Daten der Räume (16 room slots, index 0-based = room 1..16)
REG_ROOM_TEMP_BASE = 150  # Istwert, int16, scale 0.1
REG_ROOM_SETPOINT_READ_BASE = 180  # Sollwert (device confirmed), int16, scale 0.1
REG_ROOM_SETPOINT_WRITE_BASE = 200  # Sollwert schreiben, plain integer degrees
REG_ROOM_MID_TEMP_BASE = 220  # Mittentemperatur Nebenraum, covers room index 1..15 (room 2..16)

# PTC element per-room bitfields, single 16-bit register, bit = room index
REG_PTC_STATE = 300  # aktueller Zustand (1 = aktiv)
REG_PTC_ENABLE_WRITE = 301  # Freigabe setzen
REG_PTC_ENABLE_READ = 302  # Freigabe lesen (source of truth for current enable state)

# Funktionelle Parameter
REG_COOLING_ENABLE_WRITE = 305
REG_COOLING_ENABLE_READ = 306
REG_FAN_STAGE_WRITE = 307
REG_FAN_STAGE_READ = 308
REG_FAN_AUTO_WRITE = 309
REG_FAN_AUTO_READ = 310
REG_FAN_INTENSIVE_WRITE = 311
REG_FAN_INTENSIVE_READ = 312
REG_OPERATING_MODE_WRITE = 313
REG_OPERATING_MODE_READ = 314
REG_CAPABILITY_FLAGS = 315  # bitfield

REG_FUNCTION_BLOCK_BASE = REG_COOLING_ENABLE_WRITE
REG_FUNCTION_BLOCK_COUNT = 11  # 305..315

# Externe Sensorik (max 5 each)
REG_CO2_BASE = 350
REG_RF_BASE = 360

# Meldungen (bitfield)
REG_MESSAGES = 380

# --- Value mappings ------------------------------------------------------------

FAN_STAGE_OPTIONS: dict[int, str] = {
    0: "off",
    1: "stage_1",
    2: "stage_2",
    3: "stage_3",
    4: "stage_4",
}

OPERATING_MODE_WRITE_OPTIONS: dict[int, str] = {
    0: "off",
    1: "eco_summer",
    2: "eco_winter",
    3: "comfort",
    4: "furnace",
}

# Operating modes in which the fan-stage select and fan-auto switch are
# meaningful (confirmed both by the vendor's Symcon export and by the
# equivalent automation currently running against the live device: the
# fan-stage control is hidden outside these two modes).
ECO_MODE_VALUES: frozenset[int] = frozenset({1, 2})

# Operating mode in which intensive ventilation is available (Symcon hid the
# control everywhere else).
INTENSIVE_VENTILATION_MODE_VALUES: frozenset[int] = frozenset({3})

# Additional states the device can *report* (register 314) but that cannot be
# selected directly by writing register 313.
OPERATING_MODE_READ_ONLY_STATES: dict[int, str] = {
    6: "emergency",
    7: "frost_protection",
    8: "commissioning",
}

# bit index -> capability flag key (register 315)
CAPABILITY_FLAGS: dict[int, str] = {
    0: "mode_change_possible",
    1: "fan_off_selectable",
    2: "fan_stage_1_selectable",
    3: "fan_stage_2_selectable",
    4: "fan_stage_3_selectable",
    5: "fan_stage_4_selectable",
    6: "fan_auto_selectable",
    7: "intensive_ventilation_selectable",
    8: "cooling_enable_possible",
}

# bit index -> message flag key (register 380); bit 1 is unused in the source doc
MESSAGE_FLAGS: dict[int, str] = {
    0: "error_system",
    2: "filter_device",
    3: "filter_recirculation",
    4: "heat_pump_heating",
    5: "heat_pump_cooling",
    6: "heat_pump_continuous",
}

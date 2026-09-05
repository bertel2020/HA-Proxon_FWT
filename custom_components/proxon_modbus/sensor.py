"""Sensor entities for the Proxon FWT integration."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import (
    CONCENTRATION_PARTS_PER_MILLION,
    CONF_NAME,
    PERCENTAGE,
    REVOLUTIONS_PER_MINUTE,
    UnitOfPower,
    UnitOfTemperature,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import ProxonConfigEntry
from .const import (
    CONF_CO2_NAMES,
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_RF_SENSORS,
    CONF_RF_NAMES,
    CONF_ROOM_NAMES,
    OPERATING_MODE_READ_ONLY_STATES,
    OPERATING_MODE_WRITE_OPTIONS,
)
from .coordinator import ProxonData, ProxonModbusCoordinator
from .entity import ProxonCentralEntity, ProxonRoomEntity


@dataclass(frozen=True, kw_only=True)
class ProxonSensorDescription(SensorEntityDescription):
    """Sensor description with a getter into ProxonData.device."""

    value_fn: Callable[[ProxonData], float | int | str | None]


DEVICE_SENSORS: tuple[ProxonSensorDescription, ...] = (
    ProxonSensorDescription(
        key="temp_supply_air",
        translation_key="temp_supply_air",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_supply_air"),
    ),
    ProxonSensorDescription(
        key="temp_extract_air",
        translation_key="temp_extract_air",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_extract_air"),
    ),
    ProxonSensorDescription(
        key="temp_exhaust_air",
        translation_key="temp_exhaust_air",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_exhaust_air"),
    ),
    ProxonSensorDescription(
        key="temp_fresh_air",
        translation_key="temp_fresh_air",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_fresh_air"),
    ),
    ProxonSensorDescription(
        key="temp_pre_evaporator",
        translation_key="temp_pre_evaporator",
        entity_registry_enabled_default=False,
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_pre_evaporator"),
    ),
    ProxonSensorDescription(
        key="temp_evaporator",
        translation_key="temp_evaporator",
        entity_registry_enabled_default=False,
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_evaporator"),
    ),
    ProxonSensorDescription(
        key="temp_post_preheat",
        translation_key="temp_post_preheat",
        entity_registry_enabled_default=False,
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_post_preheat"),
    ),
    ProxonSensorDescription(
        key="temp_pre_condenser",
        translation_key="temp_pre_condenser",
        entity_registry_enabled_default=False,
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_pre_condenser"),
    ),
    ProxonSensorDescription(
        key="temp_condenser",
        translation_key="temp_condenser",
        entity_registry_enabled_default=False,
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_condenser"),
    ),
    ProxonSensorDescription(
        key="temp_compressor",
        translation_key="temp_compressor",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_compressor"),
    ),
    ProxonSensorDescription(
        key="temp_outside",
        translation_key="temp_outside",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_outside"),
    ),
    ProxonSensorDescription(
        key="compressor_speed",
        translation_key="compressor_speed",
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=REVOLUTIONS_PER_MINUTE,
        icon="mdi:speedometer",
        value_fn=lambda d: d.device.get("compressor_speed"),
    ),
    ProxonSensorDescription(
        key="power_consumption",
        translation_key="power_consumption",
        device_class=SensorDeviceClass.POWER,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfPower.WATT,
        value_fn=lambda d: d.device.get("power_consumption"),
    ),
    ProxonSensorDescription(
        key="fan_speed_supply",
        translation_key="fan_speed_supply",
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=REVOLUTIONS_PER_MINUTE,
        icon="mdi:fan",
        value_fn=lambda d: d.device.get("fan_speed_supply"),
    ),
    ProxonSensorDescription(
        key="fan_speed_extract",
        translation_key="fan_speed_extract",
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=REVOLUTIONS_PER_MINUTE,
        icon="mdi:fan",
        value_fn=lambda d: d.device.get("fan_speed_extract"),
    ),
)

_OPERATING_MODE_LABELS = {
    **OPERATING_MODE_WRITE_OPTIONS,
    **OPERATING_MODE_READ_ONLY_STATES,
    5: "not_used",
}

OPERATING_MODE_SENSOR = ProxonSensorDescription(
    key="operating_mode_state",
    translation_key="operating_mode_state",
    entity_category=EntityCategory.DIAGNOSTIC,
    device_class=SensorDeviceClass.ENUM,
    options=sorted(set(_OPERATING_MODE_LABELS.values())),
    value_fn=lambda d: _OPERATING_MODE_LABELS.get(
        d.function_block.get("operating_mode_read")
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ProxonConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Proxon FWT sensors from a config entry."""
    coordinator = entry.runtime_data
    device_name = entry.data[CONF_NAME]

    entities: list[SensorEntity] = [
        ProxonSensor(coordinator, entry.entry_id, device_name, description)
        for description in DEVICE_SENSORS
    ]
    entities.append(
        ProxonSensor(coordinator, entry.entry_id, device_name, OPERATING_MODE_SENSOR)
    )

    room_names = entry.options.get(CONF_ROOM_NAMES, [])
    for i, room_name in enumerate(room_names):
        if i == 0:
            continue  # no mid-room sensor for the main room (register base starts at room 2)
        entities.append(
            ProxonRoomMidTempSensor(coordinator, entry.entry_id, i, room_name)
        )

    co2_names = entry.options.get(CONF_CO2_NAMES, [])
    for i, name in enumerate(co2_names[: entry.options.get(CONF_NUM_CO2_SENSORS, 0)]):
        entities.append(
            ProxonExternalSensor(
                coordinator,
                entry.entry_id,
                device_name,
                key=f"co2_{i}",
                name=name,
                unit=CONCENTRATION_PARTS_PER_MILLION,
                device_class=SensorDeviceClass.CO2,
                value_fn=lambda d, idx=i: d.co2.get(idx),
            )
        )

    rf_names = entry.options.get(CONF_RF_NAMES, [])
    for i, name in enumerate(rf_names[: entry.options.get(CONF_NUM_RF_SENSORS, 0)]):
        entities.append(
            ProxonExternalSensor(
                coordinator,
                entry.entry_id,
                device_name,
                key=f"rf_{i}",
                name=name,
                unit=PERCENTAGE,
                device_class=SensorDeviceClass.HUMIDITY,
                value_fn=lambda d, idx=i: d.humidity.get(idx),
            )
        )

    async_add_entities(entities)


class ProxonSensor(ProxonCentralEntity, SensorEntity):
    """A device-level Proxon FWT sensor."""

    entity_description: ProxonSensorDescription

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        description: ProxonSensorDescription,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, description.key)
        self.entity_description = description

    @property
    def native_value(self):
        return self.entity_description.value_fn(self.coordinator.data)


class ProxonRoomMidTempSensor(ProxonRoomEntity, SensorEntity):
    """Mid-room temperature reported by a room's control panel (rooms 2..N)."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_translation_key = "mid_temperature"
    _attr_entity_registry_enabled_default = False

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        room_index: int,
        room_name: str,
    ) -> None:
        super().__init__(coordinator, entry_id, room_index, room_name, f"room_{room_index}_mid_temp")

    @property
    def native_value(self) -> float | None:
        room = self.coordinator.data.rooms.get(self._room_index)
        return room.mid_temperature if room else None


class ProxonExternalSensor(ProxonCentralEntity, SensorEntity):
    """CO2 / humidity sensor connected to an external Proxon input."""

    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
        key: str,
        name: str,
        unit: str,
        device_class: SensorDeviceClass,
        value_fn: Callable[[ProxonData], int | None],
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, key)
        self._attr_name = name
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = device_class
        self._value_fn = value_fn

    @property
    def native_value(self) -> int | None:
        return self._value_fn(self.coordinator.data)

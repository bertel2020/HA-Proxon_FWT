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
    CONF_CO2_ROOMS,
    CONF_NUM_CO2_SENSORS,
    CONF_NUM_RF_SENSORS,
    CONF_RF_NAMES,
    CONF_RF_ROOMS,
    CONF_ROOM_NAMES,
    OPERATING_MODE_READ_ONLY_STATES,
    OPERATING_MODE_WRITE_OPTIONS,
)
from .coordinator import (
    BLOCK_CO2,
    BLOCK_DEVICE,
    BLOCK_FUNCTION,
    BLOCK_HUMIDITY,
    BLOCK_ROOMS,
    ProxonData,
    ProxonModbusCoordinator,
)
from .entity import ProxonCentralEntity, ProxonEntity, ProxonRoomEntity, central_device_info, room_device_info


@dataclass(frozen=True, kw_only=True)
class ProxonSensorDescription(SensorEntityDescription):
    """Sensor description with a getter into ProxonData.device."""

    value_fn: Callable[[ProxonData], float | int | str | None]
    blocks: frozenset[str] = frozenset({BLOCK_DEVICE})


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
        entity_category=EntityCategory.DIAGNOSTIC,
        translation_key="temp_pre_evaporator",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_pre_evaporator"),
    ),
    ProxonSensorDescription(
        key="temp_evaporator",
        entity_category=EntityCategory.DIAGNOSTIC,
        translation_key="temp_evaporator",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_evaporator"),
    ),
    ProxonSensorDescription(
        key="temp_post_preheat",
        entity_category=EntityCategory.DIAGNOSTIC,
        translation_key="temp_post_preheat",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_post_preheat"),
    ),
    ProxonSensorDescription(
        key="temp_pre_condenser",
        entity_category=EntityCategory.DIAGNOSTIC,
        translation_key="temp_pre_condenser",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_pre_condenser"),
    ),
    ProxonSensorDescription(
        key="temp_condenser",
        entity_category=EntityCategory.DIAGNOSTIC,
        translation_key="temp_condenser",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda d: d.device.get("temp_condenser"),
    ),
    ProxonSensorDescription(
        key="temp_compressor",
        entity_category=EntityCategory.DIAGNOSTIC,
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
        entity_category=EntityCategory.DIAGNOSTIC,
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
    blocks=frozenset({BLOCK_FUNCTION}),
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
    entities.append(ProxonLastWriteErrorSensor(coordinator, entry.entry_id, device_name))

    room_names = entry.options.get(CONF_ROOM_NAMES, [])
    for i, room_name in enumerate(room_names):
        if i == 0 or not room_name:
            continue  # no mid-room sensor for the main room (register base starts at room 2); empty name = room slot not installed
        entities.append(
            ProxonRoomMidTempSensor(coordinator, entry.entry_id, i, room_name)
        )

    def _assigned_room(rooms: list[int | None], i: int) -> tuple[int, str] | tuple[None, None]:
        """Resolve sensor i's configured room index to (index, name), or
        (None, None) if unassigned or the room no longer exists (e.g. the
        room count was reduced after the assignment was made)."""
        room_index = rooms[i] if i < len(rooms) else None
        if room_index is None or room_index >= len(room_names) or not room_names[room_index]:
            return None, None
        return room_index, room_names[room_index]

    co2_rooms = entry.options.get(CONF_CO2_ROOMS, [])
    co2_names = entry.options.get(CONF_CO2_NAMES, [])
    for i, name in enumerate(co2_names[: entry.options.get(CONF_NUM_CO2_SENSORS, 0)]):
        room_index, room_name = _assigned_room(co2_rooms, i)
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
                block=BLOCK_CO2,
                room_index=room_index,
                room_name=room_name,
            )
        )

    rf_rooms = entry.options.get(CONF_RF_ROOMS, [])
    rf_names = entry.options.get(CONF_RF_NAMES, [])
    for i, name in enumerate(rf_names[: entry.options.get(CONF_NUM_RF_SENSORS, 0)]):
        room_index, room_name = _assigned_room(rf_rooms, i)
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
                block=BLOCK_HUMIDITY,
                room_index=room_index,
                room_name=room_name,
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
        self._blocks = description.blocks

    @property
    def native_value(self):
        return self.entity_description.value_fn(self.coordinator.data)


class ProxonLastWriteErrorSensor(ProxonCentralEntity, SensorEntity):
    """Diagnostic sensor showing the most recent failed write (register and
    reason), so a command the device rejected is visible without the log."""

    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_translation_key = "last_write_error"
    _attr_icon = "mdi:alert-circle-outline"

    def __init__(
        self,
        coordinator: ProxonModbusCoordinator,
        entry_id: str,
        device_name: str,
    ) -> None:
        super().__init__(coordinator, entry_id, device_name, "last_write_error")

    @property
    def native_value(self) -> str | None:
        return self.coordinator.last_write_error

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        return {
            "occurred_at": self.coordinator.last_write_error_at,
            "error_count": self.coordinator.write_error_count,
        }


class ProxonRoomMidTempSensor(ProxonRoomEntity, SensorEntity):
    """Mid-room temperature reported by a room's control panel (rooms 2..N)."""

    _blocks = frozenset({BLOCK_ROOMS})

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


class ProxonExternalSensor(ProxonEntity, SensorEntity):
    """CO2 / humidity sensor connected to an external Proxon input.

    Lives on the central device by default, but can be assigned to a room's
    own device instead (see CONF_CO2_ROOMS / CONF_RF_ROOMS in the options
    flow) for a sensor that's physically installed in that room.
    """

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
        block: str,
        room_index: int | None = None,
        room_name: str | None = None,
    ) -> None:
        device_info = (
            room_device_info(entry_id, room_index, room_name)
            if room_index is not None
            else central_device_info(entry_id, device_name)
        )
        super().__init__(coordinator, entry_id, key, device_info)
        self._attr_name = name
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = device_class
        self._value_fn = value_fn
        self._blocks = frozenset({block})

    @property
    def native_value(self) -> int | None:
        return self._value_fn(self.coordinator.data)

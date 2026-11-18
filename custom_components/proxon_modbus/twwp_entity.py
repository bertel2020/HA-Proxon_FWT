"""Entities of the hot water heat pump (TWWP): one device per TWWP subentry.

The device hangs below the central FWT device. The entities only mirror the
state of the `TwwpController` (water heater, targets, program, PV status and
diagnostics); the decisions are made in `twwp_controller.py`.
"""
from __future__ import annotations

from collections.abc import Iterator

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.components.number import NumberDeviceClass, NumberEntity, NumberMode
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.components.water_heater import WaterHeaterEntity, WaterHeaterEntityFeature
from homeassistant.config_entries import ConfigEntry, ConfigSubentry
from homeassistant.const import ATTR_TEMPERATURE, EntityCategory, UnitOfTemperature
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity
from homeassistant.util import dt as dt_util

from .const import DOMAIN, MANUFACTURER
from .twwp import (
    PROGRAMS,
    PV_STATES,
    REASON_SENSOR_UNAVAILABLE,
    REASONS,
    SUBENTRY_TYPE_TWWP,
    TARGET_MIN,
    TARGET_NORMAL,
    TARGET_PV,
)
from .twwp_controller import TwwpController

TWWP_MODEL = "TWWP - Trinkwasser-Wärmepumpe"
MIN_TARGET = 20.0
MAX_TARGET = 70.0


def twwp_device_identifier(entry_id: str, subentry_id: str) -> tuple[str, str]:
    return (DOMAIN, f"{entry_id}_twwp_{subentry_id}")


def twwp_subentries(entry: ConfigEntry) -> Iterator[tuple[ConfigSubentry, TwwpController]]:
    """The TWWP subentries that have a running controller."""
    controllers = entry.runtime_data.twwp_controllers
    for subentry in entry.subentries.values():
        if subentry.subentry_type == SUBENTRY_TYPE_TWWP and subentry.subentry_id in controllers:
            yield subentry, controllers[subentry.subentry_id]


class TwwpEntity(Entity):
    """Base: attaches to the TWWP device and refreshes whenever the controller decided."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self, entry: ConfigEntry, subentry: ConfigSubentry, controller: TwwpController, key: str
    ) -> None:
        self._controller = controller
        self._attr_unique_id = f"{entry.entry_id}_twwp_{subentry.subentry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={twwp_device_identifier(entry.entry_id, subentry.subentry_id)},
            name=subentry.title,
            manufacturer=MANUFACTURER,
            model=TWWP_MODEL,
            via_device=(DOMAIN, entry.entry_id),
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._controller.add_listener(self.async_write_ha_state))


class TwwpWaterHeater(TwwpEntity, WaterHeaterEntity):
    """Tank temperature and the normal target; the program shows as the operation."""

    _attr_name = None
    _attr_translation_key = "twwp"
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_supported_features = WaterHeaterEntityFeature.TARGET_TEMPERATURE
    _attr_operation_list = list(PROGRAMS)
    _attr_min_temp = MIN_TARGET
    _attr_max_temp = MAX_TARGET
    _attr_target_temperature_step = 0.5

    def __init__(self, entry, subentry, controller) -> None:
        super().__init__(entry, subentry, controller, "water_heater")

    @property
    def current_temperature(self) -> float | None:
        return self._controller.state.water

    @property
    def target_temperature(self) -> float:
        return self._controller.state.targets[TARGET_NORMAL]

    @property
    def current_operation(self) -> str:
        return self._controller.state.program

    async def async_set_temperature(self, **kwargs) -> None:
        if (value := kwargs.get(ATTR_TEMPERATURE)) is not None:
            await self._controller.async_set_target(TARGET_NORMAL, value)


class TwwpTargetNumber(TwwpEntity, NumberEntity):
    """One of the three target temperatures."""

    _attr_device_class = NumberDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_native_min_value = MIN_TARGET
    _attr_native_max_value = MAX_TARGET
    _attr_native_step = 0.5
    _attr_mode = NumberMode.BOX
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, entry, subentry, controller, target: str) -> None:
        super().__init__(entry, subentry, controller, f"target_{target}")
        self._target = target
        self._attr_translation_key = f"twwp_target_{target}"

    @property
    def native_value(self) -> float:
        return self._controller.state.targets[self._target]

    async def async_set_native_value(self, value: float) -> None:
        await self._controller.async_set_target(self._target, value)


TARGETS = (TARGET_NORMAL, TARGET_PV, TARGET_MIN)


class TwwpProgramSensor(TwwpEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = list(PROGRAMS)
    _attr_translation_key = "twwp_program"

    def __init__(self, entry, subentry, controller) -> None:
        super().__init__(entry, subentry, controller, "program")

    @property
    def native_value(self) -> str:
        return self._controller.state.program


class TwwpPvStatusSensor(TwwpEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = list(PV_STATES)
    _attr_translation_key = "twwp_pv_status"

    def __init__(self, entry, subentry, controller) -> None:
        super().__init__(entry, subentry, controller, "pv_status")

    @property
    def native_value(self) -> str:
        return self._controller.state.pv_status


class TwwpReasonSensor(TwwpEntity, SensorEntity):
    """Why the last decision was made, plus the mode and the last run."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = list(REASONS)
    _attr_translation_key = "twwp_reason"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, entry, subentry, controller) -> None:
        super().__init__(entry, subentry, controller, "reason")

    @property
    def native_value(self) -> str | None:
        return self._controller.state.reason

    @property
    def extra_state_attributes(self) -> dict:
        state = self._controller.state
        return {
            "control": self._controller.control,
            "last_run": dt_util.utc_from_timestamp(state.last_run).isoformat() if state.last_run else None,
            "last_error": state.last_error,
        }


class TwwpPlannedSensor(TwwpEntity, SensorEntity):
    """How many enable switches the controller wants in another state than they are in now.

    In observe mode this is the difference to the existing automation.
    """

    _attr_translation_key = "twwp_planned"
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:swap-horizontal"

    def __init__(self, entry, subentry, controller) -> None:
        super().__init__(entry, subentry, controller, "planned")

    @property
    def native_value(self) -> int:
        return len(self._controller.state.planned)

    @property
    def extra_state_attributes(self) -> dict:
        return {"switches": {entity: target for entity, target in self._controller.state.planned}}


class TwwpSensorProblem(TwwpEntity, BinarySensorEntity):
    """A temperature sensor or target is unavailable: the enables are switched off."""

    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _attr_translation_key = "twwp_sensor_problem"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, entry, subentry, controller) -> None:
        super().__init__(entry, subentry, controller, "sensor_problem")

    @property
    def is_on(self) -> bool:
        return self._controller.state.reason == REASON_SENSOR_UNAVAILABLE


def twwp_sensors(entry: ConfigEntry) -> Iterator[tuple[str, list]]:
    """(subentry id, sensor entities) per TWWP."""
    for subentry, controller in twwp_subentries(entry):
        yield subentry.subentry_id, [
            TwwpProgramSensor(entry, subentry, controller),
            TwwpPvStatusSensor(entry, subentry, controller),
            TwwpReasonSensor(entry, subentry, controller),
            TwwpPlannedSensor(entry, subentry, controller),
        ]


def twwp_binary_sensors(entry: ConfigEntry) -> Iterator[tuple[str, list]]:
    for subentry, controller in twwp_subentries(entry):
        yield subentry.subentry_id, [TwwpSensorProblem(entry, subentry, controller)]

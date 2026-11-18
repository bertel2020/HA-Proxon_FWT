"""The blueprint and the integration's controller must decide the same.

Renders the blueprint's templates (with a minimal stand-in for Home Assistant's `states` and `float`)
for many random situations and compares program, enables and PV status with `twwp.decide`.
"""
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")
jinja2 = pytest.importorskip("jinja2")

BLUEPRINT = Path(__file__).resolve().parents[1] / "blueprints" / "automation" / "proxon_modbus" / "twwp_pv.yaml"
PROGRAM = {"off": "Aus", "normal": "Normalbetrieb", "pv": "PV-Betrieb", "minimum": "Minimumbetrieb", "night": "Nachtabschaltung"}
PV_STATUS = {"pv": "PV-Strom", "no_pv": "kein PV-Strom", "too_cold": "zu kalt"}
# blueprint branch (alias) -> reason of `decide`
ALIAS_REASON = {
    "PV-Betrieb": "pv", "Soll PV erreicht": "pv_target_reached", "Minimumbetrieb beenden": "minimum_end", "Minimumbetrieb": "minimum",
    "Nachtabschaltung": "night", "Nachtabschaltung beenden": "night_end", "PV-Betrieb beenden, Normalbetrieb": "pv_end",
    "Normalbetrieb": "normal", "Soll erreicht": "target_reached",
}
ENTITY = dict(enable_switch="sw", enable_pv_switch="swpv", water_temp="water", outer_temp="outer", pv_power="pv", pv_power_avg="pva",
              brightness="br", target_normal="tn", target_pv="tp", target_min="tm", program="prog", pv_status="pvs")


class _Loader(yaml.SafeLoader):
    pass


_Loader.add_constructor("!input", lambda loader, node: "<<" + loader.construct_scalar(node) + ">>")


@pytest.fixture(scope="module")
def bp():
    return yaml.load(BLUEPRINT.read_text(), _Loader)


def _float(value, default=jinja2.utils.missing):
    try:
        return float(value)
    except (TypeError, ValueError):
        if default is jinja2.utils.missing:
            raise
        return default


NOW = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)


class _States:
    """Stand-in for Home Assistant's `states`: callable and subscriptable."""

    def __init__(self, values, age_s=0):
        self._values, self._age = values, age_s

    def __call__(self, entity):
        return self._values.get(entity, "unavailable")

    def __getitem__(self, entity):
        return type("S", (), {"last_changed": NOW - timedelta(seconds=self._age)})()


def _context(bp, inputs, states, age_s=0):
    env = jinja2.Environment()
    env.filters["float"] = _float
    ctx = {"states": _States(states, age_s), "now": lambda: NOW, "as_timestamp": lambda value: value.timestamp()}
    for key, raw in bp["variables"].items():
        value = inputs[raw[2:-2]] if isinstance(raw, str) and raw.startswith("<<") else raw
        if isinstance(value, str) and "{" in value:
            text = env.from_string(value).render(**ctx).strip()
            value = {"True": True, "False": False, "None": None}.get(text, text)
            if isinstance(value, str):
                try:
                    value = float(value)
                except ValueError:
                    pass
        ctx[key] = value
    return env, ctx


def _evaluate(bp, inputs, states):
    """(branch alias or 'none' or 'failsafe', new pv status) of the blueprint for these inputs and states."""
    env, ctx = _context(bp, inputs, states)
    if not ctx["sensors_ok"]:
        return "failsafe", None
    for branch in next(a for a in bp["actions"] if "choose" in a)["choose"]:
        if env.from_string(branch["conditions"][0]["value_template"]).render(**ctx).strip() == "True":
            return branch["alias"], ctx["pv_status_new"]
    return "none", ctx["pv_status_new"]


def _num(rng, lo, hi, none=0.04):
    return None if rng.random() < none else round(rng.uniform(lo, hi) * 2) / 2


def test_blueprint_decides_like_the_controller(twwp, bp):
    rng = random.Random(20261118)
    seen = set()
    for _ in range(1200):
        water, outer = _num(rng, 25, 70), _num(rng, -5, 20)
        tm, tn, tp = _num(rng, 35, 45, .02), _num(rng, 48, 58, .02), _num(rng, 58, 66, .02)
        pv = rng.choice([0, 0, round(rng.uniform(0, 4000)), 1500, 1501, None])
        pva = rng.choice([0, round(rng.uniform(0, 4000)), 1500, 1501, None])
        has_br = rng.random() < 0.7
        br = None if rng.random() < 0.08 else round(rng.uniform(0, 2000))
        program = rng.choice(list(PROGRAM))
        low, high = rng.choice([1, 1.5, 2, 3, 4, 6, 10]), rng.choice([0, 0.5, 1, 2, 5])
        states = {k: ("unavailable" if v is None else str(v)) for k, v in
                  {"water": water, "outer": outer, "tn": tn, "tp": tp, "tm": tm, "pv": pv, "pva": pva}.items()}
        if has_br:
            states["br"] = "unavailable" if br is None else str(br)
        states["prog"] = PROGRAM[program]
        inputs = {**ENTITY, "brightness": "br" if has_br else "", "frost_below": 0, "pv_min_outer": 5, "pv_threshold": 1500,
                  "night_below": 500, "day_above": 950, "hyst_low": low, "hyst_high": high,
                  "min_on_minutes": 0, "min_off_minutes": 0}
        alias, pvs = _evaluate(bp, inputs, states)
        want = twwp.decide(twwp.TwwpInput(water=water, outer=outer, target_normal=tn, target_pv=tp, target_min=tm,
                                          pv_power=pv, pv_power_avg=pva, brightness=br if has_br else None, has_brightness=has_br,
                                          program=program, hyst_low=low, hyst_high=high))
        reason = {"failsafe": "sensor_unavailable", "none": "none"}.get(alias) or ALIAS_REASON[alias]
        ctx = (water, outer, tn, tp, tm, pv, pva, has_br, br, program, low, high)
        assert reason == want.reason, ctx
        if want.reason != "sensor_unavailable":
            assert pvs == PV_STATUS[want.pv_status], ctx
        seen.add(reason)
    assert seen >= {"pv", "pv_target_reached", "minimum_end", "minimum", "night", "night_end", "pv_end", "normal", "target_reached", "none", "sensor_unavailable"}, seen


def test_blueprint_lock_matches_the_controller(twwp, bp):
    """The blueprint's `locked` equals `twwp.lock_active` for the same switch state, age and minutes."""
    rng = random.Random(7)
    seen = set()
    for _ in range(400):
        state = rng.choice(["on", "off", "unavailable", "unknown"])
        min_on, min_off = rng.choice([0, 1, 5, 10]), rng.choice([0, 1, 5, 10])
        age = rng.choice([0, 30, 59, 60, 299, 300, 301, 599, 600, 601, 3600])
        inputs = {**ENTITY, "frost_below": 0, "pv_min_outer": 5, "pv_threshold": 1500, "night_below": 500, "day_above": 950,
                  "hyst_low": 3, "hyst_high": 1, "min_on_minutes": min_on, "min_off_minutes": min_off}
        _, ctx = _context(bp, inputs, {"sw": state}, age_s=age)
        want = twwp.lock_active(state, NOW.timestamp() - age, NOW.timestamp(), min_on, min_off)
        assert bool(ctx["locked"]) is want, (state, min_on, min_off, age)
        seen.add(want)
    assert seen == {True, False}


def test_blueprint_stops_when_locked(bp):
    steps = bp["actions"]
    locked = next(a for a in steps if "if" in a and a["if"][0]["value_template"] == "{{ locked }}")
    assert "stop" in locked["then"][0]
    assert steps.index(locked) < steps.index(next(a for a in steps if "choose" in a))

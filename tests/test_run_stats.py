"""RunStats: heat pump runtime/starts and filter hours."""
from datetime import date

D1, D2 = date(2026, 11, 7), date(2026, 11, 8)


def poll(s, day=D1, elapsed=30, running=False, on=True, f=False, r=False):
    s.update(day, elapsed, running=running, unit_on=on, filter_due=f, recirc_due=r)


def test_counts_runtime_and_starts(logic):
    s = logic.RunStats()
    poll(s, running=False)
    poll(s, running=True)
    poll(s, running=True)
    poll(s, running=False)
    poll(s, running=True)
    assert s.hp_seconds == 90
    assert s.hp_starts == 2
    assert s.hp_starts_today == 2


def test_first_poll_while_running_is_not_a_start(logic):
    s = logic.RunStats()
    poll(s, running=True)
    assert s.hp_starts == 0


def test_daily_counters_reset_but_totals_stay(logic):
    s = logic.RunStats()
    poll(s, running=False)
    poll(s, running=True)
    poll(s, day=D2, running=True)
    assert s.hp_seconds_today == 30
    assert s.hp_starts_today == 0
    assert s.hp_seconds == 60
    assert s.hp_starts == 1


def test_filter_hours_only_while_unit_on(logic):
    s = logic.RunStats()
    poll(s, on=True)
    poll(s, on=False)
    assert s.filter_seconds == 30
    assert s.recirc_seconds == 30


def test_filter_hours_reset_when_flag_clears(logic):
    s = logic.RunStats()
    poll(s)
    poll(s, f=True)
    assert s.filter_seconds == 60
    poll(s, f=False)  # filter replaced
    assert s.filter_seconds == 0
    assert s.recirc_seconds == 90  # recirculation filter untouched


def test_unknown_flags_do_not_reset(logic):
    s = logic.RunStats()
    poll(s)
    s.update(D1, 30, running=None, unit_on=True, filter_due=None, recirc_due=None)
    assert s.filter_seconds == 60


def test_persistence_roundtrip(logic):
    a = logic.RunStats()
    poll(a, running=False)
    poll(a, running=True)
    b = logic.RunStats()
    b.load(a.as_dict())
    assert b.as_dict() == a.as_dict()


def test_load_tolerates_missing_or_partial_data(logic):
    s = logic.RunStats()
    s.load(None)
    s.load({"hp_starts": 4})
    assert s.hp_starts == 4 and s.hp_seconds == 0

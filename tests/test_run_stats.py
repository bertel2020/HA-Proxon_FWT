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


DAY = 86400


def test_filter_message_starts_shutdown_countdown(logic):
    s = logic.RunStats()
    s.update(D1, 30, running=False, unit_on=True, filter_due=False, recirc_due=False, ts=0)
    assert s.filter_shutdown_days(0) is None
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=10 * DAY)
    assert s.filter_shutdown_days(10 * DAY) == 21
    assert s.filter_shutdown_days(10 * DAY + 5 * DAY) == 16
    assert s.filter_shutdown_days(10 * DAY + 40 * DAY) == 0


def test_countdown_start_is_kept_while_message_stays(logic):
    s = logic.RunStats()
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=100)
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=5 * DAY)
    assert s.filter_due_since == 100


def test_replacement_resets_age_and_countdown(logic):
    s = logic.RunStats()
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=0)
    s.update(D1, 30, running=False, unit_on=True, filter_due=False, recirc_due=False, ts=7 * DAY)
    assert s.filter_changed == 7 * DAY
    assert s.filter_due_since is None
    assert s.filter_age_days(7 * DAY + 3 * DAY) == 3


def test_button_while_message_still_shown_does_not_restart_countdown(logic):
    s = logic.RunStats()
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=0)
    s.mark_filter_changed(2 * DAY, manual=True)
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=3 * DAY)
    assert s.filter_shutdown_days(3 * DAY) is None
    s.update(D1, 30, running=False, unit_on=True, filter_due=False, recirc_due=False, ts=4 * DAY)
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=200 * DAY)
    assert s.filter_shutdown_days(200 * DAY) == 21


def test_filter_dates_survive_save_and_load(logic):
    s = logic.RunStats()
    s.mark_filter_changed(1234.0)
    s.filter_due_since = 99.0
    t = logic.RunStats()
    t.load(s.as_dict())
    assert (t.filter_changed, t.filter_due_since) == (1234.0, 99.0)
    assert t.filter_age_days(1234.0) == 0


def test_manual_filter_confirmation_survives_restart(logic):
    s = logic.RunStats()
    s.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=0)
    s.mark_filter_changed(2 * DAY, manual=True)
    t = logic.RunStats()  # Home Assistant restarts while the unit still shows the message
    t.load(s.as_dict())
    t.update(D1, 30, running=False, unit_on=True, filter_due=True, recirc_due=False, ts=3 * DAY)
    assert t.filter_shutdown_days(3 * DAY) is None

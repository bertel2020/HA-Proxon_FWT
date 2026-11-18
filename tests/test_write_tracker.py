"""WriteTracker: was a written value applied by the unit?"""


def test_confirmed_when_unit_reports_the_sent_value(logic):
    t = logic.WriteTracker()
    t.sent(0, 22, now=100)
    assert t.check(0, 21.0, now=102) is None  # still the old value, within the deadline
    assert t.state(0)["status"] == "pending"
    assert t.check(0, 22.0, now=104) == "confirmed"
    assert t.state(0)["status"] == "confirmed"
    assert t.check(0, 22.0, now=106) is None  # verdict is given once


def test_not_applied_after_the_deadline(logic):
    t = logic.WriteTracker()
    t.sent(1, 24, now=100)
    assert t.check(1, 20.0, now=100 + t.TIMEOUT - 1) is None
    assert t.check(1, 20.0, now=100 + t.TIMEOUT) == "not_applied"
    assert t.state(1) == {"sent": 24, "stamp": None, "status": "not_applied", "confirmed": 20.0}
    assert t.not_applied_count == 1
    assert t.check(1, 20.0, now=200) is None  # not counted twice


def test_late_confirmation_is_still_confirmed(logic):
    t = logic.WriteTracker()
    t.sent(0, 22, now=100)
    assert t.check(0, 22.0, now=500) == "confirmed"
    assert t.not_applied_count == 0


def test_only_the_last_write_counts(logic):
    t = logic.WriteTracker()
    t.sent(0, 21, now=100)
    t.sent(0, 23, now=110)
    assert t.check(0, 21.0, now=112) is None  # the first write is no longer what we wait for
    assert t.check(0, 23.0, now=114) == "confirmed"


def test_registers_are_independent_and_listed_while_pending(logic):
    t = logic.WriteTracker()
    t.sent(307, 3, now=100)
    t.sent(313, 2, now=100)
    assert sorted(t.pending()) == [307, 313]
    assert t.check(307, 3, now=101) == "confirmed"
    assert t.pending() == [313]


def test_rooms_are_independent(logic):
    t = logic.WriteTracker()
    t.sent(0, 22, now=100)
    assert t.check(1, 19.0, now=200) is None
    assert t.state(1) is None


def test_no_verdict_without_a_value_from_the_unit(logic):
    t = logic.WriteTracker()
    t.sent(0, 22, now=100)
    assert t.check(0, None, now=500) is None
    assert t.state(0)["status"] == "pending"


def test_overall_status_clears_only_with_a_later_confirmation(logic):
    t = logic.WriteTracker()
    assert t.overall() == "ok"
    t.sent(307, 3, now=100)
    assert t.overall() == "pending"
    assert t.check(307, 1, now=140) == "not_applied"
    assert t.overall() == "not_applied"
    t.sent(307, 3, now=150)
    assert t.overall() == "not_applied"  # a new write does not hide the earlier failure
    assert t.check(307, 3, now=152) == "confirmed"
    assert t.overall() == "ok"
    assert t.states()[307]["status"] == "confirmed"

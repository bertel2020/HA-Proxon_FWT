def test_kind_prefers_intensive(logic):
    Boost, boost_kind = logic.Boost, logic.boost_kind
    assert boost_kind({"intensive_ventilation_selectable": True}, {}) == "intensive"


def test_kind_stage_only_in_eco_modes(logic):
    Boost, boost_kind = logic.Boost, logic.boost_kind
    f = {"operating_mode_read": 2, "fan_stage_read": 1}
    assert boost_kind({}, f) == "stage"
    assert boost_kind({"fan_stage_4_selectable": False}, f) is None
    assert boost_kind({}, {"operating_mode_read": 3, "fan_stage_read": 1}) is None
    assert boost_kind({}, {"operating_mode_read": 2}) is None


def test_start_remaining_and_extend_keeps_original_state(logic):
    Boost, boost_kind = logic.Boost, logic.boost_kind
    b = Boost()
    b.start(1000, 15, "stage", 2, True)
    assert b.active and b.remaining(1000) == 900 and b.remaining(5000) == 0
    b.start(1500, 15, "stage", 4, False)  # extend while boosted: stage 4 must not become the one to restore
    assert (b.stage, b.auto) == (2, True) and b.until == 2400


def test_clear_and_persistence(logic):
    Boost, boost_kind = logic.Boost, logic.boost_kind
    b = Boost()
    b.start(1000, 10, "stage", 3, False)
    c = Boost()
    c.load(b.as_dict())
    assert (c.until, c.kind, c.stage, c.auto) == (1600, "stage", 3, False)
    c.clear()
    assert not c.active
    c.load({"until": "x", "kind": "stage"})
    assert not c.active
    c.load(None)
    assert not c.active

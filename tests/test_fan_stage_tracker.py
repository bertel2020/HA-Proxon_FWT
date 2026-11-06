"""FanStageTracker: learn the user's stage, restore it after a heat pump run."""


def run(tracker, steps, mode=2, auto=False):
    """Feed (running, stage) polls; return the list of restore requests."""
    restores = []
    for running, stage in steps:
        r = tracker.update(running=running, mode=mode, auto=auto, stage=stage)
        if r is not None:
            restores.append(r)
    return restores


def test_learns_stage_only_after_two_idle_polls(logic):
    t = logic.FanStageTracker()
    t.update(running=False, mode=2, auto=False, stage=1)
    assert t.preferred == 1


def test_unit_raise_at_heat_pump_start_is_not_learned(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    run(t, [(False, 1), (False, 1), (True, 3), (True, 3)])
    assert t.preferred == 1


def test_restores_when_heat_pump_stops(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    assert run(t, [(False, 1), (True, 3), (True, 3), (False, 3)]) == [1]


def test_no_restore_when_disabled(logic):
    t = logic.FanStageTracker()
    assert run(t, [(False, 1), (True, 3), (False, 3)]) == []
    assert t.preferred == 1


def test_no_restore_when_stage_unchanged(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    assert run(t, [(False, 2), (True, 2), (False, 2)]) == []


def test_manual_change_while_idle_is_learned(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    run(t, [(False, 1), (False, 2)])
    assert t.preferred == 2
    assert run(t, [(True, 3), (False, 3)]) == [2]


def test_failed_restore_does_not_adopt_raised_stage(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    run(t, [(False, 1), (True, 3), (False, 3)])
    run(t, [(False, 3), (False, 3)])  # restore never took effect
    assert t.preferred == 1


def test_guard_ends_once_restore_took_effect(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    run(t, [(False, 1), (True, 3), (False, 3), (False, 1)])
    run(t, [(False, 2)])  # user changes afterwards: learned again
    assert t.preferred == 2


def test_ignored_outside_eco_modes_and_with_auto(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    assert run(t, [(False, 1), (True, 3), (False, 3)], mode=3) == []
    assert run(t, [(False, 1), (True, 3), (False, 3)], auto=True) == []
    assert t.preferred is None


def test_cooling_run_counts_like_heating(logic):
    t = logic.FanStageTracker()
    t.enabled = True
    assert run(t, [(False, 1), (True, 3), (False, 3)]) == [1]


def test_unknown_stage_is_ignored(logic):
    t = logic.FanStageTracker()
    t.update(running=False, mode=2, auto=False, stage=None)
    t.update(running=False, mode=2, auto=False, stage=9)
    assert t.preferred is None

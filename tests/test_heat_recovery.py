def test_heat_recovery(logic):
    hr = logic.heat_recovery
    assert hr(21.0, 8.0, 11.0) == 77  # (21-11)/(21-8)
    assert hr(21.0, 8.0, 11.0, bypass=True) is None
    assert hr(21.0, 19.0, 20.0) is None  # difference too small
    assert hr(None, 8.0, 11.0) is None
    assert hr(21.0, 8.0, 25.0) == 0  # clamped
    assert hr(21.0, 8.0, 5.0) == 100  # clamped

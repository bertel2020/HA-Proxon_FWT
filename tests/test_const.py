"""Sanity checks of the register map."""


def test_flag_bits_are_unique_and_in_range(const):
    for flags in (const.CAPABILITY_FLAGS, const.MESSAGE_FLAGS):
        assert len(set(flags.values())) == len(flags)
        assert all(0 <= bit < 16 for bit in flags)


def test_fan_stage_and_mode_options(const):
    assert list(const.FAN_STAGE_OPTIONS) == [0, 1, 2, 3, 4]
    assert set(const.OPERATING_MODE_WRITE_OPTIONS).isdisjoint(const.OPERATING_MODE_READ_ONLY_STATES)
    assert const.ECO_MODE_VALUES == {1, 2}


def test_blocks_cover_expected_register_ranges(const):
    assert const.REG_DEVICE_DATA_BASE + const.REG_DEVICE_DATA_COUNT - 1 == const.REG_FAN_SPEED_EXTRACT
    assert const.REG_FUNCTION_BLOCK_BASE + const.REG_FUNCTION_BLOCK_COUNT - 1 == const.REG_CAPABILITY_FLAGS


def test_eco_modes_match_between_logic_and_const(const, logic):
    # logic.py has to stay importable on its own, so the set exists in both modules
    assert set(logic.ECO_MODES) == set(const.ECO_MODE_VALUES)

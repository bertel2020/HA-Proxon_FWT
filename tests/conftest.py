"""Load the Home Assistant independent modules without importing the package.

`custom_components/proxon_modbus/__init__.py` imports Home Assistant, which is
not needed (and not installed) for these unit tests, so the pure modules are
loaded straight from their files.
"""
import importlib.util
from pathlib import Path

import pytest

# Two kinds of tests that cannot share one environment: the unit tests replace the few Home Assistant modules
# they need (test_coordinator.py) and run anywhere; tests/integration/ needs a real Home Assistant installed.
try:
    import homeassistant  # noqa: F401
except ImportError:
    collect_ignore = ["integration"]
else:
    collect_ignore = ["test_coordinator.py"]

PKG = Path(__file__).resolve().parents[1] / "custom_components" / "proxon_modbus"


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"proxon_{name}", PKG / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def logic():
    return _load("logic")


@pytest.fixture(scope="session")
def const():
    return _load("const")

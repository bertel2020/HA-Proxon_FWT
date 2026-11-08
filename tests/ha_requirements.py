"""Print the pip requirements of the Home Assistant components the integration depends on.

The test plugin installs Home Assistant itself, but not what its components need at runtime (the Modbus
library, the frontend package). Reading them from the installed Home Assistant keeps the versions matching:

    pip install pytest-homeassistant-custom-component
    pip install $(python tests/ha_requirements.py)
"""
import importlib.util
import json
from pathlib import Path

COMPONENTS = ("modbus", "frontend")

root = Path(importlib.util.find_spec("homeassistant").origin).parent / "components"
for name in COMPONENTS:
    for requirement in json.loads((root / name / "manifest.json").read_text())["requirements"]:
        print(requirement)

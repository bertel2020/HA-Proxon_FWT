"""strings.json and both translations must have the same keys."""
import json
from pathlib import Path

PKG = Path(__file__).resolve().parents[1] / "custom_components" / "proxon_modbus"


def keys(node, prefix=""):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from keys(v, f"{prefix}.{k}" if prefix else k)
    else:
        yield prefix


def test_translation_keys_match_strings():
    base = set(keys(json.loads((PKG / "strings.json").read_text())))
    for lang in ("de", "en"):
        other = set(keys(json.loads((PKG / "translations" / f"{lang}.json").read_text())))
        assert other == base, (lang, sorted(base ^ other))

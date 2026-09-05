# Contributing

This started as a single-installation integration for one Proxon FWT unit, so
there's no CI test suite yet — contributions that add one (`pytest` +
`pytest-homeassistant-custom-component`) are very welcome.

## Before publishing this repository on GitHub

A few things are left as placeholders on purpose, because they need to be
filled in with your own account/repo details rather than guessed:

- `custom_components/proxon_modbus/manifest.json`: set `codeowners` to your
  GitHub handle (e.g. `["@yourname"]`), and once the repo exists, add
  `"documentation"` and `"issue_tracker"` URLs pointing at it.
- `README.md`: replace the "Add this folder's Git repository URL" placeholder
  in the HACS installation section with the actual repository URL.

## Local development

```bash
python3 -m py_compile custom_components/proxon_modbus/*.py
python3 -m pyflakes custom_components/proxon_modbus/*.py
```

For anything beyond a syntax/lint check you need a real Home Assistant
instance (or `pip install homeassistant` in a throwaway virtualenv) to import
against, since the integration relies on `homeassistant.*` and `pymodbus`.

## Register map changes

The full register map lives in
[`custom_components/proxon_modbus/const.py`](custom_components/proxon_modbus/const.py),
with the reasoning and known assumptions in the README's "Register map"
section. If you find a register that behaves differently than documented
there (scale, sign, or bit layout), please open an issue with the exact
raw value you observed and what it should decode to — the original vendor
parameter sheet this was reverse-engineered from is not part of this
repository, so issues are the only way to correct it.

## Integration icon

[`brands/`](brands/) has an icon ready to submit to the
[`home-assistant/brands`](https://github.com/home-assistant/brands)
repository — see [`brands/README.md`](brands/README.md) for why that's a
separate, one-time step and how to do it. Until that PR is merged, the
integration shows Home Assistant's generic icon; that's expected.

## Continuous integration

Two GitHub Actions run on every push/PR:

- `.github/workflows/hassfest.yaml` – validates the integration against Home
  Assistant's own integration requirements (manifest, translations, etc.).
- `.github/workflows/hacs.yaml` – validates the repository against HACS's
  requirements for a listed integration repository.

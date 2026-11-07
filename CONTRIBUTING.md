# Contributing

This started as a single-installation integration for one Proxon FWT unit.
There is a `pytest` suite for the logic that does not need Home Assistant
(fan stage restore, run statistics, register map, translations) and for the
coordinator (boost, PTC mask, statistics saving, link errors), which runs against
small stand-ins for the few `homeassistant.*` modules it imports. The side panel
and card have Node tests. Tests that exercise entities and flows with
`pytest-homeassistant-custom-component` are very welcome.

## Local development

```bash
python3 -m py_compile custom_components/proxon_modbus/*.py
python3 -m pyflakes custom_components/proxon_modbus/*.py
python3 -m pytest -q tests
node --test tests/panel.test.mjs tests/panel-render.test.mjs
```

## Frontend layout

`custom_components/proxon_modbus/www/proxon-fwt-card.js` only registers the
elements; the code lives in ES modules under `www/lib/` (`text.js`, `styles.js`,
`constants.js`, `base.js` plus method groups assembled in `compose.js`, `card.js`,
`panel.js`, `editor.js`). There is no build step. The integration serves the whole
`www` folder below a path that contains its version, so the modules can import each
other by relative path and browsers fetch them anew after an update. Variable text
that ends up in a template has to go through `esc()`.

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

# Integration icon

`icon.png` / `icon@2x.png` (256×256 / 512×512) and `logo.png` / `logo@2x.png`
are an original mark for this integration — two arcs representing the
incoming-cold / outgoing-warm air exchange a heat-recovery ventilation unit
does. It is **not** Proxon's own company logo (recreating a manufacturer's
trademarked branding without permission isn't something to do casually), just
a simple, original icon for the integration itself.

## Why this folder exists, and why it alone isn't enough

Home Assistant does **not** read integration icons from the integration's own
repository. The Settings → Devices & Services icon comes from the community
[`home-assistant/brands`](https://github.com/home-assistant/brands)
repository, fetched by the frontend from `brands.home-assistant.io`. Until an
icon is merged there, this integration shows Home Assistant's generic
fallback icon — that's expected, not a bug.

## How to actually get it showing up

1. Fork [`home-assistant/brands`](https://github.com/home-assistant/brands).
2. Add a `custom_integrations/proxon_modbus/` directory (custom integrations
   go under `custom_integrations/`, not `core_integrations/`) containing the
   four files from this folder.
3. Open a PR against `home-assistant/brands`. Their `python3 script/validate`
   check (documented in that repo) validates image size/format before review.

This is a one-time step per integration domain, independent of this
integration's own release cycle — it doesn't need to happen before the first
HACS release, and isn't blocking.

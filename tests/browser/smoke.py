"""Smoke test of the side panel in a real browser, against tests/browser/harness.html (sample data, no Home Assistant).

    pip install playwright && playwright install chromium
    python tests/browser/smoke.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HARNESS = (Path(__file__).parent / "harness.html").resolve().as_uri()


def check(cond: bool, what: str) -> None:
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        check.failed = True


check.failed = False


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--allow-file-access-from-files"])
        page = browser.new_page(viewport={"width": 1200, "height": 900})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(HARNESS)
        page.wait_for_function("customElements.get('proxon-fwt-panel') && document.getElementById('p')._d")
        # run in the page: the panel keeps its DOM in a shadow root
        js = lambda code: page.evaluate(f"(async () => {{ const el = document.getElementById('p'); const root = el.shadowRoot; {code} }})()"  # noqa: E731
        )
        show = lambda tab, **kw: js(  # noqa: E731
            f"el._tab = '{tab}'; " + "".join(f"el._{k} = {v!r}; " for k, v in kw.items()) + "el._sig = ''; el._update(); await new Promise(r => setTimeout(r, 200));"
        )

        show("overview")
        # four figures of the ventilation unit plus one hot water tile per heat pump (the sample data has one)
        check(js("return root.querySelectorAll('.kpi .k').length") == 5, "overview shows four key figures and the hot water tile")

        # a key figure without a value says why (the sample data has no power entity configured here)
        js("window.__hass.states['sensor.power_consumption'] = { ...window.__hass.states['sensor.power_consumption'], state: 'unavailable' }; el.hass = { ...window.__hass }; el._sig = ''; el._update(); await new Promise(r => setTimeout(r, 200));")
        check("kein Wert" in js("return [...root.querySelectorAll('.kpi .k')].map((k) => k.textContent).join('|')"), "a key figure without a value says so")
        js("window.__hass.states['sensor.power_consumption'] = { ...window.__hass.states['sensor.power_consumption'], state: '450' }; el.hass = { ...window.__hass };")

        show("rooms", rview="cards")
        check(js("return root.querySelectorAll('.knob').length") == 7, "every room ring has a knob")
        before = js("return window.__calls.length")
        box = page.evaluate("(() => { const k = document.getElementById('p').shadowRoot.querySelector('.knob').getBoundingClientRect(); return [k.x + k.width / 2, k.y + k.height / 2]; })()")
        page.mouse.move(*box)
        page.mouse.down()
        page.mouse.move(box[0] + 70, box[1] + 40, steps=8)
        page.mouse.up()
        page.wait_for_timeout(900)
        calls = js("return window.__calls")[before:]
        check(len(calls) == 1 and calls[0][:2] == ["climate", "set_temperature"], "dragging the ring dot writes the target once")

        kept = js("const a = root.querySelector('.rc'); window.__hass.states['climate.room1'] = { ...window.__hass.states['climate.room1'], attributes: { ...window.__hass.states['climate.room1'].attributes, current_temperature: 23.4 } }; el.hass = { ...window.__hass }; await new Promise(r => setTimeout(r, 200)); return a === root.querySelector('.rc') && root.querySelectorAll('.ring .c b')[1].textContent")
        check(kept == "23,4°", "a new value updates the page without rebuilding the cards")

        js("root.querySelector('.rh[data-act=rtoggle]').click(); await new Promise(r => setTimeout(r, 200));")
        check(js("return !!root.querySelector('.rsheet .ring') && root.querySelectorAll('.rsheet .dsec').length === 2"), "room dialog opens with ring and two sections")
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        check(not js("return !!root.querySelector('.rsheet')"), "Escape closes the dialog")

        show("history", histRange="1y")
        sub = js("return [...root.querySelectorAll('.h')].map((x) => x.textContent).join('|')")
        check("pro Monat" in sub, "the range switch applies to the cards below the chart")
        show("history", histRange="24h")
        check("pro Stunde" in js("return [...root.querySelectorAll('.h')].map((x) => x.textContent).join('|')"), "switching the range updates them again")

        check(not errors, "no page errors" + (f": {errors[0]}" if errors else ""))
        browser.close()
    return 1 if check.failed else 0


if __name__ == "__main__":
    sys.exit(main())

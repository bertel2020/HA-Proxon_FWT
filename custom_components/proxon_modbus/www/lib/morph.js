// Update a live DOM to match new markup by changing only what differs, so scroll position, focus,
// open tooltips, running animations and event listeners on unchanged nodes survive a refresh.

const same = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.localName === b.localName && a.namespaceURI === b.namespaceURI));

function syncAttrs(a, b) {
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  // Form state lives in properties once the user has touched a control, not in the attribute.
  if ("checked" in a) a.checked = b.hasAttribute("checked");
  if (("value" in a) && ["INPUT", "SELECT", "TEXTAREA"].includes(a.tagName) && a !== a.getRootNode().activeElement && a.value !== b.getAttribute("value") && b.hasAttribute("value")) a.value = b.getAttribute("value");
}

function morphChildren(from, to) {
  const a = [...from.childNodes], b = [...to.childNodes];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    if (!y) from.removeChild(x);
    else if (!x) from.appendChild(y);
    else if (!same(x, y)) from.replaceChild(y, x);
    else if (x.nodeType === 1) { syncAttrs(x, y); morphChildren(x, y); }
    else if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue;
  }
}

export function patchDom(root, html) {
  const t = typeof document !== "undefined" && document.createElement ? document.createElement("template") : null;
  if (!t || !("content" in t) || !root.firstChild) { root.innerHTML = html; return; }
  t.innerHTML = html;
  morphChildren(root, t.content);
}

/**
 * Script injected into the session WebView via `injectedJavaScript`.
 *
 * Why this exists: on recent Android WebViews the page viewport shrinks when
 * the IME (keyboard) appears and the engine scrolls the focused input into
 * view by itself. Older WebViews (e.g. Android 10) do not, and in an
 * edge-to-edge app the legacy `adjustResize` window mode is ignored — so
 * tapping an input leaves it sitting under the keyboard.
 *
 * The script restores that behavior in a version-independent way: when the
 * visual viewport resizes (keyboard shown/hidden) and the focused element is
 * a text input that is clipped, scroll it back into view. The check is a
 * no-op when the element is already visible, so on newer devices — where the
 * engine already adjusted — it never double-scrolls.
 */
export const imeFixScript = `
(function () {
  'use strict';
  if (!window.visualViewport) { return; }

  var EPS = 2; // px of slack so an element sitting flush at the edge counts as visible

  function isEditable(el) {
    if (!el || !el.tagName) { return false; }
    var tag = el.tagName.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      var type = (el.getAttribute('type') || 'text').toLowerCase();
      return ['button', 'submit', 'reset', 'image', 'file', 'hidden'].indexOf(type) === -1;
    }
    if (tag === 'BODY' || tag === 'HTML') { return false; }
    return el.isContentEditable === true;
  }

  // How much (in px) the element is clipped relative to the *visual*
  // viewport (the part not covered by the keyboard). Negative = clipped.
  function clip(el) {
    var vv = window.visualViewport;
    var r = el.getBoundingClientRect();
    return {
      top: r.top - vv.offsetTop,
      bottom: vv.height - (r.bottom - vv.offsetTop),
    };
  }

  function isVisible(el) {
    var c = clip(el);
    return c.top >= -EPS && c.bottom >= -EPS;
  }

  function refocus(el) {
    var c = clip(el);
    if (c.top >= -EPS && c.bottom >= -EPS) { return; }
    try {
      el.scrollIntoView({ block: 'nearest' });
    } catch (e) {
      el.scrollIntoView(true); // very old engines
    }
    // Fallback for pages whose scroller does not move on scrollIntoView:
    // nudge the window by the clipped amount.
    var c2 = clip(el);
    var dy = 0;
    if (c2.top < -EPS) { dy = c2.top + EPS; }
    else if (c2.bottom < -EPS) { dy = c2.bottom + EPS; }
    if (dy !== 0) { window.scrollBy(0, dy); }
  }

  var pending = null;
  function onResize() {
    if (pending) { clearTimeout(pending); }
    // Let the layout settle after the viewport resize.
    pending = setTimeout(function () {
      pending = null;
      var el = document.activeElement;
      if (isEditable(el) && !isVisible(el)) { refocus(el); }
    }, 80);
  }

  window.visualViewport.addEventListener('resize', onResize);
})();
`;

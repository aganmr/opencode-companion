/**
 * Page-side probe for "can the web app go back in history?".
 *
 * The native side has no imperative canGoBack() in react-native-webview v14,
 * and onNavigationRequest only fires for cross-document navigations — the
 * opencode UI is an SPA, so most of its history is pushState entries that
 * never surface natively. The page therefore tracks its own depth:
 *   - SPA entries: a pushState/replaceState counter persisted in
 *     sessionStorage (survives cross-document reloads in the same tab),
 *     decremented on popstate;
 *   - cross-document entries: document.referrer is non-empty when the page
 *     was reached from another page in this session.
 * The answer is sent over the standard ReactNativeWebView postMessage
 * bridge (the same channel the screen's onMessage handler already uses).
 *
 * NOTE: `history.length > 1` is NOT a valid canGoBack test — it counts
 * forward entries too, so it stays true after going back to the first page.
 */
export const historyProbeScript = `
(function () {
  try {
    var KEY = '__ocHistDepth';
    var depth = parseInt(sessionStorage.getItem(KEY) || '0', 10) || 0;
    function save() {
      try { sessionStorage.setItem(KEY, String(depth)); } catch (e) {}
    }
    function report() {
      try {
        var canGoBack = depth > 0 || document.referrer !== '';
        window.ReactNativeWebView &&
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ canGoBack: canGoBack })
          );
      } catch (e) {}
    }
    var origPush = history.pushState;
    history.pushState = function () {
      depth += 1;
      save();
      var r = origPush.apply(this, arguments);
      report();
      return r;
    };
    var origReplace = history.replaceState;
    history.replaceState = function () {
      var r = origReplace.apply(this, arguments);
      save();
      report();
      return r;
    };
    window.addEventListener('popstate', function () {
      depth = Math.max(0, depth - 1);
      save();
      report();
    });
    window.__ocHistoryProbe = report;
    report();
  } catch (e) {}
})();
`;

/** Inject after load (and after each programmatic goBack) to refresh the flag. */
export const requestHistoryProbe =
  'window.__ocHistoryProbe && window.__ocHistoryProbe();';

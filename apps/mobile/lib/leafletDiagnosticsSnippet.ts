/**
 * Script-error + console bridge injected at the top of every map WebView document, before Leaflet
 * loads, so CDN/parse/init failures reach Metro through ReactNativeWebView.postMessage instead of
 * dying silently in a grey WebView. Exposes window.__cavitourDiag(level, message).
 */
export const DIAGNOSTICS_SNIPPET = `(function () {
  function postDiag(level, message) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', level: level, message: String(message).slice(0, 900) }));
      }
    } catch (e) {}
  }
  window.__cavitourDiag = postDiag;
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var original = window.console && typeof window.console[level] === 'function' ? window.console[level].bind(window.console) : function () {};
    window.console[level] = function () {
      var parts = [];
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        try { parts.push(typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)); } catch (e) { parts.push('[unserializable]'); }
      }
      postDiag(level, parts.join(' '));
      original.apply(null, arguments);
    };
  });
  window.addEventListener('error', function (ev) {
    postDiag('error', 'window.onerror: ' + (ev.message || 'unknown') + ' @ ' + (ev.filename || 'inline') + ':' + (ev.lineno || '?') + ':' + (ev.colno || '?') + (ev.error && ev.error.stack ? ' | ' + ev.error.stack : ''));
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var reason = ev.reason;
    postDiag('error', 'unhandledrejection: ' + (reason && (reason.stack || reason.message) ? (reason.stack || reason.message) : String(reason)));
  });
})();`;

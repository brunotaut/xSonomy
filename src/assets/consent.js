// Cookie consent banner for GA4 Consent Mode.
//
// The consent *defaults* are set inline in every page's <head> (denied), because they must
// run before gtag.js does. This file only draws the banner and records the visitor's choice,
// so it can load deferred without affecting whether cookies are set.
//
// Declining is as easy as accepting, and nothing is stored until the visitor chooses — a
// banner that only offers "accept" is not consent.

(function () {
  var KEY = "xs-consent";
  var get = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var set = function (v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } };

  // Already decided — the <head> snippet has restored a "granted" choice already.
  if (get()) return;

  var css = document.createElement("style");
  css.textContent =
    ".xs-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;gap:14px;" +
    "align-items:center;flex-wrap:wrap;justify-content:center;padding:13px 18px;" +
    "background:#0f1418;border-top:1px solid rgba(255,255,255,.12);color:#e7ecef;" +
    "font:13px/1.5 'Inter Tight',system-ui,sans-serif}" +
    ".xs-consent p{margin:0;max-width:62ch}" +
    ".xs-consent a{color:#5fd0e0}" +
    ".xs-consent button{font:11px/1 'Share Tech Mono',ui-monospace,monospace;letter-spacing:.14em;" +
    "text-transform:uppercase;padding:9px 16px;cursor:pointer;background:transparent;" +
    "border:1px solid rgba(255,255,255,.25);color:#e7ecef}" +
    ".xs-consent button:hover{border-color:#5fd0e0;color:#5fd0e0}" +
    ".xs-consent button.ok{background:#5fd0e0;border-color:#5fd0e0;color:#08252b}" +
    ".xs-consent button.ok:hover{color:#08252b;opacity:.9}" +
    "@media(max-width:620px){.xs-consent{font-size:12px;padding:12px}}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.className = "xs-consent";
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Cookie consent");
  bar.innerHTML =
    "<p>We would like to set analytics cookies to understand how the catalogue is used. " +
    "They are off unless you accept, and the site works either way.</p>" +
    '<span><button type="button" class="no">Decline</button> ' +
    '<button type="button" class="ok">Accept</button></span>';

  var close = function (choice) {
    set(choice);
    if (choice === "granted" && typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: "granted" });
    }
    bar.remove();
  };
  bar.querySelector(".ok").addEventListener("click", function () { close("granted"); });
  bar.querySelector(".no").addEventListener("click", function () { close("denied"); });

  (document.body || document.documentElement).appendChild(bar);
})();

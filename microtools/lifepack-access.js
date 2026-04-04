/**
 * lifepack-access.js  –  LifePack client-side access control
 * ─────────────────────────────────────────────────────────────
 * SECURITY NOTE: This is client-side gating only. A determined
 * user could bypass it via DevTools; for stronger protection,
 * serve tool pages only after server-side session validation.
 */

(function () {
  "use strict";

  /* ── Constants ─────────────────────────────────────────────── */
  const PAID_KEY      = "lifepack_paid_v1";
  const PAID_VAL      = "1";
  const STRIPE_URL    = "https://buy.stripe.com/14A4gyfoDenrghNeVXaAw00";
  const OFFER_PAGE    = "bundle.html";          // relative to site root
  const HOME_PAGE     = "/index.html";

  /* Shared button styles (modal + overlay) — before inject* uses it */
  const LP_BTN_STYLES = [
    ".lp-btn {",
    "  display: inline-block; padding: .6rem 1.25rem; border-radius: 8px;",
    "  font-size: .95rem; font-weight: 600; text-decoration: none;",
    "  cursor: pointer; border: none; transition: opacity .15s;",
    "}",
    ".lp-btn:hover { opacity: .85; }",
    ".lp-btn-primary   { background: #635bff; color: #fff; }",
    ".lp-btn-secondary { background: #111;    color: #fff; }",
    ".lp-btn-ghost     { background: transparent; color: #555;",
    "  border: 1.5px solid #ccc; }",
  ].join("\n");

  /* ── Helper ─────────────────────────────────────────────────── */
  function isPaid() {
    return localStorage.getItem(PAID_KEY) === PAID_VAL;
  }

  /* ══════════════════════════════════════════════════════════════
     1. HOMEPAGE  –  intercept tool links + modal
  ══════════════════════════════════════════════════════════════ */
  function initHomepage() {
    if (!document.querySelector('a.btn.btn-secondary[href^="tools/"]')) return;

    /* Build modal once */
    const modal = buildModal({
      titleText : "Payment required",
      bodyText  : "LifePack is a one-time $9 purchase that unlocks all five " +
                  "tools permanently. No subscriptions, no hidden fees.",
      offerHref : OFFER_PAGE,
    });
    document.body.appendChild(modal);

    /* Intercept every tool link */
    document.querySelectorAll('a.btn.btn-secondary[href^="tools/"]')
      .forEach(function (link) {
        link.addEventListener("click", function (e) {
          if (isPaid()) return;           // paid → navigate normally
          e.preventDefault();
          openModal(modal);
        });
      });
  }

  /* ══════════════════════════════════════════════════════════════
     2. TOOL PAGES  –  full-screen overlay if not paid
  ══════════════════════════════════════════════════════════════ */
  function initToolPage() {
    if (isPaid()) return;                 // paid → show app normally

    /* Overlay covers everything already rendered */
    const overlay = document.createElement("div");
    overlay.id = "lp-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "lp-ol-title");
    overlay.setAttribute("aria-describedby", "lp-ol-body");

    overlay.innerHTML = [
      '<div class="lp-ol-box">',
      '  <h2 id="lp-ol-title">Payment required</h2>',
      '  <p  id="lp-ol-body">',
      '    LifePack is a one-time $9 purchase that unlocks all five tools',
      '    permanently. No subscriptions, no hidden fees.',
      '  </p>',
      '  <div class="lp-ol-actions">',
      '    <a href="' + STRIPE_URL + '" target="_blank" rel="noopener"',
      '       class="lp-btn lp-btn-primary">Pay with Stripe</a>',
      '    <a href="' + resolveRoot(OFFER_PAGE) + '"',
      '       class="lp-btn lp-btn-secondary">View offer</a>',
      '    <a href="' + HOME_PAGE + '"',
      '       class="lp-btn lp-btn-ghost">← Back to home</a>',
      '  </div>',
      '</div>',
    ].join("\n");

    injectOverlayStyles();
    document.body.appendChild(overlay);

    /* Trap focus inside overlay */
    trapFocus(overlay);
  }

  /* ══════════════════════════════════════════════════════════════
     ROUTER  –  decide which mode to run
  ══════════════════════════════════════════════════════════════ */
  var path = window.location.pathname;

  if (/\/tools\/[^/]+\.html(\?.*)?$/i.test(path)) {
    /* We're on a tool page */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initToolPage);
    } else {
      initToolPage();
    }
  } else {
    /* Assume homepage (or any page that hosts the tool links) */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initHomepage);
    } else {
      initHomepage();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     MODAL BUILDER  (homepage)
  ══════════════════════════════════════════════════════════════ */
  function buildModal(opts) {
    injectModalStyles();

    var el = document.createElement("div");
    el.id = "lp-modal-backdrop";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "lp-modal-title");
    el.setAttribute("aria-describedby", "lp-modal-body");
    el.setAttribute("aria-hidden", "true");   // hidden until opened

    el.innerHTML = [
      '<div class="lp-modal-box" tabindex="-1">',
      '  <h2 id="lp-modal-title">' + opts.titleText + '</h2>',
      '  <p  id="lp-modal-body">'  + opts.bodyText  + '</p>',
      '  <div class="lp-modal-actions">',
      '    <a href="' + STRIPE_URL + '" target="_blank" rel="noopener"',
      '       class="lp-btn lp-btn-primary" id="lp-stripe-btn">Pay with Stripe</a>',
      '    <a href="' + opts.offerHref + '"',
      '       class="lp-btn lp-btn-secondary" id="lp-offer-btn">View offer</a>',
      '    <button class="lp-btn lp-btn-ghost" id="lp-close-btn"',
      '            aria-label="Close payment dialog">Close</button>',
      '  </div>',
      '</div>',
    ].join("\n");

    /* Close handlers */
    el.addEventListener("click", function (e) {
      if (e.target === el) closeModal(el);   // click backdrop
    });
    el.querySelector("#lp-close-btn").addEventListener("click", function () {
      closeModal(el);
    });

    /* Keyboard: Escape */
    el.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal(el);
    });

    return el;
  }

  function openModal(modal) {
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "flex";
    var box = modal.querySelector(".lp-modal-box");
    if (box) box.focus();
    trapFocus(modal);
  }

  function closeModal(modal) {
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
  }

  /* ══════════════════════════════════════════════════════════════
     FOCUS TRAP  (shared)
  ══════════════════════════════════════════════════════════════ */
  function trapFocus(container) {
    var focusable = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    container.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;

      var nodes = Array.prototype.slice.call(
        container.querySelectorAll(focusable)
      ).filter(function (n) { return n.offsetParent !== null; });

      if (!nodes.length) { e.preventDefault(); return; }

      var first = nodes[0];
      var last  = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════════════════ */

  /** Resolve a root-relative path from inside tools/ subdirectory */
  function resolveRoot(page) {
    return "../" + page;
  }

  function injectModalStyles() {
    if (document.getElementById("lp-modal-styles")) return;
    var s = document.createElement("style");
    s.id  = "lp-modal-styles";
    s.textContent = [
      "#lp-modal-backdrop {",
      "  display: none; position: fixed; inset: 0;",
      "  background: rgba(0,0,0,.55); z-index: 9999;",
      "  justify-content: center; align-items: center; padding: 1rem;",
      "}",
      ".lp-modal-box {",
      "  background: #fff; border-radius: 12px; padding: 2rem;",
      "  max-width: 420px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.25);",
      "  outline: none;",
      "}",
      ".lp-modal-box h2 { margin: 0 0 .75rem; font-size: 1.35rem; color: #111; }",
      ".lp-modal-box p  { margin: 0 0 1.5rem;  color: #444; line-height: 1.5; }",
      ".lp-modal-actions { display: flex; flex-wrap: wrap; gap: .625rem; }",
      LP_BTN_STYLES,
    ].join("\n");
    document.head.appendChild(s);
  }

  function injectOverlayStyles() {
    if (document.getElementById("lp-overlay-styles")) return;
    var s = document.createElement("style");
    s.id  = "lp-overlay-styles";
    s.textContent = [
      "#lp-overlay {",
      "  position: fixed; inset: 0; z-index: 9999;",
      "  background: rgba(255,255,255,.97);",
      "  display: flex; justify-content: center; align-items: center; padding: 1.5rem;",
      "}",
      ".lp-ol-box {",
      "  max-width: 460px; width: 100%; text-align: center;",
      "}",
      ".lp-ol-box h2 { font-size: 1.6rem; margin: 0 0 1rem; color: #111; }",
      ".lp-ol-box p  { color: #444; line-height: 1.6; margin: 0 0 2rem; }",
      ".lp-ol-actions { display: flex; flex-wrap: wrap; gap: .625rem;",
      "  justify-content: center; }",
      LP_BTN_STYLES,
    ].join("\n");
    document.head.appendChild(s);
  }

  /** Call from success.html after Stripe redirects here. */
  window.lifepackMarkPaid = function () {
    try {
      localStorage.setItem(PAID_KEY, PAID_VAL);
    } catch (e) {}
  };

})();

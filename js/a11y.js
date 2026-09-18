/* Two small corrections that need JS to know the viewport.

   The skip link points at the sidebar. Below 900px the sidebar is a closed
   sheet — inert and invisible — so skipping to it lands a keyboard user on
   something deliberately unreachable. There, the link opens the sheet instead.

   And the settings popover offers "Command menu ⌘K", which palette.js does not
   build on a touch-only device. A menu item that does nothing is worse than a
   menu item that is not there. */
(() => {
  "use strict";
  const isSheet = () => matchMedia("(max-width: 900px)").matches;

  document.querySelector("[data-skip]")?.addEventListener("click", e => {
    if (!isSheet()) return;                 // the rail is right there; let it through
    e.preventDefault();
    document.getElementById("side-toggle")?.click();
  });

  if (matchMedia("(hover: none) and (pointer: coarse)").matches) {
    document.querySelectorAll("[data-open-palette]").forEach(b => b.remove());
  }

  /* A focus trap, shared by every layer that opens over the page.
     Rather than enumerating focusable children — which goes stale the moment
     the palette re-renders its list — this watches focusin and pulls focus
     back the moment it leaves. Tab and Shift+Tab both wrap, and so does
     anything else that moves focus. */
  const FOCUSABLE =
    'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

  window.__trap = (root) => {
    /* Which end to wrap to depends on which way the user was going, so remember
       the last Tab's shift state. Restoring the previously focused element
       instead — as this did at first — contains focus but never cycles: Tab
       past the last item just re-focused the last item. */
    let back = false;
    const onKey = (e) => { if (e.key === "Tab") back = e.shiftKey; };
    const onFocus = (e) => {
      if (root.contains(e.target)) return;
      const items = [...root.querySelectorAll(FOCUSABLE)]
        .filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      (back ? items[items.length - 1] : items[0] || root)?.focus?.();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocus);
    };
  };
})();

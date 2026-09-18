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
  window.__trap = (root) => {
    const inside = (n) => root.contains(n);
    const firstIn = () => root.querySelector(
      'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
    let last = null;
    const onFocus = (e) => {
      if (inside(e.target)) { last = e.target; return; }
      const back = (last && inside(last) && last.isConnected) ? last : firstIn() || root;
      back.focus?.();
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  };
})();

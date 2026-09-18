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
})();

/* Settings popover.
   Appearance used to be three buttons pinned in the corner, permanently
   competing with the content for attention. It is a preference, not a
   feature — so it lives behind a gear, the way Notion keeps its own. */
(() => {
  "use strict";
  const btn = document.getElementById("gear");
  const pop = document.getElementById("settings");
  if (!btn || !pop) return;

  const open = () => {
    pop.classList.add("on"); btn.setAttribute("aria-expanded", "true");
    pop.querySelector("button")?.focus({ preventScroll: true });
  };
  const close = () => { pop.classList.remove("on"); btn.setAttribute("aria-expanded", "false"); };
  const toggle = () => (pop.classList.contains("on") ? close() : open());

  btn.addEventListener("click", e => { e.stopPropagation(); toggle(); });
  document.addEventListener("click", e => {
    if (pop.classList.contains("on") && !pop.contains(e.target)) close();
  });
  addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  // the tour and the palette own their own behaviour; settings just points at them
  pop.querySelector("[data-replay-tour]")?.addEventListener("click", () => {
    close(); window.__startTour?.();
  });
  pop.querySelector("[data-open-palette]")?.addEventListener("click", close);
})();

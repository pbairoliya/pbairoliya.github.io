/* Settings popover.
   Appearance used to be three buttons pinned in the corner, permanently
   competing with the content for attention. It is a preference, not a
   feature — so it lives behind a gear, the way Notion keeps its own. */
(() => {
  "use strict";
  const btn = document.getElementById("gear");
  const pop = document.getElementById("settings");
  if (!btn || !pop) return;

  /* A popover, not a modal: tabbing past the last item should dismiss it, the
     same way clicking outside already does. Without this, focus walked onto the
     page behind while the popover stayed open. */
  const onFocusOut = (e) => {
    if (!pop.contains(e.target) && e.target !== btn) close({ refocus: false });
  };
  const open = () => {
    pop.classList.add("on"); btn.setAttribute("aria-expanded", "true");
    pop.querySelector("button")?.focus({ preventScroll: true });
    document.addEventListener("focusin", onFocusOut);
  };
  const close = ({ refocus = true } = {}) => {
    const wasOpen = pop.classList.contains("on");
    document.removeEventListener("focusin", onFocusOut);
    pop.classList.remove("on");
    btn.setAttribute("aria-expanded", "false");
    // focus belongs back on the gear, not on <body>
    if (wasOpen && refocus) btn.focus({ preventScroll: true });
  };
  const toggle = () => (pop.classList.contains("on") ? close() : open());

  btn.addEventListener("click", e => { e.stopPropagation(); toggle(); });
  document.addEventListener("click", e => {
    if (pop.classList.contains("on") && !pop.contains(e.target)) close({ refocus: false });
  });
  addEventListener("keydown", e => {
    // one Escape should close ONE thing — the topmost open layer
    if (e.key !== "Escape") return;
    if (document.querySelector(".tour") || document.getElementById("palette")?.classList.contains("on")) return;
    if (pop.classList.contains("on")) { e.stopImmediatePropagation(); close(); }
  });

  // the tour and the palette own their own behaviour; settings just points at them
  pop.querySelector("[data-replay-tour]")?.addEventListener("click", () => {
    close(); window.__startTour?.();
  });
  pop.querySelector("[data-open-palette]")?.addEventListener("click", close);
  pop.querySelector("[data-collapse-side]")?.addEventListener("click", () => {
    close(); document.getElementById("side-collapse")?.click();
  });
})();

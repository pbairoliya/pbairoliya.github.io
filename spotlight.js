/* Crossing highlight.
   Instead of a cursor ornament, the content itself responds: whatever your
   pointer is over lifts, takes an accent border, and carries a soft light that
   tracks the pointer across it. Pure decoration — nothing here is load-bearing,
   and it is skipped entirely for touch and for reduced-motion. */
(() => {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SELECTOR = ".job, .card, .cred, .tool, .btn";
  let nodes = [];
  let active = null;
  let raf = 0, pending = null;

  const collect = () => { nodes = [...document.querySelectorAll(SELECTOR)]; };
  collect();
  addEventListener("resize", collect, { passive: true });

  function paint() {
    raf = 0;
    const e = pending; pending = null;
    if (!e) return;

    // elementFromPoint is cheap and exact — no per-node geometry loop
    const hit = document.elementFromPoint(e.x, e.y)?.closest(SELECTOR) || null;

    if (hit !== active) {
      active?.classList.remove("lit");
      active = hit;
      active?.classList.add("lit");
    }
    if (active) {
      const r = active.getBoundingClientRect();
      active.style.setProperty("--mx", ((e.x - r.left) / r.width * 100).toFixed(1) + "%");
      active.style.setProperty("--my", ((e.y - r.top) / r.height * 100).toFixed(1) + "%");
    }
  }

  addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    pending = { x: e.clientX, y: e.clientY };
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });

  addEventListener("pointerleave", () => {
    active?.classList.remove("lit");
    active = null;
  });
})();

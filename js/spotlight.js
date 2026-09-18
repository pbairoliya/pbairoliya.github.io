/* Crossing highlight.
   Whatever the pointer is over gets a soft glow, a border lit from the side
   nearest the pointer, and a small lift. The light EASES toward the cursor
   instead of snapping to it, which is most of why it feels good.
   Pure decoration: skipped for touch and for reduced-motion. */
(() => {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SELECTOR = ".job, .card, .cred, .tool, .btn";
  const EASE = 0.18;                 // how fast the light catches up (0..1)

  let active = null;                 // element currently lit
  let target = null;                 // where the pointer actually is
  let cur = { x: 0, y: 0 };          // where the light currently is
  let want = { x: 0, y: 0 };
  let raf = 0;

  /* Each lit element carries its own border layer. Adding it once and leaving
     it in place is cheaper than creating and destroying nodes on every move. */
  function edgeOf(el) {
    let e = el.querySelector(":scope > .lit-edge");
    if (!e) {
      e = document.createElement("span");
      e.className = "lit-edge";
      e.setAttribute("aria-hidden", "true");
      el.appendChild(e);
    }
    return e;
  }
  function railOf(el) {
    if (!el.classList.contains("job")) return null;
    let r = el.querySelector(":scope > .rail");
    if (!r) {
      r = document.createElement("span");
      r.className = "rail";
      r.setAttribute("aria-hidden", "true");
      el.appendChild(r);
    }
    return r;
  }

  function setActive(el) {
    if (el === active) return;
    active?.classList.remove("lit");
    active = el;
    if (!active) return;
    edgeOf(active); railOf(active);
    const r = active.getBoundingClientRect();
    // start the light where the pointer entered, so it doesn't sweep in from 0,0
    cur = { x: want.x - r.left, y: want.y - r.top };
    active.classList.add("lit");
  }

  function tick() {
    raf = 0;
    if (active) {
      const r = active.getBoundingClientRect();
      const tx = want.x - r.left, ty = want.y - r.top;
      cur.x += (tx - cur.x) * EASE;
      cur.y += (ty - cur.y) * EASE;
      active.style.setProperty("--mx", (cur.x / r.width * 100).toFixed(2) + "%");
      active.style.setProperty("--my", (cur.y / r.height * 100).toFixed(2) + "%");
      // keep easing until the light has caught up
      if (Math.abs(tx - cur.x) > 0.4 || Math.abs(ty - cur.y) > 0.4) schedule();
    }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

  addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    want = { x: e.clientX, y: e.clientY };
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest(SELECTOR) || null;
    if (hit !== active) { target = hit; setActive(hit); }
    schedule();
  }, { passive: true });

  addEventListener("pointerleave", () => setActive(null));
  addEventListener("blur", () => setActive(null));
  addEventListener("scroll", schedule, { passive: true });
})();

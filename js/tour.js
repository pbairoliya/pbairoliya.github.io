/* First-visit walkthrough.
   Four steps, each pointing at something already on the page. It runs once
   ever — a tour that reappears is an annoyance, not an onboarding — and the
   whole thing is built after first paint so it never sits in the critical
   path.

   Every step is skipped rather than fatal if its target is missing, so the
   tour survives markup changes without anyone remembering to update it. */
(() => {
  "use strict";

  const KEY = "tour-done";
  const PAD = 8;          // breathing room between the highlight and the element
  const GAP = 14;         // between the highlight and the popover
  const EDGE = 12;        // keep the popover this far off the viewport edge

  const STEPS = [
    {
      sel: ".props",
      title: "The short version, up front",
      body: "Role, team, scale, stack, and where I am \u2014 without scrolling.",
    },
    {
      sel: ".pill",
      title: "The sections live up here",
      body: "It tracks where you are as you scroll, and the colour of the page shifts with it.",
    },
    {
      sel: ".palette-btn",
      title: "Everything is one keystroke away",
      body: "Press ⌘K (or /) for résumé, links, sections and theme in one place.",
    },
    {
      sel: ".gear",
      title: "Read it however you like",
      body: "Auto follows your system. Light and dark override it, and it remembers.",
    },
    {
      sel: ".card",
      title: "The write-ups go deeper",
      body: "Each project has its own page — what it does, and the decisions behind it.",
    },
  ];

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const seen = () => {
    try { return !!localStorage.getItem(KEY); } catch { return true; }
  };
  const remember = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* private mode; it just runs again */ }
  };

  function start() {
    // Resolve targets up front so a missing element costs nothing later.
    const steps = STEPS
      .map(s => ({ ...s, el: document.querySelector(s.sel) }))
      .filter(s => s.el);
    if (!steps.length) return;

    let i = 0;
    let frame = 0;
    const abort = new AbortController();
    const { signal } = abort;

    const root = document.createElement("div");
    root.className = "tour";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Quick tour");
    root.innerHTML =
      '<div class="tour-hole"></div>' +
      '<div class="tour-pop">' +
        '<h4></h4><p></p>' +
        '<div class="tour-foot">' +
          '<span class="tour-count"></span>' +
          '<button type="button" class="tour-btn skip">Skip</button>' +
          '<button type="button" class="tour-btn go"></button>' +
        '</div>' +
      '</div>';

    const hole  = root.querySelector(".tour-hole");
    const pop   = root.querySelector(".tour-pop");
    const h4    = root.querySelector("h4");
    const para  = root.querySelector("p");
    const count = root.querySelector(".tour-count");
    const go    = root.querySelector(".go");

    /* One read of the target, then all the writes. Splitting it this way keeps
       a step to a single layout pass even while scroll is firing. */
    function place() {
      frame = 0;
      const s = steps[i];
      if (!s) return;
      const r = s.el.getBoundingClientRect();

      const w = r.width + PAD * 2;
      const h = r.height + PAD * 2;
      hole.style.width = w + "px";
      hole.style.height = h + "px";
      hole.style.transform = `translate(${r.left - PAD}px, ${r.top - PAD}px)`;

      // below the target when there is room for it, otherwise above
      const ph = pop.offsetHeight;
      const pw = pop.offsetWidth;
      const below = r.bottom + GAP + ph < innerHeight - EDGE;
      const y = below ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - ph);
      const x = Math.min(
        Math.max(EDGE, r.left + r.width / 2 - pw / 2),
        innerWidth - pw - EDGE
      );
      pop.style.transform = `translate(${x}px, ${y}px)`;
    }

    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };

    function show() {
      const s = steps[i];
      h4.textContent = s.title;
      para.textContent = s.body;
      count.textContent = `${i + 1} / ${steps.length}`;
      go.textContent = i === steps.length - 1 ? "Done" : "Next";

      // A target below the fold has to be on screen before measuring it.
      const r = s.el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) {
        s.el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        setTimeout(schedule, reduced ? 0 : 340);
      }
      schedule();
    }

    function next() {
      if (++i >= steps.length) return finish();
      show();
    }

    function finish() {
      remember();
      abort.abort();
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove("on");
      const bye = () => root.remove();
      reduced ? bye() : setTimeout(bye, 300);
    }

    go.addEventListener("click", next, { signal });
    root.querySelector(".skip").addEventListener("click", finish, { signal });
    addEventListener("resize", schedule, { passive: true, signal });
    addEventListener("scroll", schedule, { passive: true, signal });
    addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); finish(); return; }
      if (e.key !== "Enter" && e.key !== "ArrowRight") return;
      // A focused button already turns Enter into a click; handling it here too
      // would advance two steps at once.
      if (e.key === "Enter" && e.target.closest(".tour-btn")) return;
      e.preventDefault();
      next();
    }, { signal });

    document.body.appendChild(root);
    show();
    requestAnimationFrame(() => root.classList.add("on"));
    go.focus({ preventScroll: true });
  }

  // Re-runnable on demand, which is also how the command palette offers it.
  window.__startTour = () => {
    if (!document.querySelector(".tour")) start();
  };

  if (seen()) return;
  // After first paint, always. Nothing here is worth delaying the page for.
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 600));
  idle(() => start(), { timeout: 2000 });
})();

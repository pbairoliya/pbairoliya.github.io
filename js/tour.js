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

  /* A phone has no ⌘K, no hover and no permanent rail, so it gets its own
     script. Pointing a touch visitor at a keyboard shortcut is the fastest way
     to make an onboarding feel like it was written for somebody else. */

  /* The rail can be collapsed away, in which case .side-head is hidden and the
     only thing to point at is the button that brings it back. Resolved when the
     tour starts, not when the file loads. */
  const railVisible = () => {
    /* getClientRects() still returns a box for a visibility:hidden element —
       only display:none gives zero — so geometry cannot answer this. Ask the
       state that actually hides the rail. */
    if (document.body.classList.contains("side-collapsed")) return false;
    if (matchMedia("(max-width: 900px)").matches) return false;
    const el = document.querySelector(".side-head");
    return !!el && getComputedStyle(el).visibility !== "hidden";
  };

  const DESKTOP_STEPS = [
    {
      get sel() { return railVisible() ? ".side-head" : ".side-toggle"; },
      get title() {
        return railVisible() ? "Everything lives in the sidebar" : "The menu lives here";
      },
      get body() {
        return railVisible()
          ? "Sections of this page, then my resume and links. Press [ to hide it."
          : "Sections of this page, my resume and my links. Press [ to bring it back.";
      },
    },
    {
      sel: ".palette-btn",
      title: "Everything is one keystroke away",
      body: "Press \u2318K, or /, for my resume, links, sections and theme in one place.",
    },
    {
      sel: ".gear",
      title: "Read it however you like",
      body: "Light, dark, or whatever your system is already set to.",
    },
    {
      sel: ".card",
      title: "The write-ups go deeper",
      body: "Each project has its own page \u2014 the decisions, and what I would do differently.",
    },
  ];

  const PHONE_STEPS = [
    {
      sel: ".side-toggle",
      title: "Menu lives here",
      body: "Every section of this page, plus my resume and links.",
    },
    {
      sel: ".btn.primary",
      title: "The resume, if that is what you came for",
      body: "One page, opens straight in your browser.",
    },
    {
      sel: ".gear",
      title: "Light or dark",
      body: "It follows your phone by default. Change it here if you would rather not.",
    },
    {
      sel: ".card",
      title: "Tap through for the detail",
      body: "Each project has a write-up \u2014 the decisions, and what I would do differently.",
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
    const steps = (matchMedia("(max-width: 900px)").matches ? PHONE_STEPS : DESKTOP_STEPS)
      .map(s => ({ ...s, el: document.querySelector(s.sel) }))
      .filter(s => s.el && s.el.getClientRects().length &&
                   getComputedStyle(s.el).visibility !== "hidden");
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

      /* Measure AFTER this step's text is in the DOM. Reading offsetHeight in
         the same tick as the content change used to return the PREVIOUS step's
         height, so a taller step overflowed the bottom and its buttons ended up
         off the frame. */
      const ph = pop.offsetHeight;
      const pw = pop.offsetWidth;

      /* Try four placements and take the first that does not sit on top of the
         thing it is pointing at. The old code only ever went below or above, so
         a tall target -- the sidebar is the whole viewport height -- left the
         popover covering the very element being highlighted. Clamped on both
         ends of both axes, because Math.min/Math.max in the wrong order inverts
         when the popover is bigger than the space, which is what happens on a
         phone. */
      const clamp = (v, lo, hi) => (hi < lo ? lo : Math.min(Math.max(v, lo), hi));
      const cx = clamp(r.left + r.width / 2 - pw / 2, EDGE, innerWidth - pw - EDGE);
      const cy = clamp(r.top + r.height / 2 - ph / 2, EDGE, innerHeight - ph - EDGE);

      const candidates = [
        { x: cx, y: r.bottom + GAP },                  // below
        { x: cx, y: r.top - GAP - ph },                // above
        { x: r.right + GAP, y: cy },                   // to the right
        { x: r.left - GAP - pw, y: cy },               // to the left
      ];

      const fits = (c) =>
        c.x >= EDGE && c.y >= EDGE &&
        c.x + pw <= innerWidth - EDGE && c.y + ph <= innerHeight - EDGE &&
        // and crucially: no overlap with the highlighted rect itself
        !(c.x < r.right + PAD && c.x + pw > r.left - PAD &&
          c.y < r.bottom + PAD && c.y + ph > r.top - PAD);

      let spot = candidates.find(fits);
      if (!spot) {
        /* Nothing clears it -- the target is most of the screen. Sit in the
           corner furthest from its centre so it covers as little as possible. */
        const midX = r.left + r.width / 2, midY = r.top + r.height / 2;
        spot = {
          x: midX > innerWidth / 2 ? EDGE : innerWidth - pw - EDGE,
          y: midY > innerHeight / 2 ? EDGE : innerHeight - ph - EDGE,
        };
      }
      const x = clamp(spot.x, EDGE, innerWidth - pw - EDGE);
      const y = clamp(spot.y, EDGE, innerHeight - ph - EDGE);
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
    requestAnimationFrame(() => requestAnimationFrame(place));
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
      /* Enter belongs to whatever is focused. Previously this swallowed it for
         the WHOLE document, so pressing Enter on any focused link advanced the
         tour instead of following the link. Only claim it when focus is on the
         tour itself or on nothing in particular. */
      const focused = document.activeElement;
      const inTour = focused && root.contains(focused);
      if (e.key === "Enter") {
        if (inTour && focused.closest(".tour-btn")) return;   // the button handles it
        if (focused && focused !== document.body && !inTour) return;
      }
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

  /* Deliberately not auto-run. It used to open a modal on first visit, which spent
     a recruiter's first fifteen seconds teaching them the sidebar — and on a phone
     the popover covered the h1 outright. Both entry points remain: the command
     palette ("Replay the tour") and the settings popover. */
})();

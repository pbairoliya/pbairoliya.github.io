/* Ambient CS + maths field behind the page.
   Drifts on its own; scatters and brightens around the cursor. Deliberately
   quiet under the content column so nothing here costs you readability. */
(() => {
  "use strict";

  // maths on the left of the join, computer science on the right
  const SYMBOLS = [
    ..."∫∑∂∇√π∞λθφΦΩ≈≠≤≥±×÷⊕⊗∀∃∈∉⊆∪∩ℝℕℤℚ⇒⟺⊢⊨⌈⌉⌊⌋¬∧∨∴∅⊤⊥≡≪≫",
    "&&", "||", "=>", "->", "<-", "|>", "::", "!=", "===", "??", "?.", "++",
    "{}", "[]", "()", "<>", "/*", "*/", "//", "#!", "~/", "&mut", "*ptr",
    "0x1F", "0b1010", "\\n", "\\0", "λx.x", "∘", "⊔", "⋈", "π₁", "σ",
    "O(1)", "Ω(n)", "Θ(1)", "∑ᵢ", "⟨k,v⟩", "⌘", "⇧", "⏎", "^C", "$", ">_",
  ];

  const SNIPPETS = [
    // complexity + algorithms
    "O(n log n)", "T(n) = 2T(n/2) + O(n)", "O(1) amortised", "Θ(V + E)",
    "binary search: lo + (hi-lo)/2", "left never moves backwards", "LRU", "B-tree",
    "monotonic stack", "two pointers", "memoize", "dp[i] = dp[i-1] + dp[i-2]",
    // systems
    "at-least-once ≠ exactly-once", "OpenTelemetry span", "day-over-day diff", "idempotent", "p99 < 250ms", "CAP",
    "quorum = ⌊n/2⌋ + 1", "retry with backoff + jitter", "Raft", "2PC",
    "ACID", "partition key", "write-ahead log", "cache-aside", "backpressure",
    "kubectl apply -f", "go func() { … }()", "defer mu.Unlock()", "ctx, cancel := …",
    "SELECT … GROUP BY", "EXPLAIN ANALYZE", "SHA-256", "git rebase -i",
    "ledger cutoff", "99M+ accounts / night",
    // maths
    "e^{iπ} + 1 = 0", "∑ 1/n² = π²/6", "∫e^{−x²}dx = √π", "φ = (1+√5)/2",
    "Ax = λx", "det(A − λI) = 0", "∂u/∂t = α∇²u", "P(A|B)P(B) = P(B|A)P(A)",
    "n! ~ √(2πn)(n/e)ⁿ", "‖v‖² = ⟨v,v⟩", "lim_{h→0} (f(x+h) − f(x))/h",
    "∇·E = ρ/ε₀", "2^{ℵ₀} > ℵ₀", "x_{n+1} = x_n − f(x_n)/f′(x_n)",
  ];

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const darkQ = matchMedia("(prefers-color-scheme: dark)");
  // an explicit choice (set by nav.js on <html data-theme>) wins over the OS
  const isDark = () => {
    const forced = document.documentElement.getAttribute("data-theme");
    return forced ? forced === "dark" : darkQ.matches;
  };

  const cv = document.createElement("canvas");
  cv.id = "field";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d", { alpha: true });

  let W = 0, H = 0, glyphs = [], colCentre = 0, colHalf = 400;
  const ptr = { x: -9999, y: -9999, on: false };

  /* ---- colour ---------------------------------------------------------
     The page is coloured by where you are. Every section owns a hue pair
     keyed by its slug. Cool hues only — no amber, no orange. Lightness is
     pinned per theme so accent text keeps its contrast whatever the hue
     happens to be. The crossing highlight borrows the live accent, so
     hovering matches the background you are hovering over. */
  /* Sections are spread right around the wheel rather than clustered in the
     blues, so moving between them is a change you notice rather than a shade
     you have to look for. Saturation and lightness are fixed per theme, so
     every one of these still clears WCAG AA as accent text. */
  const SECTION_HUES = {
    intro:       [192, 214],   // cyan → azure
    work:        [244, 266],   // indigo → violet
    stack:       [156, 178],   // green → teal
    projects:    [286, 312],   // violet → magenta
    writing:     [ 18,  40],   // coral → amber
    education:   [332, 356],   // magenta → rose
    credentials: [208, 232],   // sky → blue
  };
  const FALLBACK = SECTION_HUES.intro;
  const WOBBLE = 5, WOBBLE_MS = 21000, CHASE = 0.045;

  let want = FALLBACK.slice();
  let hue = want[0], hue2 = want[1];

  // shortest way round the wheel
  const stepHue = (a, b, k) => (a + (((b - a) % 360 + 540) % 360 - 180) * k + 360) % 360;

  addEventListener("sectionchange", e => { want = SECTION_HUES[e.detail] || FALLBACK; });

  function driftHue(now) {
    const w = Math.sin(now / WOBBLE_MS * Math.PI * 2) * WOBBLE;
    hue  = stepHue(hue,  want[0] + w, CHASE);
    hue2 = stepHue(hue2, want[1] - w, CHASE);

    const dark = isDark(), st = document.documentElement.style;
    // fixed lightness per theme = predictable contrast at every hue
    // lightness chosen so the WORST hue in the palette still clears WCAG AA
    // (4.5:1) against each theme's background — measured, not eyeballed.
    const A  = dark ? `hsl(${hue.toFixed(1)} 76% 80%)`  : `hsl(${hue.toFixed(1)} 58% 30%)`;
    const A2 = dark ? `hsl(${hue2.toFixed(1)} 70% 77%)` : `hsl(${hue2.toFixed(1)} 54% 34%)`;
    st.setProperty("--accent", A);
    st.setProperty("--accent-2", A2);
    st.setProperty("--wash",  `hsl(${hue.toFixed(1)} ${dark ? 66 : 62}% ${dark ? 56 : 58}%)`);
    st.setProperty("--hit",   A);          // hover matches the section colour
  }

  function palette() {
    return isDark() ? { ink: "232,234,240", lift: 1 } : { ink: "22,23,26", lift: 0.74 };
  }
  let pal = palette();
  darkQ.addEventListener?.("change", () => { pal = palette(); });
  addEventListener("themechange", () => { pal = palette(); });
  const hot = () => `hsl(${hue.toFixed(1)} ${isDark() ? "78% 72%" : "60% 42%"})`;

  function seed() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the reading column: glyphs behind it stay fainter
    const wrap = document.querySelector(".wrap");
    if (wrap) {
      const r = wrap.getBoundingClientRect();
      colCentre = r.left + r.width / 2;
      colHalf = r.width / 2 + 28;
    } else { colCentre = W / 2; }

    const n = Math.min(210, Math.round((W * H) / 12000));
    glyphs = [];
    for (let i = 0; i < n; i++) {
      const long = Math.random() < 0.46;
      const hx = Math.random() * W, hy = Math.random() * H;
      glyphs.push({
        hx, hy, x: hx, y: hy, vx: 0, vy: 0,
        text: long ? SNIPPETS[(Math.random() * SNIPPETS.length) | 0]
                   : SYMBOLS[(Math.random() * SYMBOLS.length) | 0],
        size: long ? 10.5 + Math.random() * 2.5 : 13 + Math.random() * 12,
        base: long ? 0.030 + Math.random() * 0.026 : 0.028 + Math.random() * 0.036,
        ph: Math.random() * Math.PI * 2,
      });
    }
  }

  const R = 165;                      // cursor influence radius

  function frame(now) {
    if (!reduced) driftHue(now);
    const hotColour = hot();
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const g of glyphs) {
      const dx = g.x - ptr.x, dy = g.y - ptr.y;
      const d = Math.hypot(dx, dy);
      const near = ptr.on && d < R ? 1 - d / R : 0;

      if (near > 0 && d > 0.001) {
        const push = near * near * 17;
        g.vx += (dx / d) * push * 0.04;
        g.vy += (dy / d) * push * 0.04;
      }
      g.vx += (g.hx - g.x) * 0.013; g.vy += (g.hy - g.y) * 0.013;
      g.vx *= 0.9; g.vy *= 0.9;
      g.x += g.vx; g.y += g.vy;

      // quieter behind the reading column, so text never fights the background
      const behindText = Math.abs(g.x - colCentre) < colHalf ? 0.42 : 1;
      const drift = reduced ? 0 : Math.sin(now / 3400 + g.ph) * 1.5;
      const a = (g.base * behindText + near * near * 0.5 * behindText) * pal.lift;

      ctx.font = `${g.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      if (near > 0.45) { ctx.globalAlpha = a; ctx.fillStyle = hotColour; }
      else { ctx.globalAlpha = 1; ctx.fillStyle = `rgba(${pal.ink},${a})`; }
      ctx.fillText(g.text, g.x, g.y + drift);
    }


    ctx.globalAlpha = 1;
    if (document.hidden) { running = false; return; }   // park, do not queue
    requestAnimationFrame(frame);
  }
  /* One guard, because the frame already queued before the tab hid will still
     fire on return. Without it each hide/show doubled the number of live loops
     and the canvas ran at 2^n speed. */
  let running = false;
  const start = () => {
    if (running || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  };
  document.addEventListener("visibilitychange", start);

  /* Mobile fires resize as the URL bar shows and hides during a scroll, and
     seed() re-randomises every glyph — the whole background reshuffling while
     you read. Debounce, and ignore height-only changes. */
  let reseed, lastW = 0;
  addEventListener("resize", () => {
    if (innerWidth === lastW) return;
    clearTimeout(reseed);
    reseed = setTimeout(() => { lastW = innerWidth; seed(); }, 180);
  }, { passive: true });
  addEventListener("scroll", () => {
    const wrap = document.querySelector(".wrap");
    if (wrap) colCentre = wrap.getBoundingClientRect().left + wrap.offsetWidth / 2;
  }, { passive: true });

  addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
  }, { passive: true });
  addEventListener("pointerleave", () => { ptr.on = false; ptr.x = ptr.y = -9999; });

  /* The field is decoration, so it must never be on the critical path: seed and
     start it once the browser is idle, after first paint. */
  driftHue(performance.now());          // colours are cheap and are needed immediately
  (window.requestIdleCallback || (f => setTimeout(f, 200)))(
    () => { seed(); start(); }, { timeout: 900 });

  /* Under reduced motion the loop never runs, so the colours are computed once
     at load — before palette.js has applied a stored data-theme. Recompute
     whenever the theme changes, or an explicit light/dark visitor is stuck with
     the other theme's accents forever. */
  addEventListener("themechange", () => driftHue(performance.now()));
  darkQ.addEventListener?.("change", () => driftHue(performance.now()));

  console.log(
    "%cyou opened the console. good instinct.",
    `font:600 13px ui-monospace,Menlo,monospace;color:hsl(264 78% 62%)`);
  console.log(
    "%cthe background is ~200 glyphs on a canvas with spring physics — no libraries." +
    "\nsource: github.com/pbairoliya/pbairoliya.github.io" +
    "\nif you are hiring, i would rather talk than be screened: pratik0520@gmail.com",
    "font:12px ui-monospace,Menlo,monospace;color:#8a8f9c");
})();

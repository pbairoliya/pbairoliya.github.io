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
    "at-least-once ≠ exactly-once", "idempotent", "p99 < 250ms", "CAP",
    "quorum = ⌊n/2⌋ + 1", "retry with backoff + jitter", "Raft", "2PC",
    "ACID", "partition key", "write-ahead log", "cache-aside", "backpressure",
    "kubectl apply -f", "go func() { … }()", "defer mu.Unlock()", "ctx, cancel := …",
    "SELECT … GROUP BY", "EXPLAIN ANALYZE", "SHA-256", "git rebase -i",
    "EOD settle → ledger", "80M records / night",
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

  /* ---- slow colour drift ----------------------------------------------
     One hue, wandering 186° → 288° (teal → blue → violet) and back over
     about three minutes. It drives the CSS accent AND the canvas, so links,
     borders, the tagline and the field all move together. Nothing jumps:
     a full sweep takes longer than anyone stays on the page. */
  const HUE_LO = 196, HUE_HI = 322, HUE_PERIOD = 52000;   // teal → blue → violet → magenta
  const HIT_HUE = 282;                                     // the purple things light up in
  let hue = HUE_LO;

  function driftHue(now) {
    const s = (Math.sin((now / HUE_PERIOD) * Math.PI * 2) + 1) / 2;   // 0..1
    hue = HUE_LO + s * (HUE_HI - HUE_LO);
    const dark = isDark(), st = document.documentElement.style;
    st.setProperty("--accent",  `hsl(${hue.toFixed(1)} ${dark ? "90% 74%" : "72% 42%"})`);
    st.setProperty("--accent-2", `hsl(${(hue + 34).toFixed(1)} ${dark ? "82% 68%" : "66% 46%"})`);
    st.setProperty("--hit",      `hsl(${HIT_HUE} ${dark ? "92% 72%" : "74% 48%"})`);
  }

  function palette() {
    const dark = isDark();
    return dark
      ? { ink: "232,234,240", lift: 1 }
      : { ink: "22,23,26",    lift: 0.74 };
  }
  let pal = palette();
  darkQ.addEventListener?.("change", () => { pal = palette(); });
  addEventListener("themechange", () => { pal = palette(); });
  const hot = () => `hsl(${hue.toFixed(1)} ${isDark() ? "85% 72%" : "68% 44%"})`;

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
    requestAnimationFrame(frame);
  }

  addEventListener("resize", seed, { passive: true });
  addEventListener("scroll", () => {
    const wrap = document.querySelector(".wrap");
    if (wrap) colCentre = wrap.getBoundingClientRect().left + wrap.offsetWidth / 2;
  }, { passive: true });

  addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
  }, { passive: true });
  addEventListener("pointerleave", () => { ptr.on = false; ptr.x = ptr.y = -9999; });

  seed();
  driftHue(performance.now());
  requestAnimationFrame(frame);

  console.log(
    "%cyou opened the console. good instinct.",
    `font:600 13px ui-monospace,Menlo,monospace;color:hsl(${HUE_LO} 80% 60%)`);
  console.log(
    "%cthe background is ~200 glyphs on a canvas with spring physics — no libraries." +
    "\nsource: github.com/pbairoliya/pbairoliya.github.io" +
    "\nif you are hiring, i would rather talk than be screened: pratik0520@gmail.com",
    "font:12px ui-monospace,Menlo,monospace;color:#8a8f9c");
})();

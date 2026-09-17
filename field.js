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

  const cv = document.createElement("canvas");
  cv.id = "field";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d", { alpha: true });

  let W = 0, H = 0, glyphs = [], trail = [], colCentre = 0, colHalf = 400;
  const ptr = { x: -9999, y: -9999, on: false };

  /* ---- slow colour drift ----------------------------------------------
     One hue, wandering 186° → 288° (teal → blue → violet) and back over
     about three minutes. It drives the CSS accent AND the canvas, so links,
     borders, the tagline and the field all move together. Nothing jumps:
     a full sweep takes longer than anyone stays on the page. */
  const HUE_LO = 186, HUE_HI = 288, HUE_PERIOD = 186000;
  let hue = HUE_LO;

  function driftHue(now) {
    const s = (Math.sin((now / HUE_PERIOD) * Math.PI * 2) + 1) / 2;   // 0..1
    hue = HUE_LO + s * (HUE_HI - HUE_LO);
    const dark = darkQ.matches;
    document.documentElement.style.setProperty(
      "--accent", `hsl(${hue.toFixed(1)} ${dark ? "88% 74%" : "70% 42%"})`);
  }

  function palette() {
    const dark = darkQ.matches;
    return dark
      ? { ink: "232,234,240", spark: "245,199,106", lift: 1 }
      : { ink: "22,23,26",    spark: "182,124,28",  lift: 0.74 };
  }
  let pal = palette();
  darkQ.addEventListener?.("change", () => { pal = palette(); });
  const hot = () => `hsl(${hue.toFixed(1)} ${darkQ.matches ? "85% 72%" : "68% 44%"})`;

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

    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i], age = (now - p.t) / 1000;
      if (age >= 1) { trail.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * age);
      ctx.font = `${12 + (1 - age) * 9}px ui-monospace, Menlo, monospace`;
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${pal.spark},${(1 - age) * 0.42 * pal.lift})`;
      ctx.fillText(p.ch, 0, 0);
      ctx.restore();
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
    if (reduced) return;
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(e.clientX - last.x, e.clientY - last.y) > 34) {
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now(),
                   ch: SYMBOLS[(Math.random() * SYMBOLS.length) | 0],
                   rot: (Math.random() - 0.5) * 0.7 });
      if (trail.length > 18) trail.shift();
    }
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

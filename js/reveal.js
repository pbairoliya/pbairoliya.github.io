/* Reveal sections as they enter the viewport. Falls back to showing everything
   at once when IntersectionObserver is missing or motion is reduced. */
(() => {
  "use strict";
  const items = document.querySelectorAll(".reveal, .stack-group");
  /* Arm the hidden state only now that this script is running. The CSS shows
     everything by default, so a blocked or broken script degrades to a plain,
     fully readable page instead of a blank one. */
  document.documentElement.classList.add("armed");
  if (!("IntersectionObserver" in window) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(n => n.classList.add("seen"));
    return;
  }

  const pending = new Set(items);
  const show = el => { if (pending.delete(el)) { el.classList.add("seen"); io.unobserve(el); } };

  /* Start the fade 14% of a viewport BEFORE the block arrives, so it is
     finished by the time it is properly on screen. The old margin held it back
     until the block was already 8% inside, which on a fast flick left a
     visibly empty panel for most of a second. */
  const io = new IntersectionObserver(rows => {
    rows.forEach(r => { if (r.isIntersecting) show(r.target); });
  }, { rootMargin: "0px 0px 14% 0px", threshold: 0 });
  items.forEach(n => io.observe(n));

  /* Safety net. The observer is delivered on its own schedule, and a flick
     that crosses several blocks in one frame can leave them blank behind the
     scroll. One rAF-coalesced pass over what is still pending — a set that
     drains to empty within the first screenful or two — catches those. */
  let queued = false;
  const sweep = () => {
    queued = false;
    if (!pending.size) return removeEventListener("scroll", onScroll);
    const h = innerHeight;
    [...pending].forEach(el => { if (el.getBoundingClientRect().top < h) show(el); });
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
})();

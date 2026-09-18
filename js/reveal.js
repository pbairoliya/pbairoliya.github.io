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
  const io = new IntersectionObserver(rows => {
    rows.forEach(r => {
      if (r.isIntersecting) { r.target.classList.add("seen"); io.unobserve(r.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach(n => io.observe(n));
})();

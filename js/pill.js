/* Floating pill nav: section links with a gliding highlight that follows the
   active section, and moves to whatever you hover. */
(() => {
  "use strict";
  const pill = document.querySelector(".pill");
  if (!pill) return;

  const links = [...pill.querySelectorAll("a")];
  const glide = pill.querySelector(".glide");
  const sections = links
    .map(a => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  let activeIdx = 0;

  function moveTo(el) {
    if (!el || !glide) return;
    const p = pill.getBoundingClientRect(), r = el.getBoundingClientRect();
    glide.style.width = r.width + "px";
    glide.style.transform = `translateX(${r.left - p.left}px)`;
  }
  const settle = () => moveTo(links[activeIdx]);

  links.forEach((a, i) => {
    a.addEventListener("mouseenter", () => moveTo(a));
    a.addEventListener("focus", () => moveTo(a));
    a.addEventListener("click", e => {
      e.preventDefault();
      document.querySelector(a.getAttribute("href"))?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  });
  pill.addEventListener("mouseleave", settle);

  function setActive(i) {
    if (i === activeIdx) return;
    activeIdx = i;
    links.forEach((a, j) => a.classList.toggle("on", j === i));
    if (!pill.matches(":hover")) settle();
  }

  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver(rows => {
      rows.forEach(r => {
        if (r.isIntersecting) setActive(sections.indexOf(r.target));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => io.observe(s));
  }

  links[0]?.classList.add("on");
  addEventListener("resize", settle, { passive: true });
  // fonts can land after first paint and shift the pills
  (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(settle));
  requestAnimationFrame(settle);
})();

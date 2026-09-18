/* Sidebar navigation, Notion-style.
   A left rail of pages rather than a bar across the top: it does not cover the
   writing, it can hold more entries than a pill can, and it is where anyone who
   has used Notion already looks. Collapses to a sheet behind a button on narrow
   screens, where a permanent rail would eat half the viewport. */
(() => {
  "use strict";
  const bar   = document.querySelector(".side");
  if (!bar) return;
  const toggle = document.getElementById("side-toggle");
  const links  = [...bar.querySelectorAll("a[href^='#']")];
  const scrim  = document.querySelector(".side-scrim");

  const sections = links.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  let active = -1;

  const isSheet = () => matchMedia("(max-width: 900px)").matches;
  const openSheet = () => {
    document.body.classList.add("side-open");
    toggle?.setAttribute("aria-expanded", "true");
    bar.removeAttribute("inert");
    // focus has to follow the sheet, or a keyboard user opens something they
    // then cannot reach
    bar.querySelector("a")?.focus({ preventScroll: true });
  };
  const closeSheet = () => {
    const wasOpen = document.body.classList.contains("side-open");
    document.body.classList.remove("side-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (isSheet()) bar.setAttribute("inert", "");
    if (wasOpen) toggle?.focus({ preventScroll: true });
  };

  toggle?.addEventListener("click", () =>
    document.body.classList.contains("side-open") ? closeSheet() : openSheet());
  scrim?.addEventListener("click", closeSheet);
  addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

  links.forEach((a, i) => a.addEventListener("click", e => {
    e.preventDefault();
    const href = a.getAttribute("href");
    const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    // the first entry means the very top of the page, not a section below the intro
    if (i === 0) scrollTo({ top: 0, behavior: smooth });
    else document.querySelector(href)?.scrollIntoView({ behavior: smooth, block: "start" });
    history.replaceState(null, "", href);
    if (isSheet()) closeSheet();
  }));

  function setActive(i) {
    if (i === active) return;
    active = i;
    links.forEach((a, j) => a.classList.toggle("on", j === i));
    const href = links[i]?.getAttribute("href") || "#intro";
    dispatchEvent(new CustomEvent("sectionchange", { detail: href.slice(1) }));
    if (location.hash !== href) history.replaceState(null, "", href);
  }

  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver(rows => {
      rows.forEach(r => { if (r.isIntersecting) setActive(sections.indexOf(r.target)); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => io.observe(s));
  }
  setActive(0);

  /* A closed sheet is only translated off-screen, which leaves its links in the
     tab order. `inert` takes them out of it — applied only at sheet widths, and
     re-checked when the viewport crosses the breakpoint. */
  const syncInert = () => {
    if (isSheet() && !document.body.classList.contains("side-open")) bar.setAttribute("inert", "");
    else bar.removeAttribute("inert");
  };
  syncInert();
  matchMedia("(max-width: 900px)").addEventListener?.("change", syncInert);
  addEventListener("resize", syncInert, { passive: true });
})();

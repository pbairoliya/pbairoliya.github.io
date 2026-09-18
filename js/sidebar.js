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

  /* On a sub-page the sidebar lists other PAGES rather than sections of this
     one, so there is nothing to observe and the active entry is already marked
     in the markup. Everything below the observer still applies. */
  /* Keep the pairing explicit. sections used to be a filtered array indexed
     back into links, so deleting one section silently shifted every highlight
     below it by one. */
  const pairs = links
    .map((a, i) => ({ i, el: document.querySelector(a.getAttribute("href")) }))
    .filter(p => p.el);
  const sections = pairs.map(p => p.el);
  let active = -1;
  /* The observer fires while the page is still settling, which used to rewrite
     the URL to whatever happened to be mid-viewport — so the NEXT visit arrived
     carrying #work and jumped there. Only reflect the URL once the reader has
     actually moved. */
  let readerMoved = false;

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
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    // the sheet is the bottom layer: only close it if nothing sits above it
    if (document.querySelector(".tour")) return;
    if (document.getElementById("palette")?.classList.contains("on")) return;
    if (document.getElementById("settings")?.classList.contains("on")) return;
    closeSheet();
  });

  // links that leave the page (resume, GitHub) should also dismiss the sheet
  bar.querySelectorAll("a:not([href^='#'])").forEach(a =>
    a.addEventListener("click", () => { if (isSheet()) closeSheet(); }));

  links.forEach((a, i) => a.addEventListener("click", e => {
    e.preventDefault();
    const href = a.getAttribute("href");
    const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    // the first entry means the very top of the page, not a section below the intro
    if (i === 0) scrollTo({ top: 0, behavior: smooth });
    else document.querySelector(href)?.scrollIntoView({ behavior: smooth, block: "start" });
    readerMoved = true;
    history.replaceState(null, "", href);
    if (isSheet()) closeSheet();
  }));

  function setActive(i) {
    if (i === active) return;
    active = i;
    links.forEach((a, j) => a.classList.toggle("on", j === i));
    const href = links[i]?.getAttribute("href") || "#intro";
    dispatchEvent(new CustomEvent("sectionchange", { detail: href.slice(1) }));
    if (readerMoved && location.hash !== href) history.replaceState(null, "", href);
  }

  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver(rows => {
      rows.forEach(r => { if (r.isIntersecting) setActive(sections.indexOf(r.target)); });
    }, { rootMargin: "-40% 0px -45% 0px", threshold: 0 });
    sections.forEach(s => io.observe(s));

    // The intro is only the actions row, small enough to skip straight past the
    // band on a tall screen — so being at the top always means "Hello".
    addEventListener("scroll", () => { if (scrollY < 80) setActive(0); }, { passive: true });
  }
  if (sections.length) setActive(0);
  addEventListener("scroll", () => { readerMoved = true; }, { passive: true, once: true });

  /* Collapse, the way Notion has it: the rail shrinks to its icons and the page
     takes the width back. Remembered, because it is a preference about how you
     like to read rather than a transient state. */
  const COLLAPSE_KEY = "side-collapsed";
  const collapseBtn = document.getElementById("side-collapse");
  const setCollapsed = (on) => {
    document.body.classList.toggle("side-collapsed", on);
    collapseBtn?.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
    collapseBtn?.setAttribute("title", on ? "Expand sidebar" : "Collapse sidebar");
    try { localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch {}
  };
  try { if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true); } catch {}
  collapseBtn?.addEventListener("click", () =>
    setCollapsed(!document.body.classList.contains("side-collapsed")));

  // [ toggles it, the way an editor would
  addEventListener("keydown", e => {
    if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(input|textarea)$/i.test(document.activeElement?.tagName || "")) return;
    if (isSheet()) return;
    e.preventDefault();
    setCollapsed(!document.body.classList.contains("side-collapsed"));
  });

  /* A closed sheet is only translated off-screen, which leaves its links in the
     tab order. `inert` takes them out of it — applied only at sheet widths, and
     re-checked when the viewport crosses the breakpoint. */
  const syncInert = () => {
    // a sheet left open at phone width must not still be "open" at desktop width
    if (!isSheet()) closeSheet();
    if (isSheet() && !document.body.classList.contains("side-open")) bar.setAttribute("inert", "");
    else bar.removeAttribute("inert");
  };
  syncInert();
  matchMedia("(max-width: 900px)").addEventListener?.("change", syncInert);
  addEventListener("resize", syncInert, { passive: true });
})();

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
  let releaseSheet = null;
  const openSheet = () => {
    document.body.classList.add("side-open");
    toggle?.setAttribute("aria-expanded", "true");
    bar.removeAttribute("inert");
    // focus has to follow the sheet, or a keyboard user opens something they
    // then cannot reach
    bar.querySelector("a")?.focus({ preventScroll: true });
    // the sheet is modal — there is a scrim — so Tab must stay inside it
    releaseSheet = window.__trap?.(bar) || null;
  };
  const closeSheet = () => {
    releaseSheet?.(); releaseSheet = null;
    const wasOpen = document.body.classList.contains("side-open");
    document.body.classList.remove("side-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (isSheet()) bar.setAttribute("inert", "");
    if (wasOpen) toggle?.focus({ preventScroll: true });
  };

  toggle?.addEventListener("click", () => {
    if (!isSheet()) { setCollapsed(false); return; }   // desktop: bring the rail back
    document.body.classList.contains("side-open") ? closeSheet() : openSheet();
  });
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

  /* Scroll-spy, done as a reading line rather than as an IntersectionObserver
     band. The band approach kept producing edge cases: a 215px section could
     not reach a band that began 40% down the viewport, and the LAST section can
     never reach one at all, because the page stops scrolling while its
     predecessor still occupies the band. A line is simply true or false for
     every section at once, and both ends fall out of it. */
  if (sections.length) {
    const LINE = 88;                      // px below the top of the viewport
    let queued = false;

    const spy = () => {
      queued = false;
      let i = 0;
      sections.forEach((s, n) => { if (s.getBoundingClientRect().top <= LINE) i = n; });
      // the top of the page always means the first entry
      if (scrollY < 80) i = 0;
      // and the bottom always means the last, for the reason above
      const doc = document.documentElement;
      if (innerHeight + scrollY >= doc.scrollHeight - 2) i = sections.length - 1;
      setActive(i);
    };
    const onScroll = () => {
      // one batch of layout reads per frame, not one per scroll event
      if (!queued) { queued = true; requestAnimationFrame(spy); }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    spy();
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
    // a rail that is gone must not keep its links in the tab order
    if (on && !isSheet()) bar.setAttribute("inert", "");
    else if (!isSheet()) bar.removeAttribute("inert");
    collapseBtn?.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
    collapseBtn?.setAttribute("title", on ? "Expand sidebar" : "Collapse sidebar");
    try { localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch {}
  };
  // only restore it where collapsing means anything
  try {
    if (!isSheet() && localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  } catch {}
  collapseBtn?.addEventListener("click", () => {
    /* At sheet widths "collapse" means nothing — the rail is already a sheet.
       The button used to flip a class with no mobile rules AND persist it to
       localStorage, so it silently did nothing now and collapsed the rail later
       on a desktop. Here it closes the sheet, which is what it looks like. */
    if (isSheet()) { closeSheet(); return; }
    setCollapsed(!document.body.classList.contains("side-collapsed"));
  });

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
      // a desktop collapse must not follow you down to sheet widths
      if (isSheet()) document.body.classList.remove("side-collapsed");
      else { try { if (localStorage.getItem(COLLAPSE_KEY) === "1")
                     document.body.classList.add("side-collapsed"); } catch {} }
      // whichever way it is hidden, it must leave the tab order
      const hidden = isSheet()
        ? !document.body.classList.contains("side-open")
        : document.body.classList.contains("side-collapsed");
      if (hidden) bar.setAttribute("inert", "");
    else bar.removeAttribute("inert");
  };
  syncInert();
  matchMedia("(max-width: 900px)").addEventListener?.("change", syncInert);
  addEventListener("resize", syncInert, { passive: true });
})();

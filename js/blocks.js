/* Notion-style block affordances.
   Hovering a section heading reveals a "#" that copies a deep link to it —
   the one Notion behaviour worth stealing, because it makes a section
   shareable instead of making the whole page shareable. */
(() => {
  "use strict";
  const toast = m => (window.__toast ? window.__toast(m) : null);

  document.querySelectorAll("section[id] > h2, h2[id]").forEach(h => {
    const a = document.createElement("button");
    a.type = "button";
    a.className = "anchor";
    a.textContent = "#";
    a.title = "Copy link to this section";
    const name = h.textContent.trim();          // read BEFORE the button is appended
    a.setAttribute("aria-label", `Copy link to ${name}`);
    a.addEventListener("click", async () => {
      const id = h.id || h.parentElement.id;
      const url = location.href.split("#")[0] + "#" + id;
      try { await navigator.clipboard.writeText(url); toast("Link to “" + name + "” copied"); }
      catch { toast(url); }
      history.replaceState(null, "", "#" + id);
    });
    h.appendChild(a);
  });

  // a deep link should land on the section, not halfway through it
  // A shared link can carry anything; "#1" is not a valid selector and used to
  // throw, taking the rest of this script with it.
  if (location.hash.length > 1) {
    let el = null;
    try { el = document.querySelector(location.hash); } catch { /* not a selector */ }
    el ||= document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }

  /* Roles open on demand.
     The HTML ships expanded so a blocked script leaves the page fully
     readable; closing them is this script's job, not the stylesheet's. The
     current role stays open, because that is the one a recruiter came for. */
  const jobs = [...document.querySelectorAll(".job:has(.job-toggle)")];
  if (jobs.length) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const set = (job, open) => {
      job.classList.toggle("shut", !open);
      job.querySelector(".job-toggle").setAttribute("aria-expanded", String(open));
    };

    jobs.forEach((job, i) => {
      /* the stagger is per-bullet and lives in CSS; JS only supplies the index */
      job.querySelectorAll(".job-body li")
         .forEach((li, n) => li.style.setProperty("--i", n));
      /* The whole entry is the target, not just the header row. Two things it
         must not swallow: a click on a real link, and the mouse-up that ends a
         text selection inside an open entry. */
      job.addEventListener("click", e => {
        if (e.target.closest("a")) return;
        if (!e.target.closest(".job-toggle") &&
            (getSelection?.()?.toString() || "")) return;
        const open = job.classList.contains("shut");
        set(job, open);
        /* an entry opened from far down the page should not push its own
           heading off the top */
        if (open && !reduced) {
          const top = job.getBoundingClientRect().top;
          if (top < 0) job.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      });
      if (i > 0) set(job, false);
      /* a role still running keeps a pulse on its node */
      if (/present/i.test(job.querySelector(".job-toggle .meta")?.textContent || ""))
        job.classList.add("job-now");
    });

    /* The line draws itself once, when the section arrives.
       It used to be scroll-linked, which fought the disclosures: opening a role
       changes the track's height, so every open re-scaled a fill that was
       measured against the old layout. Drawing once and staying drawn has none
       of that problem and reads better anyway. */
    const track = document.querySelector(".timeline");
    if (track) {
      jobs.forEach((j, n) => j.style.setProperty("--d", 140 + n * 320));
      const draw = () => track.classList.add("drawn");
      if (reduced || !("IntersectionObserver" in window)) draw();
      else {
        const io = new IntersectionObserver(rows => {
          if (rows.some(r => r.isIntersecting)) { draw(); io.disconnect(); }
        }, { rootMargin: "0px 0px -15% 0px" });
        io.observe(track);
      }
    }
  }
})();

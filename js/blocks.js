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
      const btn = job.querySelector(".job-toggle");
      btn.addEventListener("click", () => {
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

    /* The line draws itself as you scroll past it.
       p is 0 when the timeline's top crosses three-quarters of the way down the
       viewport and 1 when its bottom crosses a third of the way down, so the
       fill tracks reading position rather than raw scroll offset. Nodes light
       as the fill passes them. */
    const line = document.querySelector(".tl-line");
    if (line && !reduced) {
      const track = line.parentElement;
      let queued = false;

      const draw = () => {
        queued = false;
        const r = track.getBoundingClientRect();
        const from = innerHeight * 0.75, to = innerHeight * 0.35;
        const span = (r.height || 1) + (from - to);
        const p = Math.min(1, Math.max(0, (from - r.top) / span));
        line.style.setProperty("--p", p.toFixed(4));

        const lr = line.getBoundingClientRect();
        const front = lr.top + lr.height * p;
        jobs.forEach(j => {
          const n = j.querySelector(".job-node").getBoundingClientRect();
          j.classList.toggle("reached", n.top + n.height / 2 <= front + 1);
        });
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };

      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll, { passive: true });
      /* opening a role changes the track's height, so redraw after the
         0fr -> 1fr transition rather than leaving a stale fill behind */
      track.addEventListener("transitionend", e => {
        if (e.propertyName === "grid-template-rows") draw();
      });
      draw();
    } else if (line) {
      line.style.setProperty("--p", "1");
      jobs.forEach(j => j.classList.add("reached"));
    }
  }
})();

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
      /* A zero-height box with overflow:hidden is still in the accessibility
         tree, so a screen reader read every bullet of a role that presents as
         collapsed. inert is definitive. Applied after the close finishes so the
         collapse still animates, and lifted immediately on open. */
      const body = job.querySelector(".job-body");
      if (!body) return;
      clearTimeout(body._t);
      if (open) { body.inert = false; body.removeAttribute("aria-hidden"); }
      else body._t = setTimeout(() => {
        if (job.classList.contains("shut")) {
          body.inert = true;
          body.setAttribute("aria-hidden", "true");
        }
      }, 360);
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
        /* Replay the node's pop and ring on every toggle, not only during the
           first sweep. Removing the class, forcing a reflow and adding it back
           is what restarts a CSS animation. */
        if (!reduced) {
          const node = job.querySelector(".job-node");
          node.classList.remove("pop");
          void node.offsetWidth;
          node.classList.add("pop");
        }
        /* an entry opened from far down the page should not push its own
           heading off the top */
        if (open && !reduced) {
          const top = job.getBoundingClientRect().top;
          if (top < 0) job.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      });
      set(job, false);
      /* a role still running keeps a pulse on its node */
      if (/present/i.test(job.querySelector(".job-toggle .meta")?.textContent || ""))
        job.classList.add("job-now");
    });

    /* The line draws itself once, when the section arrives.
       It used to be scroll-linked, which fought the disclosures: opening a role
       changes the track's height, so every open re-scaled a fill that was
       measured against the old layout. Drawing once and staying drawn has none
       of that problem and reads better anyway. */
    /* A real time axis. Every entry with dates gets a bar drawn on one shared
       scale, so a reader sees at a glance that InspireNC and the degree ran
       underneath four jobs. Brackets in a gutter were trying to say the same
       thing and said it badly. Positions are percentages of the span, so the
       lane can be any width and the whole thing survives a resize with no
       measuring at all. */
    const track = document.querySelector(".timeline");
    const axis = track?.querySelector(".tl-axis");
    if (track && axis) {
      const ms = (v) => v === "now" ? Date.now() : Date.parse(v + "-01T00:00:00");
      const dated = jobs.filter(j => j.dataset.start);
      if (dated.length) {
        const starts = dated.map(j => ms(j.dataset.start));
        const ends   = dated.map(j => ms(j.dataset.end || "now"));
        const y0 = new Date(Math.min(...starts)).getFullYear();
        const y1 = new Date(Math.max(...ends)).getFullYear() + 1;
        const t0 = Date.parse(y0 + "-01-01"), t1 = Date.parse(y1 + "-01-01");
        const pct = (v) => ((v - t0) / (t1 - t0)) * 100;

        for (let y = y0; y < y1; y++) {
          const tick = document.createElement("i");
          tick.style.left = pct(Date.parse(y + "-01-01")) + "%";
          tick.dataset.year = String(y).slice(2);
          axis.appendChild(tick);
        }
        dated.forEach(j => {
          const bar = j.querySelector(".span > i");
          if (!bar) return;
          const a = pct(ms(j.dataset.start)), b = pct(ms(j.dataset.end || "now"));
          bar.style.left = a + "%";
          bar.style.width = Math.max(b - a, 1.6) + "%";
          bar.style.setProperty("--e", (1 + [...dated].indexOf(j)));
        });
        track.classList.add("has-axis");
      }
    }

    if (track) {
      jobs.forEach((j, n) => j.style.setProperty("--d", 120 + n * 150));
      const last = 120 + (jobs.length - 1) * 150;
      const draw = () => {
        track.classList.add("drawn");
        /* The per-node stagger is a transition-delay, so it would otherwise
           apply to every later transition too — hovering the last node would
           take 780ms to respond. Drop it once the sweep has finished. */
        setTimeout(() => track.classList.add("settled"), last + 900);
      };
      if (reduced || !("IntersectionObserver" in window)) draw();
      else {
        const io = new IntersectionObserver(rows => {
          if (rows.some(r => r.isIntersecting)) { draw(); io.disconnect(); }
        }, { rootMargin: "0px 0px -15% 0px" });
        io.observe(track);
      }
    }
  }

  /* Filter the shelf. The markup ships unfiltered, so no JS means every card
     is visible — the filter is an affordance, never a gate. */
  const shelf = document.querySelector(".shelf");
  const filters = shelf?.querySelector(".filters");
  if (shelf && filters) {
    const cards = [...shelf.querySelectorAll(".card[data-type]")];
    const btns = [...filters.querySelectorAll("button[data-filter]")];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tidy = 0;

    const apply = (want) => {
      btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === want)));
      let shown = 0;
      cards.forEach(c => {
        const on = want === "all" || c.dataset.type === want;
        c.hidden = !on;
        if (on) c.style.setProperty("--p", shown++);
      });
      if (reduced) return;
      /* restart the deal-in: drop the class, force a reflow, add it back */
      shelf.classList.remove("filtering");
      void shelf.offsetWidth;
      shelf.classList.add("filtering");
      clearTimeout(tidy);
      tidy = setTimeout(() => shelf.classList.remove("filtering"), 900);
    };
    btns.forEach(b => b.addEventListener("click", () => apply(b.dataset.filter)));
  }
})();

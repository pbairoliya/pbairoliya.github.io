/* Notion-style block affordances.
   Hovering a section heading reveals a "#" that copies a deep link to it —
   the one Notion behaviour worth stealing, because it makes a section
   shareable instead of making the whole page shareable. */
(() => {
  "use strict";
  /* One declaration. It was declared inside two sibling blocks and read from a
     third, so every Gantt click threw ReferenceError. */
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toast = m => (window.__toast ? window.__toast(m) : null);

  /* One copy-a-deep-link implementation, used by the heading anchors and by
     the per-entry handles. It was about to be written twice. */
  async function copyLink(id, name) {
    const url = location.href.split("#")[0] + "#" + id;
    try { await navigator.clipboard.writeText(url); toast("Link to “" + name + "” copied"); }
    catch { toast(url); }
    history.replaceState(null, "", "#" + id);
  }

  document.querySelectorAll("section[id] > h2, h2[id]").forEach(h => {
    /* Three headings on the landing page are sr-only, so a button appended to
       one sits inside a 1px clip-path box: focusable, invisible, and
       unreachable by the hover that is supposed to reveal it. */
    if (h.classList.contains("sr-only")) return;
    const a = document.createElement("button");
    a.type = "button";
    a.className = "anchor";
    a.textContent = "#";
    a.title = "Copy link to this section";
    const name = h.textContent.trim();          // read BEFORE the button is appended
    a.setAttribute("aria-label", `Copy link to ${name}`);
    a.addEventListener("click", () => copyLink(h.id || h.parentElement.id, name));
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
     page opens as a timeline rather than as one expanded entry. */
  const jobs = [...document.querySelectorAll(".job:has(.job-toggle)")];
  if (jobs.length) {
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
      /* the coursework tiles still cascade; the bullets no longer do */
      job.querySelectorAll(".job-body .courses li")
         .forEach((li, n) => li.style.setProperty("--c", n));

      /* Notion's "copy link to block", on a role. A recruiter can send someone
         one job rather than the whole page, and the deep-link handler below
         already opens whatever a #id points at. */
      if (job.id) {
        const grip = document.createElement("button");
        grip.type = "button";
        grip.className = "grip";
        /* Pointer affordance: in the tab order it put a stop before every
           entry, 16 to cross Experience. Clicking an entry still puts its
           id in the address bar. */
        grip.tabIndex = -1;
        grip.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">' +
          '<circle cx="6" cy="4" r="1.3"/><circle cx="10" cy="4" r="1.3"/>' +
          '<circle cx="6" cy="8" r="1.3"/><circle cx="10" cy="8" r="1.3"/>' +
          '<circle cx="6" cy="12" r="1.3"/><circle cx="10" cy="12" r="1.3"/></svg>';
        const label = job.querySelector(".job-name")?.firstChild?.textContent?.trim() || job.id;
        grip.title = "Copy link to this entry";
        grip.setAttribute("aria-label", "Copy link to " + label);
        grip.addEventListener("click", e => {
          e.stopPropagation();          // the whole row toggles; this must not
          copyLink(job.id, label);
        });
        job.prepend(grip);
      }
      /* The whole entry is the target, not just the header row. Two things it
         must not swallow: a click on a real link, and the mouse-up that ends a
         text selection inside an open entry. */
      job.addEventListener("click", e => {
        if (e.target.closest("a")) return;
        /* The header is the toggle; the body is not. Tapping a bullet used to
           collapse the entry you were reading, and on touch there is no text
           selection to guard against it. */
        if (e.target.closest(".job-body")) return;
        if (!e.target.closest(".job-toggle") &&
            (getSelection?.()?.toString() || "")) return;
        const open = job.classList.contains("shut");
        set(job, open);
        /* Replay the node's pop and ring on every toggle, not only during the
           first sweep. Removing the class, forcing a reflow and adding it back
           is what restarts a CSS animation. */
        if (!reduced) {
          const dot = job.querySelector(".job-dot");
          if (dot) { dot.classList.remove("pop"); void dot.offsetWidth; dot.classList.add("pop"); }
        }
        /* an entry opened from far down the page should not push its own
           heading off the top */
        if (open && !reduced) {
          const top = job.getBoundingClientRect().top;
          if (top < 0) job.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      });
      /* The current role opens; everything else stays shut. A recruiter's
         first scroll used to give three job titles and no evidence, which is
         the one thing the page exists to provide — and seven open entries is
         the wall the collapse was added to avoid. One is the answer to both. */
      set(job, i === 0);
      /* A link that points AT a collapsed entry should open it — the rail's
         "School" now targets the degree row, and landing on a closed row that
         says nothing is a dead end. */
      if (job.id) {
        const reveal = (scroll) => {
          /* The target lives in the Details panel, so show it first — in the
             Timeline view the row is display:none and scrolling to it is a
             no-op. sidebar.js's own scroll has already fired against the hidden
             element by the time we get here, so redo it once it is visible. */
          window.__tlView?.("list");
          if (job.classList.contains("shut")) set(job, true);
          if (scroll) requestAnimationFrame(() => job.scrollIntoView({
            block: "center", behavior: reduced ? "auto" : "smooth" }));
        };
        addEventListener("hashchange", () => {
          if (location.hash.slice(1) === job.id) reveal(true);
        });
        document.querySelectorAll('a[href="#' + job.id + '"]')
                .forEach(a => a.addEventListener("click", () => reveal(true)));
        if (location.hash.slice(1) === job.id) reveal(false);
      }
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
      /* One sweep over everything in the list, in document order, so a year
         divider arrives just before the entries it introduces instead of
         being on its own clock. */
      const list = document.getElementById("tl-list");
      const tabs = track.querySelector(".views");
      if (tabs) tabs.style.setProperty("--d", 0);
      const steps = [...(list || track).querySelectorAll(".tl-year, .job")];
      let last = 0;
      steps.forEach((el, n) => {
        const d = 100 + n * 90;
        el.style.setProperty(el.classList.contains("tl-year") ? "--y" : "--d", d);
        last = d;
      });
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
    let tidy = 0;

    const apply = (want) => {
      btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === want)));
      let shown = 0;
      cards.forEach(c => {
        const on = want === "all" || c.dataset.type === want;
        c.hidden = !on;
        if (!on) return;
        c.style.setProperty("--p", shown++);
        /* the index is the position in what you are looking at; filtering to
           "Older" used to show cards numbered 03 and 04 with no 01 or 02 */
        const n = c.querySelector(".card-no");
        if (n) n.textContent = String(shown).padStart(2, "0");
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

  /* ---- the Timeline view ----
     A Notion timeline: names down the left, a year axis across the top, one bar
     per run. It is built from the list's own markup, so the two views can never
     disagree, and it only exists once this script has run — no JS leaves the
     list, which is the view that reads.

     The gimmick is the scrubber. Drag the pointer across the chart and a line
     follows it: everything that was NOT running on that date fades back, and a
     chip says how many things were. Overlap stops being something you infer
     from bar ends and becomes something you sweep for. */
  (() => {
    const chart = document.getElementById("tl-chart");
    const tabs = document.querySelector(".views");
    if (!chart || !tabs || !jobs.length) return;

    const rows = jobs.map(j => ({
      el: j,
      name: j.querySelector(".job-name").firstChild.textContent.trim(),
      kind: j.dataset.kind,
      start: j.dataset.start ? Date.parse(j.dataset.start + "-01T00:00:00") : null,
      end: j.dataset.start
        ? (j.dataset.end === "now" ? Date.now() : Date.parse((j.dataset.end || "") + "-01T00:00:00"))
        : null,
      open: j.dataset.end === "now",
    }));
    const dated = rows.filter(r => r.start);
    if (dated.length < 2) return;

    const y0 = new Date(Math.min(...dated.map(r => r.start))).getFullYear();
    const y1 = new Date(Math.max(...dated.map(r => r.end))).getFullYear() + 1;
    const yr = y => Date.parse(y + "-01-01T00:00:00");   // local, to match the chip
        const t0 = yr(y0), t1 = yr(y1);
    const pct = v => ((v - t0) / (t1 - t0)) * 100;

    const head = document.createElement("div");
    head.className = "tlc-head";
    for (let y = y0; y < y1; y++) {
      const cell = document.createElement("span");
      cell.style.left = pct(yr(y)) + "%";
      cell.style.width = pct(yr(y + 1)) - pct(yr(y)) + "%";
      cell.textContent = y;
      head.appendChild(cell);
    }
    chart.appendChild(head);

    const body = document.createElement("div");
    body.className = "tlc-body";
    const today = document.createElement("span");
    today.className = "tlc-today";
    /* placed against the lane, not the row: the row starts at the name column */
    today.style.left = "calc(var(--name) + (100% - var(--name)) * " + (pct(Date.now()) / 100).toFixed(5) + ")";
    body.appendChild(today);

    rows.forEach(r => {
      const line = document.createElement("div");
      line.className = "tlc-row";
      const label = document.createElement("span");
      label.className = "tlc-name";
      /* three rows all began "Capital One · Software Engine…" and truncated to
         the same string, so the column said nothing. */
      label.textContent = r.name
        .replace("Software Engineering Intern", "SWE Intern")
        .replace("Software Engineer", "SWE")
        .replace("Undergraduate Researcher", "Undergrad Researcher")
        .replace("North Carolina State University", "NC State · B.S. ×2");
      label.title = r.name;
      line.appendChild(label);
      const lane = document.createElement("span");
      lane.className = "tlc-lane";
      if (r.start) {
        const bar = document.createElement("button");
        bar.type = "button";
        bar.className = "tlc-bar";
        bar.dataset.kind = r.kind;
        bar.style.left = pct(r.start) + "%";
        /* A run that has not ended draws all the way to the right edge and
           fades out after today, so "still going" is a shape rather than a
           caption. It used to stop at today like every other bar, which made
           three months in the current role look exactly like the three-month
           internship — the one comparison the chart must not invite. The fade
           starts exactly on the today line, so the two read as one mark. */
        const span = pct(r.end) - pct(r.start);
        if (r.open) {
          const full = pct(t1) - pct(r.start);
          bar.style.width = full + "%";
          bar.style.setProperty("--solid", (span / full * 100).toFixed(2) + "%");
        } else {
          bar.style.width = Math.max(span, 2) + "%";
        }
        /* the name column says the name; a bar repeating it just clips */
        bar.title = r.name + " · " + r.el.querySelector(".meta").textContent.trim();
        bar.setAttribute("aria-label", "Open " + r.name);
        if (r.open) bar.classList.add("is-open-ended");
        lane.appendChild(bar);
        r.bar = bar;
      } else {
        lane.classList.add("undated");
      }
      line.appendChild(lane);
      if (r.start) {
        line.classList.add("is-live");
        line.addEventListener("click", () => {
          setView("list");
          /* The bar says "Open". It used to call the toggle, so clicking the
             bar of an already-open entry closed it and left you in Details
             with nothing expanded. */
          if (r.el.classList.contains("shut")) r.el.querySelector(".job-toggle").click();
          r.el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        });
      }
      body.appendChild(line);
    });
    chart.appendChild(body);

    /* the scrubber */
    const scrub = document.createElement("div");
    scrub.className = "tlc-scrub";
    scrub.innerHTML = '<span class="tlc-chip"></span>';
    body.appendChild(scrub);
    const chip = scrub.querySelector(".tlc-chip");
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const clear = () => {
      body.classList.remove("scrubbing");
      dated.forEach(r => r.bar.classList.remove("dim"));
    };
    body.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      /* measure against a real lane, so the scale starts at the axis and not at
         the left edge of the name column */
      const lane = body.querySelector(".tlc-lane").getBoundingClientRect();
      const box = body.getBoundingClientRect();
      const f = Math.min(Math.max((e.clientX - lane.left) / lane.width, 0), 1);
      const x = lane.left - box.left + f * lane.width;
      const at = t0 + f * (t1 - t0);
      const d = new Date(at);
      let live = 0;
      dated.forEach(r => {
        /* A run with no end date is still running, so it counts to the end of
           the axis. Stopping it at Date.now() dimmed every bar right of the
           today marker and made the chip read "0 runs" — which says he is
           between jobs. */
        const end = r.open ? t1 : r.end;
        const on = at >= r.start && at <= end;
        r.bar.classList.toggle("dim", !on);
        if (on) live++;
      });
      body.classList.add("scrubbing");
      scrub.style.left = x + "px";
      /* near the right edge the chip would hang off the chart, and past ~1100px
         off the viewport, where nothing can scroll it back */
      scrub.classList.toggle("flip", box.width - x < 150);
      chip.textContent = MONTHS[d.getMonth()] + " " + d.getFullYear() +
        " · " + live + (live === 1 ? " run" : " runs");
    }, { passive: true });
    body.addEventListener("pointerleave", clear);

    /* view switching */
    const list = document.getElementById("tl-list");
    const btns = [...tabs.querySelectorAll("button[data-view]")];
    function setView(v, remember = true) {
      btns.forEach(b => {
        const on = b.dataset.view === v;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;          // one tab stop for the group, APG-style
      });
      chart.hidden = v !== "chart";
      list.hidden = v !== "list";
      if (v !== "chart") clear();
      /* Only a real click is a preference. The width handler forces the list,
         and persisting that lost the choice the moment a window got narrow. */
      if (remember) { try { localStorage.setItem("tl-view", v); } catch {} }
    }
    window.__tlView = (v) => setView(v, false);
    btns.forEach((b, i) => {
      b.hidden = false;
      b.addEventListener("click", () => setView(b.dataset.view));
      /* APG tablist keys: arrows move and activate, Home/End jump */
      b.addEventListener("keydown", e => {
        const k = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" }[e.key];
        if (k === undefined) return;
        e.preventDefault();
        const n = k === "first" ? 0 : k === "last" ? btns.length - 1
                : (i + k + btns.length) % btns.length;
        setView(btns[n].dataset.view);
        btns[n].focus();
      });
    });
    const narrow = matchMedia("(max-width: 760px)");
    let want = "list";
    try { want = localStorage.getItem("tl-view") || "list"; } catch {}
    const applyWidth = () => narrow.matches ? setView("list", false) : setView(want);
    applyWidth();
    /* a Gantt has nowhere to go on a phone — but widening should give it back */
    narrow.addEventListener("change", applyWidth);
  })();


  /* ---- link previews ----
     Notion previews a linked page on hover. These are the site's own pages, so
     the copy is authored here rather than fetched — a fetch on hover would be
     a request per pointer pass, and there is no build step to inline it at.
     Pointer only, aria-hidden, and absent wherever .peek is. */
  (() => {
    const PAGES = {
      "projects/statement-fetcher.html": ["Statement fetcher",
        "Logs into four banks and files the statements. It worked on day one; everything worth writing down happened after."],
      "projects/lc.html": ["LC Bot",
        "A LeetCode workflow that lives in your notes: one command imports a problem, another publishes the repo."],
      "projects/on-device-tools.html": ["On-device tools",
        "Three programs, one shared core — Apple Vision OCR and a local model, wrapped in a deterministic rules layer."],
      "projects/systems-and-algorithms.html": ["Systems and algorithms",
        "Five repositories kept public because the trajectory is the interesting part."],
      "projects/coursework.html": ["Coursework",
        "Four courses at NC State, one repository each, every one for a single idea it made me build by hand."],
      "writing/receipts-local-llm.html": ["Scanning receipts into Obsidian with a local LLM",
        "A scan on my phone updates my pantry, shopping list and expense report seconds later."],
      "writing/": ["Writing", "Notes from building things. One post so far."],
    };
    if (matchMedia("(hover: none)").matches || matchMedia("(max-width: 620px)").matches) return;

    const key = (a) => {
      const h = a.getAttribute("href") || "";
      return Object.keys(PAGES).find(k => h === k || h === "../" + k || h === "/" + k);
    };
    const links = [...document.querySelectorAll('a[href]')].filter(a =>
      key(a) && !a.closest(".card") && !a.closest(".side") && !a.closest("#palette"));
    if (!links.length) return;

    const pop = document.createElement("div");
    pop.className = "linkpeek";
    pop.setAttribute("aria-hidden", "true");
    document.body.appendChild(pop);
    let over = null, timer = 0;

    const hide = () => { clearTimeout(timer); over = null; pop.classList.remove("on"); };
    const show = (a) => {
      const [title, line] = PAGES[key(a)];
      pop.innerHTML = "";
      const h = document.createElement("b"); h.textContent = title;
      const p = document.createElement("span"); p.textContent = line;
      pop.append(h, p);
      pop.classList.add("on");
      /* measure, then clamp inside the viewport on both axes — the same
         problem tour.js solves, at a tenth of the size */
      const r = a.getBoundingClientRect(), box = pop.getBoundingClientRect();
      const pad = 8;
      let x = Math.min(Math.max(r.left, pad), innerWidth - box.width - pad);
      let y = r.bottom + 10;
      if (y + box.height > innerHeight - pad) y = r.top - box.height - 10;
      pop.style.left = Math.round(x) + "px";
      pop.style.top = Math.round(y + scrollY) + "px";
    };

    links.forEach(a => {
      a.addEventListener("pointerenter", e => {
        if (e.pointerType === "touch") return;
        clearTimeout(timer); over = a;
        timer = setTimeout(() => { if (over === a) show(a); }, 260);
      });
      a.addEventListener("pointerleave", hide);
      a.addEventListener("click", hide);
    });
    addEventListener("scroll", hide, { passive: true });
  })();

  /* A blocked CDN turned the stack grid into 47 torn-page glyphs. alt="" means
     there is nothing to fall back to, so hide the image and let the label
     stand on its own. */
  document.querySelectorAll(".tool img").forEach(img => {
    const fail = () => img.classList.add("no-icon");
    img.addEventListener("error", fail);
    if (img.complete && !img.naturalWidth) fail();
  });
})();

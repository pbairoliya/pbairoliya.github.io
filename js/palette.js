/* Landing-page interactions: command palette, theme control, section spy.
   Everything degrades to a working page if any of it fails to load. */
(() => {
  "use strict";

  /* ---------- theme: system by default, overridable, remembered ---------- */
  const THEME_KEY = "theme";
  const root = document.documentElement;

  function applyTheme(mode) {
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    document.querySelectorAll("[data-theme-btn]").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.themeBtn === mode)));
  }
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || "system"; } catch { return "system"; }
  }
  function setTheme(mode) {
    try { localStorage.setItem(THEME_KEY, mode); } catch {}
    applyTheme(mode);
    window.dispatchEvent(new CustomEvent("themechange", { detail: mode }));
  }
  applyTheme(currentTheme());
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-theme-btn]");
    if (b) setTheme(b.dataset.themeBtn);
  });

  /* ---------- command palette ---------- */
  const ACTIONS = [
    { g:"Open",       i:"↓", label:"Resume (PDF)",       hint:"download",   run:() => location.assign("Pratik-Bairoliya-Resume.pdf") },
    { g:"Open",       i:"◆", label:"On-device tools",    hint:"write-up",   run:() => location.assign("projects/on-device-tools.html") },
    { g:"Open",       i:"◆", label:"lc",                 hint:"write-up",   run:() => location.assign("projects/lc.html") },
    { g:"Open",       i:"↗", label:"GitHub",             hint:"pbairoliya", run:() => open("https://github.com/pbairoliya","_blank") },
    { g:"Open",       i:"↗", label:"LinkedIn",           hint:"pbairol",    run:() => open("https://linkedin.com/in/pbairol","_blank") },
    { g:"Open",       i:"↗", label:"InspireNC",          hint:"the non-profit", run:() => open("https://inspirenc.us/","_blank") },
    { g:"Open",       i:"↗", label:"Site source",        hint:"repo",       run:() => open("https://github.com/pbairoliya/pbairoliya.github.io","_blank") },

    { g:"Jump to",    i:"§", label:"Intro",              hint:"#intro",          run:() => go("intro") },
    { g:"Jump to",    i:"§", label:"Background",         hint:"#background",        run:() => go("background") },
    { g:"Jump to",    i:"§", label:"Work",               hint:"#work",         run:() => go("work") },
    { g:"Jump to",    i:"§", label:"Stack",              hint:"#stack",        run:() => go("stack") },
    { g:"Jump to",    i:"§", label:"Projects",           hint:"#projects",     run:() => go("projects") },
    { g:"Jump to",    i:"§", label:"Credentials",        hint:"#credentials",  run:() => go("credentials") },
    { g:"Jump to",    i:"›", label:"The longer version", hint:"expand",        run:() => {
        const d = document.querySelector(".fold"); if (d) { d.open = true; go("background"); } } },

    { g:"Do",         i:"⧉", label:"Copy email address", hint:"pratik0520@gmail.com", run: copyEmail },
    { g:"Do",         i:"✉", label:"Email me",           hint:"mailto",     run:() => location.assign("mailto:pratik0520@gmail.com") },
    { g:"Do",         i:"⧉", label:"Copy link to this page", hint:"url",    run: copyUrl },

    { g:"Do",         i:"◎", label:"Replay the tour",      hint:"onboarding", run:() => window.__startTour?.(true) },
    { g:"Appearance", i:"◑", label:"Theme: system",      hint:"follow the OS", run:() => setTheme("system") },
    { g:"Appearance", i:"☀", label:"Theme: light",       hint:"",           run:() => setTheme("light") },
    { g:"Appearance", i:"☾", label:"Theme: dark",        hint:"",           run:() => setTheme("dark") },
  ];

  function go(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }
  async function copyUrl() {
    try { await navigator.clipboard.writeText(location.href.split("#")[0]); toast("Link copied"); }
    catch { toast(location.href); }
  }
  async function copyEmail() {
    try { await navigator.clipboard.writeText("pratik0520@gmail.com"); toast("Email copied"); }
    catch { toast("pratik0520@gmail.com"); }
  }

  let toastT;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("on"), 1900);
  }
  window.__toast = toast;

  const pal = document.getElementById("palette");
  if (pal) {
    const input = pal.querySelector("input");
    const list  = pal.querySelector(".pal-list");
    let matches = ACTIONS, cursor = 0;

    function render() {
      list.innerHTML = "";
      if (!matches.length) { list.innerHTML = '<p class="pal-empty">nothing matches</p>'; return; }
      let group = null;
      matches.forEach((a, i) => {
        if (a.g !== group) {
          group = a.g;
          const h = document.createElement("p");
          h.className = "pal-group";
          h.textContent = group;
          list.appendChild(h);
        }
        const row = document.createElement("button");
        row.type = "button";
        row.className = "pal-row" + (i === cursor ? " on" : "");
        row.innerHTML = `<span class="pal-i" aria-hidden="true">${a.i}</span>` +
                        `<span class="pal-t">${a.label}</span>` +
                        `<span class="pal-hint">${a.hint}</span>`;
        row.addEventListener("click", () => { close(); a.run(); });
        list.appendChild(row);
      });
      list.querySelector(".pal-row.on")?.scrollIntoView({ block: "nearest" });
    }
    function filter(q) {
      q = q.trim().toLowerCase();
      matches = q ? ACTIONS.filter(a => (a.label + " " + a.hint + " " + a.g).toLowerCase().includes(q)) : ACTIONS;
      cursor = 0; render();
    }
    function openPal() {
      const b = document.querySelector(".palette-btn");
      if (b) { b.classList.remove("hint"); try { localStorage.setItem("pal-seen", "1"); } catch {} }
      pal.classList.add("on"); pal.setAttribute("aria-hidden", "false");
      input.value = ""; filter(""); input.focus();
    }
    function close() { pal.classList.remove("on"); pal.setAttribute("aria-hidden", "true"); }

    addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); pal.classList.contains("on") ? close() : openPal(); return; }
      if (!pal.classList.contains("on")) {
        // "/" opens it too, unless you're already typing somewhere
        if (k === "/" && !/^(input|textarea)$/i.test(document.activeElement.tagName)) { e.preventDefault(); openPal(); }
        return;
      }
      if (k === "escape") { close(); }
      else if (k === "arrowdown") { e.preventDefault(); cursor = (cursor + 1) % Math.max(matches.length, 1); render(); }
      else if (k === "arrowup")   { e.preventDefault(); cursor = (cursor - 1 + matches.length) % Math.max(matches.length, 1); render(); }
      else if (k === "enter")     { e.preventDefault(); const a = matches[cursor]; if (a) { close(); a.run(); } }
    });
    input.addEventListener("input", () => filter(input.value));
    pal.addEventListener("click", e => { if (e.target === pal) close(); });
    document.querySelectorAll("[data-open-palette]").forEach(b => b.addEventListener("click", openPal));
    try {
      if (localStorage.getItem("pal-seen")) document.querySelector(".palette-btn")?.classList.remove("hint");
    } catch {}
    render();
  }

})();

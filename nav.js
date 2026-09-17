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

  /* ---------- section spy: which part of the page you're in ---------- */
  const spy = document.getElementById("spy");
  if (spy) {
    const targets = [...document.querySelectorAll("section[id]")];
    targets.forEach(s => {
      const a = document.createElement("a");
      a.href = "#" + s.id;
      a.className = "spy-dot";
      a.innerHTML = `<span class="spy-label">${s.dataset.label || s.id}</span>`;
      a.setAttribute("aria-label", s.dataset.label || s.id);
      spy.appendChild(a);
    });
    const dots = [...spy.children];
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(rows => {
        rows.forEach(r => {
          const i = targets.indexOf(r.target);
          if (i > -1 && r.isIntersecting) {
            dots.forEach((d, j) => d.classList.toggle("on", j === i));
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach(s => io.observe(s));
    }
  }

  /* ---------- command palette ---------- */
  const ACTIONS = [
    { label: "Résumé (PDF)",        hint: "download",  run: () => location.assign("Pratik-Bairoliya-Resume.pdf") },
    { label: "Copy email address",  hint: "pratik0520@gmail.com", run: copyEmail },
    { label: "Email me",            hint: "mail",      run: () => location.assign("mailto:pratik0520@gmail.com") },
    { label: "GitHub",              hint: "pbairoliya", run: () => open("https://github.com/pbairoliya", "_blank") },
    { label: "LinkedIn",            hint: "pbairol",   run: () => open("https://linkedin.com/in/pbairol", "_blank") },
    { label: "On-device tools",     hint: "write-up",  run: () => location.assign("projects/on-device-tools.html") },
    { label: "lc",                  hint: "write-up",  run: () => location.assign("projects/lc.html") },
    { label: "Site source",         hint: "repo",      run: () => open("https://github.com/pbairoliya/pbairoliya.github.io", "_blank") },
    { label: "Jump to Work",        hint: "section",   run: () => go("work") },
    { label: "Jump to Stack",       hint: "section",   run: () => go("stack") },
    { label: "Jump to Projects",    hint: "section",   run: () => go("projects") },
    { label: "Jump to Credentials", hint: "section",   run: () => go("credentials") },
    { label: "Theme: system",       hint: "appearance", run: () => setTheme("system") },
    { label: "Theme: light",        hint: "appearance", run: () => setTheme("light") },
    { label: "Theme: dark",         hint: "appearance", run: () => setTheme("dark") },
  ];

  function go(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
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
      matches.forEach((a, i) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "pal-row" + (i === cursor ? " on" : "");
        row.innerHTML = `<span>${a.label}</span><span class="pal-hint">${a.hint}</span>`;
        row.addEventListener("click", () => { close(); a.run(); });
        list.appendChild(row);
      });
      if (!matches.length) list.innerHTML = '<p class="pal-empty">nothing matches</p>';
    }
    function filter(q) {
      q = q.trim().toLowerCase();
      matches = q ? ACTIONS.filter(a => (a.label + " " + a.hint).toLowerCase().includes(q)) : ACTIONS;
      cursor = 0; render();
    }
    function openPal() {
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
    render();
  }

  document.getElementById("copy")?.addEventListener("click", copyEmail);
})();

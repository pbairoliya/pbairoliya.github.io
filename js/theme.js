/* Theme: system by default, overridable, remembered.

   This lives on its own rather than inside the palette because every page needs
   it — including 404.html, which has no palette markup at all. Loading the whole
   palette just to apply a stored theme was why the 404 ignored it. */
(() => {
  "use strict";
  const KEY = "theme";
  const root = document.documentElement;

  function apply(mode) {
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    document.querySelectorAll("[data-theme-btn]").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.themeBtn === mode)));
  }
  const current = () => {
    try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
  };
  function set(mode) {
    try { localStorage.setItem(KEY, mode); } catch {}
    apply(mode);
    dispatchEvent(new CustomEvent("themechange", { detail: mode }));
  }

  apply(current());
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-theme-btn]");
    if (b) set(b.dataset.themeBtn);
  });
  window.__setTheme = set;      // the palette offers the same three options
})();

/* Notion-style block affordances.
   Hovering a section heading reveals a "#" that copies a deep link to it —
   the one Notion behaviour worth stealing, because it makes a section
   shareable instead of making the whole page shareable. */
(() => {
  "use strict";
  const toast = m => (window.__toast ? window.__toast(m) : null);

  document.querySelectorAll("section[id] > h2").forEach(h => {
    const a = document.createElement("button");
    a.type = "button";
    a.className = "anchor";
    a.textContent = "#";
    a.title = "Copy link to this section";
    a.setAttribute("aria-label", `Copy link to ${h.textContent.trim()}`);
    a.addEventListener("click", async () => {
      const url = location.href.split("#")[0] + "#" + h.parentElement.id;
      try { await navigator.clipboard.writeText(url); toast("Link to “" + h.textContent.trim() + "” copied"); }
      catch { toast(url); }
      history.replaceState(null, "", "#" + h.parentElement.id);
    });
    h.appendChild(a);
  });

  // a deep link should land on the section, not halfway through it
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }
})();

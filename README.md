# pbairoliya.github.io

Personal site. Plain HTML, three stylesheets, five small scripts — no framework,
no build step, no dependencies. Edit, commit, push; GitHub Pages serves it.

```
index.html                     landing
projects/on-device-tools.html  write-up
projects/lc.html               write-up
writing/index.html             the learning blog
writing/*.html                 posts

css/base.css                   tokens, reset, typography, layout
css/components.css             every discrete piece of UI
css/motion.css                 entrances, reveals, crossing highlight

js/field.js                    canvas background + the colour engine
js/palette.js                  command palette (Cmd-K) and theme control
js/sidebar.js                  sidebar navigation
js/spotlight.js                pointer-following highlight
js/reveal.js                   reveal-on-scroll
js/blocks.js                   per-section copy-link anchors
js/tour.js                     first-visit walkthrough
js/settings.js                 the gear popover
css/tour.css                   its styles
```

**The resume is the source of truth.** Everything factual on this site comes from
`~/Documents/Work/2026/Pratik-Bairol-Resume.tex`. When the resume changes, the site
changes — not the other way round.

**Colour follows the reader.** Every section owns a hue pair — cyan/azure for
the intro, indigo/violet for the background, teal/cyan for the stack. Cool hues
only. Scrolling into a section eases the whole palette toward it, with a few
degrees of wobble so it is never quite still. Lightness is pinned per theme so
that accent text clears WCAG AA (4.5:1) at *every* hue in the palette, not just
the flattering ones. `js/field.js` writes
`--accent`, `--accent-2`, `--wash` and `--hit` onto `:root`; everything tinted
reads those, so the page changes character as you read it.

To retheme a section, edit `SECTION_HUES` in `js/field.js` — the key is the
section's id.

**Every script is additive.** No JavaScript, no `IntersectionObserver`, no
`color-mix()`, or `prefers-reduced-motion` — the page still reads correctly.

Asset URLs carry a `?v=N` query. Bump it when changing CSS or JS so nobody gets
a half-cached mix of old styles and new markup.

# pbairoliya.github.io

Personal site. Plain HTML, three stylesheets, five small scripts — no framework,
no build step, no dependencies. Edit, commit, push; GitHub Pages serves it.

```
index.html                     landing
projects/on-device-tools.html  write-up
projects/lc.html               write-up

css/base.css                   tokens, reset, typography, layout
css/components.css             every discrete piece of UI
css/motion.css                 entrances, reveals, crossing highlight

js/field.js                    canvas background + the colour engine
js/palette.js                  command palette (Cmd-K) and theme control
js/pill.js                     floating section nav
js/spotlight.js                pointer-following highlight
js/reveal.js                   reveal-on-scroll
```

**Colour** is driven at runtime. `js/field.js` walks a palette of hue pairs,
easing between stops, and writes `--accent`, `--accent-2`, `--wash` and `--hit`
onto `:root`. Everything tinted on the page reads those variables, so the whole
site drifts together. A full lap is about two and a half minutes.

**Every script is additive.** No JavaScript, no `IntersectionObserver`, no
`color-mix()`, or `prefers-reduced-motion` — the page still reads correctly.

Asset URLs carry a `?v=N` query. Bump it when changing CSS or JS so nobody gets
a half-cached mix of old styles and new markup.

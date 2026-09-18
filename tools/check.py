#!/usr/bin/env python3
"""Pre-deploy checks for a static site with no build step.

Nothing here needs a toolchain — it is the set of mistakes that actually happen
when you hand-edit HTML across several files: a tag left open, a link to a file
that moved, an anchor to an id that was renamed, a stylesheet cached against
newer markup, and rules left behind after the element they styled was deleted.

    python3 tools/check.py        # from the repo root
"""
import html.parser
import pathlib
import re
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOID = {"meta", "link", "br", "img", "input", "hr", "source", "path", "circle", "use"}


class Doc(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.stray, self.files, self.anchors = [], [], [], []

    def _links(self, attrs):
        for key in ("src", "href"):
            v = attrs.get(key)
            if not v or v.startswith(("http://", "https://", "mailto:", "data:", "tel:")):
                continue
            (self.anchors if v.startswith("#") else self.files).append(v)

    def handle_startendtag(self, tag, attrs):
        self._links(dict(attrs))                      # <x/> opens and closes

    def handle_starttag(self, tag, attrs):
        self._links(dict(attrs))
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.stray.append((tag, self.stack[-3:]))


def main() -> int:
    ok = True
    pages = sorted(ROOT.rglob("*.html"))

    for page in pages:
        src = page.read_text()
        doc = Doc()
        doc.feed(src)
        missing = []
        for f in doc.files:
            path = urllib.parse.urlparse(f).path
            base = ROOT if path.startswith("/") else page.parent
            if not (base / path.lstrip("/")).resolve().exists():
                missing.append(f)
        ids = set(re.findall(r'id="([^"]+)"', src))
        dead = [a for a in doc.anchors if a[1:] and a[1:] not in ids]

        # a page.html#id fragment has to resolve in the OTHER page, which is the
        # check that would have caught the palette linking at 404s
        for f in doc.files:
            frag = urllib.parse.urlparse(f).fragment
            if not frag:
                continue
            base = ROOT if f.startswith("/") else page.parent
            target = (base / urllib.parse.urlparse(f).path.lstrip("/")).resolve()
            if target.is_dir():
                target = target / "index.html"
            if target.exists() and frag not in set(
                    re.findall(r'id="([^"]+)"', target.read_text())):
                dead.append(f)
        good = not (doc.stray or doc.stack or missing or dead)
        ok &= good
        rel = page.relative_to(ROOT)
        print(f"{'ok  ' if good else 'FAIL'} {rel}"
              f"  unclosed:{doc.stack or '-'}  stray:{doc.stray or '-'}"
              f"  missing:{missing or '-'}  dead-anchors:{dead or '-'}")

    # one cache-busting version across every asset URL, or a visitor can pair
    # new markup with an old stylesheet
    versions = set(re.findall(r"\?v=(\d+)", "".join(p.read_text() for p in pages)))
    print(f"{'ok  ' if len(versions) == 1 else 'FAIL'} asset version: {versions or 'none'}")
    ok &= len(versions) == 1

    html_src = "".join(p.read_text() for p in pages)
    css_src = "".join(p.read_text() for p in (ROOT / "css").glob("*.css"))
    js_src = "".join(p.read_text() for p in (ROOT / "js").glob("*.js"))

    used = {c for m in re.findall(r'class="([^"]+)"', html_src) for c in m.split()}
    js_used = set(re.findall(r'["\'.]([a-zA-Z][\w-]+)["\']', js_src))
    js_used |= {w for m in re.findall(r'className = "([\w -]+)"', js_src) for w in m.split()}

    unstyled = sorted(c for c in used if f".{c}" not in css_src)
    print(f"{'ok  ' if not unstyled else 'FAIL'} classes with no CSS rule: {unstyled or 'none'}")
    ok &= not unstyled

    defined = set(re.findall(r"\.([a-zA-Z][\w-]+)(?=[\s,:{>.\[])", css_src))
    orphans = sorted(d for d in defined if d not in used and d not in js_used)
    # advisory only: a selector can be legitimately built at runtime
    print(f"note  CSS rules nothing uses: {orphans or 'none'}")

    # js/*.js navigates by string; those paths are invisible to the HTML checks
    js_paths = set(re.findall(r'location\.assign\("([^"]+)"\)', js_src))
    js_paths |= set(re.findall(r'open\("(/[^"]+)"', js_src))
    bad_js = []
    for u in js_paths:
        if u.startswith(("http", "mailto:", "#")):
            continue
        target = (ROOT / u.lstrip("/")).resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            bad_js.append(u)
    print(f"{'ok  ' if not bad_js else 'FAIL'} paths navigated from JS: {bad_js or 'all resolve'}")
    ok &= not bad_js

    # The sheet broke because `body.side-collapsed .side` was declared at top
    # level AFTER the mobile rules, so a stored collapse pinned the sheet
    # off-screen at every width. Any state class that only means something at
    # one breakpoint has to live inside that breakpoint.
    scoped_only = ["side-collapsed"]
    leaks = []
    for name in scoped_only:
        depth = 0
        for line in css_src.split("\n"):
            if line.strip().startswith("@media"):
                depth += 1
            depth += line.count("{") - line.count("}") if depth else 0
            if f".{name}" in line and "{" in line and depth <= 0:
                leaks.append(line.strip()[:64])
    print(f"{'ok  ' if not leaks else 'FAIL'} breakpoint-only classes stay scoped: "
          f"{leaks or 'yes'}")
    ok &= not leaks

    # Every page should carry the same shell. Divergence here is what makes one
    # page feel like a different site, and it is invisible until you look for it.
    SHELL = ['class="skip"', 'id="side-toggle"', 'class="side-scrim"', 'id="gear"',
             'id="settings"', 'class="side"', 'id="palette"', 'id="side-collapse"']
    SHEETS = ["base.css", "components.css", "motion.css", "tour.css"]
    SCRIPTS = ["field", "palette", "spotlight", "sidebar", "reveal", "settings",
               "a11y", "blocks", "theme"]
    gaps = []
    for page in pages:
        if page.name == "404.html":
            continue                       # deliberately bare
        src = page.read_text()
        rel = page.relative_to(ROOT)
        gaps += [f"{rel}: no {m}" for m in SHELL if m not in src]
        gaps += [f"{rel}: no {s}" for s in SHEETS if s not in src]
        gaps += [f"{rel}: no js/{s}" for s in SCRIPTS if f"js/{s}.js" not in src]
    print(f"{'ok  ' if not gaps else 'FAIL'} every page carries the same shell: "
          f"{gaps or 'yes'}")
    ok &= not gaps

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

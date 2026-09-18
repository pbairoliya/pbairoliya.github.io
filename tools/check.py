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
            if v and not v.startswith(("http", "mailto:", "data:")):
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
        missing = [
            f for f in doc.files
            if not (page.parent / urllib.parse.urlparse(f).path).resolve().exists()
        ]
        ids = set(re.findall(r'id="([^"]+)"', src))
        dead = [a for a in doc.anchors if a[1:] and a[1:] not in ids]
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

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

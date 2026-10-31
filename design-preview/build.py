#!/usr/bin/env python3
"""本番のHTMLから、デザイン確認用のページを design-preview/{current,a,b}/ に生成する。

本番のファイルは書き換えない。土台は原案（タグ design-before-plan-a）で固定する。
案A・案Bは「原案の style.css ＋ 各フォルダの theme.css（上書き）」で表示する。
使い方: python3 design-preview/build.py
"""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design-preview"
BASE_TAG = "design-before-plan-a"
PAGES = ["index", "about", "services", "pricing", "contact", "privacy", "archive"]

MPLUS_LINK = re.compile(r'<link href="https://fonts\.googleapis\.com/css2\?family=M\+PLUS[^>]*>', re.S)
FONTS = {
    "a": "family=Shippori+Mincho:wght@500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700"
         "&family=Cormorant+Garamond:ital,wght@1,400;1,500",
    "b": "family=Zen+Kaku+Gothic+New:wght@300;400;500;700"
         "&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400",
}
LABELS = [("a", "案A"), ("b", "案B"), ("current", "現行")]

SWITCHER_CSS = """<style>
.dp-switch{position:fixed;left:16px;bottom:16px;z-index:3000;display:flex;align-items:center;gap:2px;padding:4px;
background:rgba(30,34,30,.86);border-radius:6px;font:500 12px/1 'Zen Kaku Gothic New','Hiragino Sans',sans-serif;
letter-spacing:.04em;box-shadow:0 4px 18px rgba(0,0,0,.25)}
.dp-switch a{color:#fff;padding:9px 11px;border-radius:4px;opacity:.72;font-size:12px}
.dp-switch a:hover{opacity:1;color:#fff}
.dp-switch a[aria-current]{background:#fff;color:#222;opacity:1}
</style>"""


def switcher(variant: str, page: str) -> str:
    links = [f'<a href="../index.html">一覧</a>']
    for key, label in LABELS:
        current = ' aria-current="page"' if key == variant else ""
        links.append(f'<a href="../{key}/{page}.html"{current}>{label}</a>')
    return f'<nav class="dp-switch" aria-label="デザイン案の切り替え">{"".join(links)}</nav>'


def build_page(html: str, variant: str, page: str) -> str:
    html = re.sub(r'(href=")style\.css', r'\1../style-original.css', html)
    html = re.sub(r'(src=")(images/|js/|script\.js)', r'\1../../\2', html)
    html = html.replace('<meta charset="UTF-8">',
                        '<meta charset="UTF-8">\n    <meta name="robots" content="noindex, nofollow">', 1)

    if variant in FONTS:
        font_link = f'<link href="https://fonts.googleapis.com/css2?{FONTS[variant]}&display=swap" rel="stylesheet">'
        html = MPLUS_LINK.sub(font_link, html, count=1)
        html = re.sub(r'(<link rel="stylesheet" href="\.\./style-original\.css[^>]*>)',
                      r'\1\n    <link rel="stylesheet" href="theme.css">', html, count=1)

    return html.replace("</body>", f"{SWITCHER_CSS}\n{switcher(variant, page)}\n</body>", 1)


def main() -> None:
    for variant, _ in LABELS:
        folder = OUT / variant
        folder.mkdir(exist_ok=True)
        for page in PAGES:
            source = subprocess.run(["git", "show", f"{BASE_TAG}:{page}.html"], cwd=ROOT, check=True,
                                    capture_output=True, encoding="utf-8").stdout
            (folder / f"{page}.html").write_text(build_page(source, variant, page), encoding="utf-8")
    print(f"built {len(PAGES)} pages x {len(LABELS)} variants")


if __name__ == "__main__":
    main()

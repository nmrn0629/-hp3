import os

files = ['about.html', 'contact.html', 'pricing.html', 'privacy.html', 'services.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = content.replace('<li><a href="index.html">ホーム</a></li>', '<li class="nav-home"><a href="index.html">ホーム</a></li>')
    logo_html = '\n            <a href="index.html" class="mobile-center-logo">\n                <img src="images/logo2ヘッダー用.png" alt="ホームへ">\n            </a>'
    content = content.replace('</h1>\n            <nav class="nav">', f'</h1>{logo_html}\n            <nav class="nav">')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

with open('index.html', 'r', encoding='utf-8') as file:
    content = file.read()
content = content.replace('<li><a href="index.html">ホーム</a></li>', '<li class="nav-home"><a href="index.html">ホーム</a></li>')
with open('index.html', 'w', encoding='utf-8') as file:
    file.write(content)

with open('style.css', 'r', encoding='utf-8') as file:
    css = file.read()

css = css.replace('clip-path: circle(65% at 100% 0%);', 'clip-path: circle(48% at 100% 0%);')

mobile_css = """
    .nav-home {
        display: none;
    }

    .mobile-center-logo {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        z-index: 1000;
    }

    .mobile-center-logo img {
        height: 35px;
        width: auto;
    }
"""

if 'clip-path: circle(48% at 100% 0%);\n        pointer-events: auto;\n    }' in css:
    css = css.replace('.nav-list.active {\n        /* Active State: Circle expands to cover top-right corner */\n        clip-path: circle(48% at 100% 0%);\n        pointer-events: auto;\n    }', '.nav-list.active {\n        /* Active State: Circle expands to cover top-right corner */\n        clip-path: circle(48% at 100% 0%);\n        pointer-events: auto;\n    }\n' + mobile_css)
else:
    # Just append it if we fail to replace the exact string
    css += '\n@media (max-width: 768px) {\n' + mobile_css + '\n}\n'


if '@media (min-width: 769px) {\n    .hero-background {' in css:
    css = css.replace('@media (min-width: 769px) {\n    .hero-background {', '@media (min-width: 769px) {\n    .mobile-center-logo {\n        display: none;\n    }\n\n    .hero-background {')
else:
    css += '\n@media (min-width: 769px) {\n    .mobile-center-logo {\n        display: none;\n    }\n}\n'

with open('style.css', 'w', encoding='utf-8') as file:
    file.write(css)

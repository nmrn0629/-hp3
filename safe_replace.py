import os

# Files to update
html_files = ["about.html", "contact.html", "index.html", "pricing.html", "privacy.html", "services.html"]
css_file = "style.css"

# Replacements
replacements = {
    # index.html specific
    'src="images/logo.png"': 'src="images/金ロゴ.png"',
    'src="images/2k木ロゴ2.png"': 'src="images/トピックス用金ロゴ.png"',
    # Other headers
    'src="images/logo2ヘッダー用.png"': 'src="images/金ロゴ背景除去　ヘッダー用.png"'
}

def replace_in_file(filepath):
    if not os.path.exists(filepath):
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f"Updated {filepath}")

# Update HTML files
for file in html_files:
    replace_in_file(file)

# CSS modifications for hero section
css_replacements = {
    """padding-bottom: 0;
    /* Minimized bottom padding */
    margin-bottom: -50px;""": """padding-bottom: 30px;
    /* Added bottom padding */
    margin-bottom: 0;""",
    """background-color: var(--color-bg);""": """background-image: linear-gradient(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.55)), url('images/トップ背景3.png');
    background-size: cover;
    background-position: center;""",
    """height: 400px;
    /* Increased height for larger display */
    object-fit: cover;""": """height: auto;
    max-height: 400px;
    object-fit: contain;"""
}

if os.path.exists(css_file):
    with open(css_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in css_replacements.items():
        content = content.replace(old, new)
        
    if content != original:
        with open(css_file, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f"Updated {css_file}")

print("Done.")

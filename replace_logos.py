import os
import glob

files = glob.glob('*.html')
replacements = {
    'images/logo.png': 'images/金ロゴ.png',
    'images/2k木ロゴ2.png': 'images/金ロゴ.png',
    'images/logo2ヘッダー用.png': 'images/金ロゴ背景除去　ヘッダー用.png'
}

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if original != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")

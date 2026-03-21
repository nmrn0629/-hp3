import os
import glob

files = glob.glob('*.html')

for file in files:
    with open(file, 'rb') as f:
        content = f.read()
    
    if content.startswith(b'\xef\xbb\xbf'):
        content = content[3:]
        with open(file, 'wb') as f:
            f.write(content)
        print(f"Removed BOM from {file}")

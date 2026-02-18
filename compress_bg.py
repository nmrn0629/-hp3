from PIL import Image
import os

def compress_image():
    input_path = "images/top_bg.png"
    output_path = "images/hero_bg.jpg"
    
    try:
        if not os.path.exists(input_path):
            print(f"Error: {input_path} not found.")
            return

        with Image.open(input_path) as img:
            # Convert RGBA to RGB if necessary
            if img.mode in ('RGBA', 'LA'):
                background = Image.new(img.mode[:-1], img.size, (255, 255, 255))
                background.paste(img, img.split()[-1])
                img = background
            
            # Save as JPEG with 80% quality
            img.convert('RGB').save(output_path, "JPEG", quality=80, optimize=True)
            print(f"Successfully compressed {input_path} to {output_path}")
            
            # Print file sizes
            original_size = os.path.getsize(input_path) / 1024
            new_size = os.path.getsize(output_path) / 1024
            print(f"Original size: {original_size:.2f} KB")
            print(f"New size: {new_size:.2f} KB")
            print(f"Reduction: {(1 - new_size/original_size)*100:.1f}%")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    compress_image()

from PIL import Image
import sys

import os

def crop_image(image_path, output_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        
        # Split into bands
        r, g, b, a = img.split()
        
        # Get bounding box of non-zero alpha pixels
        bbox = a.getbbox()
        
        if bbox:
            print(f"Original size: {img.size}")
            print(f"Cropping to: {bbox}")
            cropped_img = img.crop(bbox)
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            cropped_img.save(output_path)
            print(f"Successfully saved cropped image to {output_path}")
            print(f"New size: {cropped_img.size}")
        else:
            print("Image is fully transparent or empty.")
            
    except Exception as e:
        print(f"Error cropping image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    base_dir = r"c:\Users\ah266\OneDrive\デスクトップ\ハーモグロー用\-hp3"
    input_path = os.path.join(base_dir, "images", "logo.png")
    output_path = os.path.join(base_dir, "images", "logo-mobile.png")
    crop_image(input_path, output_path)

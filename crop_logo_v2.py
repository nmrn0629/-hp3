from PIL import Image
import sys

def crop_image(image_path):
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
            cropped_img.save(image_path)
            print(f"Successfully cropped {image_path}")
            print(f"New size: {cropped_img.size}")
        else:
            print("Image is fully transparent or empty.")
            
    except Exception as e:
        print(f"Error cropping image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    crop_image(r"c:\Users\ah266\OneDrive\デスクトップ\ハーモグロー用\-hp3\images\logo.png")

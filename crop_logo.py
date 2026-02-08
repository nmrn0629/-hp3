from PIL import Image

def crop_image(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            if item[0] == 255 and item[1] == 255 and item[2] == 255:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        
        # Get bounding box of non-transparent pixels
        bbox = img.getbbox()
        if bbox:
            cropped_img = img.crop(bbox)
            cropped_img.save(image_path)
            print(f"Successfully cropped {image_path}")
        else:
            print("Image is fully transparent or empty.")
            
    except Exception as e:
        print(f"Error cropping image: {e}")

if __name__ == "__main__":
    crop_image(r"c:\Users\ah266\OneDrive\デスクトップ\ハーモグロー用\-hp3\images\logo.png")

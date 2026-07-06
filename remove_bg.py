import os
from PIL import Image

def remove_white_background(image_path):
    img = Image.open(image_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # threshold for white
    threshold = 240
    for item in datas:
        # Check if the pixel is near white
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            # changing alpha to 0
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(image_path, "PNG")

directory = r"c:\swcoding\public\images"
for filename in os.listdir(directory):
    if filename.endswith(".png"):
        path = os.path.join(directory, filename)
        try:
            remove_white_background(path)
            print(f"Processed: {filename}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

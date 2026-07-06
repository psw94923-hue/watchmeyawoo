import os
import sys
from PIL import Image

sys.setrecursionlimit(20000)

def remove_background(img, is_human=False):
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    
    for item in datas:
        r, g, b, a = item
        if not is_human:
            if r > 240 and g > 240 and b > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        else:
            if (r > 190 and g > 190 and b > 190 and abs(r-g) < 15 and abs(g-b) < 15) or (r>210 and g>210 and b>210):
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
    img.putdata(new_data)
    return img

def find_components(img):
    width, height = img.size
    pixels = img.load()
    visited = set()
    components = []

    def get_neighbors(x, y):
        ns = []
        if x > 0: ns.append((x-1, y))
        if x < width - 1: ns.append((x+1, y))
        if y > 0: ns.append((x, y-1))
        if y < height - 1: ns.append((x, y+1))
        if x > 0 and y > 0: ns.append((x-1, y-1))
        if x < width - 1 and y > 0: ns.append((x+1, y-1))
        if x > 0 and y < height - 1: ns.append((x-1, y+1))
        if x < width - 1 and y < height - 1: ns.append((x+1, y+1))
        return ns

    for y in range(height):
        for x in range(width):
            if (x, y) not in visited:
                r, g, b, a = pixels[x, y]
                if a > 0:
                    comp_pixels = []
                    queue = [(x, y)]
                    visited.add((x, y))
                    
                    while queue:
                        cx, cy = queue.pop(0)
                        comp_pixels.append((cx, cy))
                        for nx, ny in get_neighbors(cx, cy):
                            if (nx, ny) not in visited:
                                nr, ng, nb, na = pixels[nx, ny]
                                if na > 0:
                                    visited.add((nx, ny))
                                    queue.append((nx, ny))
                    components.append(comp_pixels)
                else:
                    visited.add((x, y))
    return components

def filter_text_components(img, cell_box, level):
    comp_img = img.copy()
    components = find_components(comp_img)
    
    if not components:
        return comp_img

    components.sort(key=len, reverse=True)
    main_comp = components[0]
    
    pixels = comp_img.load()
    for y in range(comp_img.height):
        for x in range(comp_img.width):
            pixels[x, y] = (255, 255, 255, 0)
            
    valid_components = [main_comp]
    
    for comp in components[1:]:
        comp_ys = [p[1] for p in comp]
        comp_min_y = min(comp_ys)
        comp_max_y = max(comp_ys)
        
        # Aggressive text filtering
        # Level 1 text is at top. Egg is at center.
        if len(comp) < 1500:
            if comp_max_y < comp_img.height * 0.35: # Top part text
                continue
            if level == 5 and comp_min_y > comp_img.height * 0.8: # Bottom text
                continue
                
        is_black = True
        for (cx, cy) in comp:
            r, g, b, a = img.getpixel((cx, cy))
            if r > 50 or g > 50 or b > 50:
                is_black = False
                break
        
        if is_black and len(comp) < 1500:
            continue
            
        valid_components.append(comp)

    orig_pixels = img.load()
    for comp in valid_components:
        for (x, y) in comp:
            pixels[x, y] = orig_pixels[x, y]
            
    bbox = comp_img.getbbox()
    if bbox:
        return comp_img.crop(bbox)
    return comp_img

def process_dragons():
    print("Processing dragons...")
    img = Image.open('public/images/dragons_sheet.png')
    img = remove_background(img, is_human=False)
    
    types = ['black', 'blue', 'silver', 'red']
    
    width, height = img.size
    cell_w = width / 4
    cell_h = height / 5
    
    out_dir = 'public/images/dragons'
    os.makedirs(out_dir, exist_ok=True)
    
    for row in range(5):
        for col in range(4):
            left = col * cell_w
            top = row * cell_h
            right = (col + 1) * cell_w
            bottom = (row + 1) * cell_h
            
            crop_box = (int(left), int(top), int(right), int(bottom))
            sprite = img.crop(crop_box)
            
            level = row + 1
            sprite = filter_text_components(sprite, crop_box, level)
                
            dragon_type = types[col]
            sprite.save(f"{out_dir}/{dragon_type}_dragon_lv{level}.png")
            print(f"Saved {dragon_type}_dragon_lv{level}.png")

if __name__ == "__main__":
    process_dragons()
    print("Done processing sprites.")

import os
from PIL import Image, ImageEnhance, ImageFilter
import process_pet_sprites as pps

BASE_DIR = r"c:\Users\kwz50\Reflow\public\assets\pets"


def apply_outline(img, color=(100, 100, 100)):
    """
    Applies a 1px outline/glow around the non-transparent pixels.
    """
    # 1. Extract Alpha
    # Ensure standard RGBA
    img = img.convert("RGBA")
    alpha = img.getchannel('A')

    # 2. Dilate Alpha to create outline mask
    # MaxFilter(3) expands by 1 pixel in all directions (3x3 kernel)
    dilated = alpha.filter(ImageFilter.MaxFilter(3))

    # 3. Create solid color image for outline
    # Outline color with full opacity
    outline_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))

    # Create a solid color block
    solid_color = Image.new("RGBA", img.size, color + (255,))

    # Paste solid color using dilated mask
    outline_layer.paste(solid_color, (0, 0), mask=dilated)

    # 4. Composite: Outline below, Original on top
    final_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
    final_img.paste(outline_layer, (0, 0))
    final_img.paste(img, (0, 0), mask=alpha)

    return final_img


def apply_red_eye_generic(img, region_box=None):
    """
    Scans for pure black (0,0,0) or very dark pixels in a specific region 
    and turns them red (255,0,0).
    region_box: (x1, y1, x2, y2) relative to img. If None, scans whole image.
    """
    pixels = img.load()
    w, h = img.size

    x1, y1, x2, y2 = region_box if region_box else (0, 0, w, h)

    # Ensure bounds
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    found_eye = False

    # Scan
    for y in range(int(y1), int(y2)):
        for x in range(int(x1), int(x2)):
            r, g, b, a = pixels[x, y]
            if a > 0:  # Visible
                # Threshold for "Black Eye"
                if r < 30 and g < 30 and b < 30:
                    # Turn Red
                    pixels[x, y] = (255, 0, 0, 255)
                    found_eye = True

                    # Add simple glow (cross shape)
                    # if 0 < x < w-1 and 0 < y < h-1:
                    #     if pixels[x+1, y][3] == 0: pixels[x+1, y] = (200, 0, 0, 100)
                    #     if pixels[x-1, y][3] == 0: pixels[x-1, y] = (200, 0, 0, 100)

    return found_eye


def process_bear_frame(img):
    """
    Bear Strategy:
    1. Find White Pixels (V-neck)
    2. Calculate center of V-neck
    3. Eye is expected to be ABOVE and slightly RIGHT (if facing right)

    Actually, let's look for the bounding box of the non-transparent pixels.
    Head is usually usually at the top right or top left.
    Let's assume the bear is walking RIGHT.
    Then head is Top-Right.
    Eye is the black pixel embedded in the black head... wait, if head is black and eye is black, 
    we can't see the eye?

    Actually, pixel art usually uses a lighter color for the eye specularity or 
    a different color for the eye if it's visible against black fur.
    BUT, if the analysis said (0,0,0) is dominant, maybe the eye IS just black 
    but effectively invisible or defined by shape?

    Let's try to just put a red dot in the "Head" area.
    Head area estimate: Top 30% of the bounding box, Right 30%?
    """
    pixels = img.load()
    w, h = img.size
    bbox = img.getbbox()
    if not bbox:
        return

    bx1, by1, bx2, by2 = bbox
    bw = bx2 - bx1
    bh = by2 - by1

    # Heuristic: Eye is in the top-right quadrant of the bounding box (assuming facing right)
    # Let's define a search area for "Eye"
    # Actually, for the bear, let's just create a red eye at a fixed relative position of the bounding box.
    # Top 25%, Right 20%?

    eye_x = int(bx2 - bw * 0.15)
    eye_y = int(by1 + bh * 0.25)

    # Draw a red eye
    # Check if we are landing on a visible pixel
    if 0 <= eye_x < w and 0 <= eye_y < h and pixels[eye_x, eye_y][3] > 0:
        pixels[eye_x, eye_y] = (255, 0, 0, 255)
    else:
        # Search nearby for a visible pixel
        for ox in range(-5, 5):
            for oy in range(-5, 5):
                nx, ny = eye_x + ox, eye_y + oy
                if 0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] > 0:
                    pixels[nx, ny] = (255, 0, 0, 255)
                    break


def create_dark_pets():
    # 1. Process Standard Configs (1x4 strips)
    for filename, config in pps.PET_CONFIGS.items():
        print(f"Processing Dark Version for {filename}...")
        path = os.path.join(BASE_DIR, filename)
        if not os.path.exists(path):
            continue

        img = Image.open(path).convert("RGBA")
        is_bear = "black_bear" in filename

        # 1. Darken (Skip for Bear)
        if not is_bear:
            enhancer = ImageEnhance.Brightness(img)
            img_dark = enhancer.enhance(0.7)  # 70% brightness
        else:
            img_dark = img.copy()  # Keep original brightness for bear

        # 2. Red Eyes & Outline (Process full strip logic)
        # We need to process "frames" logically, but here we have the Full Strip.
        # We can apply Red Eye to the Full Strip if we know where the heads are.
        # The heads are likely in the Top-Right of each 1/4 strip.

        bx1, by1, bx2, by2 = config["bbox"]
        # Union area
        union_w = bx2 - bx1
        union_h = by2 - by1
        frame_w = union_w // 4

        # Determine strict ROI for eyes based on species
        # is_bear = "black_bear" in filename # Already determined above

        # Offset to the Union Box
        # We only edit pixels inside the union box

        # Iterate over 4 frames inside the strip
        for i in range(4):
            # Frame bounds relative to image
            fx1 = bx1 + i * frame_w
            fy1 = by1
            fx2 = bx1 + (i + 1) * frame_w
            fy2 = by2

            if is_bear:
                # Apply Red Eye FIRST
                temp_frame = img_dark.crop((fx1, fy1, fx2, fy2))
                process_bear_frame(temp_frame)

                # Apply Outline
                temp_frame = apply_outline(temp_frame, color=(120, 120, 120))

                # Paste back. Note: Outline might expand size?
                # MaxFilter(3) expands by 1px.
                # If we paste back to the same slot, we might clip the outline.
                # But the slot usually has padding. The "bbox" in config is the TIGHT union.
                # But the frames are usually drawn with spacing?
                # No, standard frames (sliced ones) are 256x256 centered.
                # Here we are editing the Sprite Sheet.
                # The Sprite Sheet `img_dark` has limited space.
                # If we expand the bear, we might overlap.

                # Solution: We should apply outline AFTER slicing?
                # Or, we modify `slice_image` to handle dilated content?
                # Actually, `slice_image` crops `union` then splits into 4.
                # If we edit `img_dark` (the sprite sheet), we are constrained by the layout.

                # Alternative: Don't edit the sprite sheet for Bear.
                # Instead, slice the original bear (with red eye), THEN apply outline on the individual frames.
                # But we want to produce a `_dark.png` sprite sheet too.

                # Let's hope the `bbox` has 1px padding?
                # Bbox: 12, 188. Img width: 444?
                # Let's just paste it back. If it clips 1px, it's okay for now.
                # Or we can shrink the bear by 1%? No.

                img_dark.paste(temp_frame, (fx1, fy1))
            else:
                # General approach: Top-Right of the frame contains the eye
                # Scan top 40%, right 40% of the frame
                roi = (
                    fx2 - frame_w * 0.4,  # x1
                    fy1,                 # y1
                    fx2,                 # x2
                    fy1 + union_h * 0.4  # y2
                )
                apply_red_eye_generic(img_dark, region_box=roi)

        # 3. Save Dark Strip
        dark_filename = f"{os.path.splitext(filename)[0]}_dark{os.path.splitext(filename)[1]}"
        dark_path = os.path.join(BASE_DIR, dark_filename)
        img_dark.save(dark_path)
        print(f"  Saved {dark_filename}")

        # 4. Slice it!
        print(f"  Slicing {dark_filename}...")
        # Note: We pass the ORIGINAL filename so slicer can find the config
        # But we pass the DARK image object
        # And we specify a custom output prefix
        prefix = os.path.splitext(filename)[0] + "_dark"
        pps.slice_image(img_dark, filename, BASE_DIR, output_prefix=prefix)

    # 2. Process Leopard Cat (2x2 Grid)
    l_filename = "leopard_cat_walk.png"
    l_path = os.path.join(BASE_DIR, l_filename)
    if os.path.exists(l_path):
        print(f"Processing Dark Version for {l_filename}...")
        img = Image.open(l_path).convert("RGBA")

        # Darken
        enhancer = ImageEnhance.Brightness(img)
        img_dark = enhancer.enhance(0.7)

        # Red Eye for 2x2
        # Coords: [(x1,y1,x2,y2), ...]
        for i, (cx1, cy1, cx2, cy2) in enumerate(pps.LEOPARD_CAT_COORDS):
            w = cx2 - cx1
            h = cy2 - cy1

            # ROI: Top-Right of each cell (assuming facing right)
            roi = (
                cx2 - w * 0.4,  # x1
                cy1,           # y1
                cx2,           # x2
                cy1 + h * 0.4  # y2
            )
            apply_red_eye_generic(img_dark, region_box=roi)

        # Save Dark Strip
        dark_filename = "leopard_cat_walk_dark.png"
        img_dark.save(os.path.join(BASE_DIR, dark_filename))

        # Slice
        pps.slice_image(img_dark, l_filename, BASE_DIR,
                        output_prefix="leopard_cat_walk_dark")


if __name__ == "__main__":
    create_dark_pets()

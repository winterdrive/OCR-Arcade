from PIL import Image, ImageFilter
import os
import json
import sys

# Increase recursion depth for flood fill if needed, though we use iterative.
sys.setrecursionlimit(10000)


def find_components(file_path):
    print(f"Analyzing {os.path.basename(file_path)}...")
    img = Image.open(file_path).convert("RGBA")
    width, height = img.size

    # 1. Create a binary mask of content vs empty
    # Scale down to speed up processing (e.g. 1/2 or 1/4 size)
    scale = 2
    small_w = width // scale
    small_h = height // scale
    small_img = img.resize((small_w, small_h), Image.NEAREST)

    pixels = list(small_img.getdata())
    # 0 = empty, 1 = content
    mask = [1 if p[3] > 10 else 0 for p in pixels]

    # 2. Morphological Dilation key logic:
    # Expand content by N pixels to bridge gaps within a single sprite
    # and ensure it's treated as one object.
    # But don't expand so much that separate sprites merge.
    # In 456px image, sprites are large. Gap between them is likely > 10px.
    # Dilation radius of 2-3 (scaled) should work.

    # Simple boolean dilation pass
    dilated_mask = list(mask)
    w = small_w
    h = small_h

    # Multi-pass dilation
    for _ in range(3):
        new_mask = list(dilated_mask)
        for i, val in enumerate(dilated_mask):
            if val == 1:
                # Set neighbors to 1
                y = i // w
                x = i % w
                # 4-connected
                if x > 0:
                    new_mask[i-1] = 1
                if x < w-1:
                    new_mask[i+1] = 1
                if y > 0:
                    new_mask[i-w] = 1
                if y < h-1:
                    new_mask[i+w] = 1
        dilated_mask = new_mask

    # 3. Connected Components (Iterative Flood Fill)
    visited = [False] * (w * h)
    components = []  # List of [min_x, min_y, max_x, max_y] (scaled)

    for i in range(w * h):
        if dilated_mask[i] == 1 and not visited[i]:
            # Start new component
            min_x, max_x = i % w, i % w
            min_y, max_y = i // w, i // w

            stack = [i]
            visited[i] = True

            while stack:
                curr = stack.pop()
                cx = curr % w
                cy = curr // w

                # Update bbox
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                # Check neighbors
                neighbors = []
                if cx > 0:
                    neighbors.append(curr - 1)
                if cx < w - 1:
                    neighbors.append(curr + 1)
                if cy > 0:
                    neighbors.append(curr - w)
                if cy < h - 1:
                    neighbors.append(curr + w)

                for n in neighbors:
                    if dilated_mask[n] == 1 and not visited[n]:
                        visited[n] = True
                        stack.append(n)

            # Component finished.
            # Convert back to original scale
            # Add padding?
            comp = [
                min_x * scale, min_y * scale,
                (max_x + 1) * scale, (max_y + 1) * scale
            ]

            # Filter tiny noise components
            if (comp[2] - comp[0]) > 20 and (comp[3] - comp[1]) > 20:
                components.append(comp)

    print(f"  Found {len(components)} components.")

    # 4. Sort and Refine
    # We expect 4 frames.
    # Sort by Y then X to order them 0,1,2,3
    # Heuristic: Sort by Grid Position
    # Centroid
    def get_centroid(c):
        return ((c[0]+c[2])/2, (c[1]+c[3])/2)

    components.sort(key=lambda c: (get_centroid(
        c)[1] // (height/2), get_centroid(c)[0]))

    # Refine the BBox by looking at the ORIGINAL image within this rough box
    final_frames = []
    for rough_box in components:
        # Crop the original image with rough box (+padding safely)
        pad = 5
        x1 = max(0, rough_box[0] - pad)
        y1 = max(0, rough_box[1] - pad)
        x2 = min(width, rough_box[2] + pad)
        y2 = min(height, rough_box[3] + pad)

        crop = img.crop((x1, y1, x2, y2))
        bbox = crop.getbbox()

        if bbox:
            # True precise bbox
            gx1 = x1 + bbox[0]
            gy1 = y1 + bbox[1]
            gx2 = x1 + bbox[2]
            gy2 = y1 + bbox[3]
            final_frames.append([gx1, gy1, gx2, gy2])
            print(f"    Frame: {gx1},{gy1},{gx2},{gy2}  ({gx2-gx1}x{gy2-gy1})")

    return final_frames


if __name__ == "__main__":
    global_results = {}
    base_dir = r"c:\Users\kwz50\Reflow\public\assets\pets"
    files = [
        "leopard_cat_walk.png",
        "black_bear_walk_v2.png",
        "salamander_walk.png",
        "hare_walk.png",
        "muntjac_walk.png"
    ]

    for f in files:
        path = os.path.join(base_dir, f)
        if os.path.exists(path):
            frames = find_components(path)
            global_results[f] = {
                "layout": "custom",
                "frames": frames
            }

    # Save
    out_path = r"c:\Users\kwz50\Reflow\scripts\detected_layout_global.json"
    with open(out_path, "w") as f:
        json.dump(global_results, f, indent=4)
    print("Done.")

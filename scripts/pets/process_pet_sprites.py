from PIL import Image
import os

# Defined from manual analysis of "analyze_layout_global.py" output
# Union Box: [x1, y1, x2, y2]
PET_CONFIGS = {
    "black_bear_walk_v2.png": {"bbox": [12, 188, 444, 269], "count": 4},
    "salamander_walk.png": {"bbox": [12, 214, 444, 248], "count": 4},
    "muntjac_walk.png": {"bbox": [12, 177, 446, 280], "count": 4},
    "hare_walk.png": {"bbox": [13, 168, 448, 289], "count": 4},
}

# Leopard Cat Special Config (2x2 Grid)
LEOPARD_CAT_COORDS = [
    (10, 105, 221, 210),   # TL
    (235, 105, 446, 210),  # TR
    (14, 254, 231, 359),   # BL (Approximated from blob)
    (219, 254, 442, 359)   # BR
]


def slice_image(img, original_filename, output_dir, output_prefix=None):
    """
    Slices a generic pet image based on its filename matching PET_CONFIGS
    or special logic for leopard_cat.

    Args:
        img: PIL Image object (RGBA)
        original_filename: The key to look up in PET_CONFIGS (e.g. "black_bear_walk_v2.png")
        output_dir: Where to save the frames
        output_prefix: Prefix for output files. If None, uses original_filename without extension.
    """
    if output_prefix is None:
        output_prefix = os.path.splitext(original_filename)[0]

    # Special handling for Leopard Cat (2x2 Grid)
    if "leopard_cat_walk" in original_filename:
        print(f"Processing 2x2 grid for {output_prefix}...")
        TARGET_SIZE = 256
        for i, (x1, y1, x2, y2) in enumerate(LEOPARD_CAT_COORDS):
            crop = img.crop((x1, y1, x2, y2))

            # Center
            frame = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
            ox = (TARGET_SIZE - crop.width) // 2
            oy = (TARGET_SIZE - crop.height) // 2
            frame.paste(crop, (ox, oy))

            out_name = f"{output_prefix}_frame_{i}.png"
            frame.save(os.path.join(output_dir, out_name))
            print(f"  Saved {out_name}")
        return

    # Standard handling for 1x4 strips
    if original_filename not in PET_CONFIGS:
        print(f"No config found for {original_filename}, skipping slice.")
        return

    config = PET_CONFIGS[original_filename]
    bx1, by1, bx2, by2 = config["bbox"]

    # Crop the active union area
    union = img.crop((bx1, by1, bx2, by2))
    uw, uh = union.size

    # Split into N even frames (assuming horizontal strip)
    fw = uw // 4

    for i in range(4):
        # Crop strip from union
        strip = union.crop((i * fw, 0, (i + 1) * fw, uh))

        # Post-process: Find content bbox within strip to center it perfectly
        bbox = strip.getbbox()
        if bbox:
            content = strip.crop(bbox)

            # Center in 256x256
            TARGET_SIZE = 256
            frame = Image.new(
                "RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))

            ox = (TARGET_SIZE - content.width) // 2
            oy = (TARGET_SIZE - content.height) // 2

            frame.paste(content, (ox, oy))

            out_name = f"{output_prefix}_frame_{i}.png"
            frame.save(os.path.join(output_dir, out_name))
            print(f"  Saved {out_name}")


def slice_smart_split():
    base_dir = r"c:\Users\kwz50\Reflow\public\assets\pets"

    # Process standard configs
    for filename in PET_CONFIGS.keys():
        print(f"Processing {filename}...")
        path = os.path.join(base_dir, filename)
        if not os.path.exists(path):
            continue

        img = Image.open(path).convert("RGBA")
        slice_image(img, filename, base_dir)

    # Process leopard cat if exists
    l_filename = "leopard_cat_walk.png"
    l_path = os.path.join(base_dir, l_filename)
    if os.path.exists(l_path):
        img = Image.open(l_path).convert("RGBA")
        slice_image(img, l_filename, base_dir)


if __name__ == "__main__":
    slice_smart_split()

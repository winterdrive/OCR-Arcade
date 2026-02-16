import os
from pathlib import Path

from PIL import Image

import process_pet_sprites as pps

# ====== Zero-argument mode ======
# 直接執行 `python scripts/pets/slice_pet_variants.py` 即可切割。
# 路徑與檔名都寫死在這裡，如有需要自行增減。
BASE_DIR = Path(r"c:\Users\kwz50\Reflow\public\assets\pets")
TARGET_FILES = [
    "black_bear_walk_v2.png",
    "black_bear_walk_v2_dark.png",
    "muntjac_walk.png",
    "muntjac_walk_dark.png",
    "hare_walk.png",
    "hare_walk_dark.png",
    "salamander_walk.png",
    "salamander_walk_dark.png",
    "leopard_cat_walk.png",
    "leopard_cat_walk_dark.png",
]


def resolve_config_key(filename: str) -> str:
    if filename in pps.PET_CONFIGS:
        return filename

    if "leopard_cat_walk" in filename:
        return "leopard_cat_walk.png"

    stem, ext = os.path.splitext(filename)
    if stem.endswith("_dark"):
        candidate = f"{stem[:-5]}{ext}"
        if candidate in pps.PET_CONFIGS:
            return candidate
        if "leopard_cat_walk" in candidate:
            return "leopard_cat_walk.png"

    raise ValueError(f"Cannot resolve config key for '{filename}'")


def slice_one(filename: str) -> None:
    input_path = BASE_DIR / filename
    if not input_path.exists():
        print(f"[skip] not found: {input_path}")
        return

    config_key = resolve_config_key(filename)
    output_prefix = input_path.stem
    img = Image.open(input_path).convert("RGBA")
    pps.slice_image(img, config_key, str(BASE_DIR), output_prefix=output_prefix)
    print(f"[ok] {filename} -> {output_prefix}_frame_*.png (config: {config_key})")


def main() -> None:
    if not BASE_DIR.exists():
        raise FileNotFoundError(f"Base dir not found: {BASE_DIR}")

    for filename in TARGET_FILES:
        slice_one(filename)


if __name__ == "__main__":
    main()

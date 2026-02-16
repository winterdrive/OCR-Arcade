from PIL import Image
import os
from collections import Counter


def analyze_bear():
    path = r"c:\Users\kwz50\Reflow\public\assets\pets\black_bear_walk_v2.png"
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    img = Image.open(path).convert("RGBA")
    pixels = list(img.getdata())

    # Filter out transparent pixels
    visible_pixels = [p for p in pixels if p[3] > 0]

    # Count colors
    counts = Counter(visible_pixels)

    print("Most common colors (RGBA) in Black Bear:")
    for color, count in counts.most_common(20):
        print(f"  {color}: {count}")

    # Check specifically for pure black or near black
    print("\nDark colors:")
    for color, count in counts.items():
        r, g, b, a = color
        if r < 30 and g < 30 and b < 30:
            print(f"  {color}: {count}")


if __name__ == "__main__":
    analyze_bear()

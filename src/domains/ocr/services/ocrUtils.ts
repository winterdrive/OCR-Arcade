export interface BBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/**
 * 將 Data URL 轉換為 ImageData
 */
export async function imageUrlToImageData(imageUrl: string): Promise<{ imageData: ImageData, imageElement: HTMLImageElement }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('無法獲取 Canvas 2D 上下文'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            resolve({
                imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
                imageElement: img
            });
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
        img.src = imageUrl;
    });
}

/**
 * 根據 BBox 裁切圖片區域
 * 包含 10px Padding 與白底填充
 */
export async function cropImageByBbox(
    imageUrl: string,
    bbox: BBox,
    imageElement?: HTMLImageElement
): Promise<string> {
    const padding = 10;
    const width = bbox.x1 - bbox.x0;
    const height = bbox.y1 - bbox.y0;

    const canvas = document.createElement('canvas');
    canvas.width = width + (padding * 2);
    canvas.height = height + (padding * 2);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('無法獲取 Canvas 2D 上下文');

    // [Optimization] Padding Logic: Fill with white first
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageElement) {
        ctx.drawImage(imageElement, bbox.x0, bbox.y0, width, height, padding, padding, width, height);
    } else {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('圖片載入失敗'));
            img.src = imageUrl;
        });
        ctx.drawImage(img, bbox.x0, bbox.y0, width, height, padding, padding, width, height);
    }
    return canvas.toDataURL('image/png');
}

/**
 * [Optimization] Adaptive Merging Logic
 * 合併重疊或相鄰的文字框
 */
export function mergeBoxes(boxes: BBox[]): BBox[] {
    // 1. Sort by Y then X
    let sorted = [...boxes].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);

    let merged = true;
    while (merged) {
        merged = false;
        const newBoxes: BBox[] = [];
        const skipIndices = new Set<number>();

        for (let i = 0; i < sorted.length; i++) {
            if (skipIndices.has(i)) continue;

            let current = { ...sorted[i] };

            // Try to merge with any subsequent box
            for (let j = i + 1; j < sorted.length; j++) {
                if (skipIndices.has(j)) continue;

                const next = sorted[j];
                const shouldMerge = checkAdaptiveMerge(current, next);

                if (shouldMerge) {
                    // Merge them
                    current = {
                        x0: Math.min(current.x0, next.x0),
                        y0: Math.min(current.y0, next.y0),
                        x1: Math.max(current.x1, next.x1),
                        y1: Math.max(current.y1, next.y1)
                    };
                    skipIndices.add(j);
                    merged = true;
                }
            }
            newBoxes.push(current);
        }
        sorted = newBoxes;
    }
    return sorted;
}

function checkAdaptiveMerge(b1: BBox, b2: BBox): boolean {
    const h1 = b1.y1 - b1.y0;
    const h2 = b2.y1 - b2.y0;
    const avgH = (h1 + h2) / 2;

    // [New] Similarity Check: Height must be comparable (0.7 ~ 1.4)
    const hRatio = Math.min(h1, h2) / Math.max(h1, h2);
    if (hRatio < 0.7) return false;

    // > 50% overlap of the smaller height
    const minH = Math.min(h1, h2);
    const yOverlapStart = Math.max(b1.y0, b2.y0);
    const yOverlapEnd = Math.min(b1.y1, b2.y1);
    const yOverlap = Math.max(0, yOverlapEnd - yOverlapStart);

    const hasGoodOverlap = yOverlap > (0.5 * minH);

    // xDist < 1.0 * avgHeight
    const xDist = Math.max(0, Math.max(b1.x0, b2.x0) - Math.min(b1.x1, b2.x1));
    const isClose = xDist < (1.0 * avgH);

    return hasGoodOverlap && isClose;
}

/**
 * [Optimization] Containment Filtering
 * 移除完全被包含在另一個框內的框
 */
export function filterContainedBoxes(boxes: BBox[]): BBox[] {
    return boxes.filter((inner, i) => {
        return !boxes.some((outer, j) => {
            if (i === j) return false;
            return (
                inner.x0 >= outer.x0 &&
                inner.y0 >= outer.y0 &&
                inner.x1 <= outer.x1 &&
                inner.y1 <= outer.y1
            );
        });
    });
}


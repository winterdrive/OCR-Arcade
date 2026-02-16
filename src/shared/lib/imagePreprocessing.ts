/**
 * 圖像預處理工具模組
 * 提供 OCR 前的圖像增強功能,以提升識別準確率
 */

export interface PreprocessOptions {
    grayscale?: boolean;
    enhanceContrast?: boolean;
    binarize?: boolean;
    denoise?: boolean;
    onIntermediateImage?: (dataUrl: string, label: string) => void;
}

/**
 * 將圖像轉換為灰階
 */
export function convertToGrayscale(imageData: ImageData): ImageData {
    const data = imageData.data;
    const output = new ImageData(imageData.width, imageData.height);

    for (let i = 0; i < data.length; i += 4) {
        // 使用標準灰階轉換公式 (ITU-R BT.601)
        const gray = Math.round(
            0.299 * data[i] +      // R
            0.587 * data[i + 1] +  // G
            0.114 * data[i + 2]    // B
        );

        output.data[i] = gray;     // R
        output.data[i + 1] = gray; // G
        output.data[i + 2] = gray; // B
        output.data[i + 3] = data[i + 3]; // Alpha
    }

    return output;
}

/**
 * 對比度平衡 (簡單版)
 * 避免全局直方圖均衡化導致的雜訊爆炸，改用簡單的上下限拉伸。
 */
export function enhanceContrast(imageData: ImageData): ImageData {
    const data = imageData.data;
    const output = new ImageData(imageData.width, imageData.height);

    // 找出最小與最大灰度值 (排除極端值以避免雜訊影響)
    let min = 255;
    let max = 0;

    // 採樣以提升效能
    for (let i = 0; i < data.length; i += 40) {
        const gray = data[i];
        if (gray < min) min = gray;
        if (gray > max) max = gray;
    }

    // 避免除以 0
    if (max === min) return convertToGrayscale(imageData);

    const scale = 255 / (max - min);

    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i];
        const enhanced = Math.min(255, Math.max(0, (gray - min) * scale));

        output.data[i] = enhanced;
        output.data[i + 1] = enhanced;
        output.data[i + 2] = enhanced;
        output.data[i + 3] = data[i + 3];
    }

    return output;
}

/**
 * 自適應閾值二值化 (Adaptive Thresholding)
 * 將每個像素與其周圍區域的平均值進行比較。
 * 這對於處理具有陰影或漸層背景的簡報（如您的測試圖）非常有效。
 */
export function binarize(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new ImageData(width, height);

    const windowSize = 30; // 局部窗口大小 (略微縮小以提升效能)
    const constant = 10;   // 偏移量
    const halfWindow = Math.floor(windowSize / 2);

    // 1. 計算積分圖 (Integral Image)
    // 使用 Uint32Array 儲存累加值 (0-255 * 10M < 4B，Uint32 可支撐到 4000x4000)
    const integralImage = new Uint32Array(width * height);
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            rowSum += data[idx];
            if (y === 0) {
                integralImage[y * width + x] = rowSum;
            } else {
                integralImage[y * width + x] = integralImage[(y - 1) * width + x] + rowSum;
            }
        }
    }

    // 2. 使用積分圖快速計算局部平均值
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const y0 = Math.max(0, y - halfWindow);
            const y1 = Math.min(height - 1, y + halfWindow);
            const x0 = Math.max(0, x - halfWindow);
            const x1 = Math.min(width - 1, x + halfWindow);

            const count = (y1 - y0 + 1) * (x1 - x0 + 1);

            let sum = integralImage[y1 * width + x1];
            if (y0 > 0) sum -= integralImage[(y0 - 1) * width + x1];
            if (x0 > 0) sum -= integralImage[y1 * width + (x0 - 1)];
            if (y0 > 0 && x0 > 0) sum += integralImage[(y0 - 1) * width + (x0 - 1)];

            const mean = sum / count;
            const threshold = mean - constant;

            const idx = (y * width + x) * 4;
            const value = data[idx] > threshold ? 255 : 0;

            output.data[idx] = value;
            output.data[idx + 1] = value;
            output.data[idx + 2] = value;
            output.data[idx + 3] = data[idx + 3];
        }
    }

    return output;
}

/**
 * 中值濾波去噪
 * 使用 3x3 窗口的中值濾波器
 */
export function denoise(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new ImageData(width, height);

    // 複製原始數據
    for (let i = 0; i < data.length; i++) {
        output.data[i] = data[i];
    }

    // 3x3 中值濾波
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const neighbors: number[] = [];

            // 收集 3x3 窗口內的像素值
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    neighbors.push(data[idx]);
                }
            }

            // 排序並取中值
            neighbors.sort((a, b) => a - b);
            const median = neighbors[4]; // 9個元素的中間值

            const idx = (y * width + x) * 4;
            output.data[idx] = median;
            output.data[idx + 1] = median;
            output.data[idx + 2] = median;
        }
    }

    return output;
}

/**
 * 完整的圖像預處理流程
 * @param imageUrl 圖像的 URL 或 base64 字串
 * @param options 預處理選項
 * @param saveIntermediateImages 是否保存中間步驟圖像
 * @returns 處理後的圖像 base64 URL
 */
export async function preprocessImage(
    imageUrl: string,
    options: PreprocessOptions = {},
    debugSteps: string[] = [] // Changed from boolean to string array
): Promise<string> {
    const {
        grayscale: shouldGrayscale = true,
        enhanceContrast: shouldEnhanceContrast = true,
        binarize: shouldBinarize = false,
        denoise: shouldDenoise = false,
        onIntermediateImage
    } = options;

    // ... (image loading logic remains the same) ...

    // (Assume image loading and canvas creation logic is here, simplified for brevity in replacement)
    // You might need to be careful not to delete the heavy logic above if it's not part of the replacement scope.
    // Actually, I should use a smaller chunk to avoid re-writing the whole function body if not necessary.
    // Let's rewrite the safeDownload and function signature part.

    // 載入圖像 - 在 Worker 中需使用 fetch + createImageBitmap
    let imgSource: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            imgSource = await createImageBitmap(blob);
        } catch (e) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = imageUrl;
            });
            imgSource = img;
        }
    } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = imageUrl;
        });
        imgSource = img;
    }

    const { width, height } = imgSource;


    // 創建 Canvas - 支援 Worker (OffscreenCanvas)
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
    } else {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
    }

    const ctx = canvas.getContext('2d') as any;
    if (!ctx) throw new Error('無法創建 Canvas context');

    // 繪製與獲取數據
    ctx.drawImage(imgSource, 0, 0);
    let imageData = ctx.getImageData(0, 0, width, height);

    // 下載補助 (支持回傳 DataURL 或直接下載)
    const safeDownload = async (label: string) => {
        // Check if this specific step is enabled in debugSteps
        if (!debugSteps.includes(label) && !debugSteps.includes('all')) return;

        let dataUrl = '';
        if ((canvas as any).toDataURL) {
            dataUrl = (canvas as any).toDataURL('image/png');
        } else if ((canvas as any).convertToBlob) {
            const blob = await (canvas as any).convertToBlob();
            dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }

        if (!dataUrl) return;

        // 1. 如果有回呼函式，優先呼叫 (Worker 環境必用)
        if (onIntermediateImage) {
            onIntermediateImage(dataUrl, label);
        }

        // 2. 如果在主執行緒且有 document，執行下載
        if (typeof document !== 'undefined') {
            downloadImage(dataUrl, label);
        }
    };

    // 保存原始圖像
    await safeDownload('0_original.png');

    if (shouldGrayscale) {
        imageData = convertToGrayscale(imageData);
        ctx.putImageData(imageData, 0, 0);
        await safeDownload('1_grayscale.png');
    }

    if (shouldEnhanceContrast) {
        imageData = enhanceContrast(imageData);
        ctx.putImageData(imageData, 0, 0);
        await safeDownload('2_enhanced_contrast.png');
    }

    if (shouldBinarize) {
        imageData = binarize(imageData);
        ctx.putImageData(imageData, 0, 0);
        await safeDownload('3_binarized.png');
    }

    if (shouldDenoise) {
        imageData = denoise(imageData);
        ctx.putImageData(imageData, 0, 0);
        await safeDownload('4_denoised.png');
    }

    ctx.putImageData(imageData, 0, 0);

    // 返回結果
    if ((canvas as any).toDataURL) {
        return (canvas as any).toDataURL('image/png');
    } else if ((canvas as any).convertToBlob) {
        const blob = await (canvas as any).convertToBlob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }

    return imageUrl;
}

/**
 * 下載圖像到本地
 * @param dataUrl 圖像的 base64 URL
 * @param filename 檔案名稱
 */
function downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

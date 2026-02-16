import type { ImageAnalysisResult, ImageAnalysisConfig } from '@/domains/ocr/types';

const DEFAULT_CONFIG: ImageAnalysisConfig = {
    blurThreshold: 60,
    sampleRate: 0.1
};

export class ImageAnalyzer {
    private config: ImageAnalysisConfig;

    constructor(config: Partial<ImageAnalysisConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public async analyze(imageData: ImageData): Promise<ImageAnalysisResult> {

        // 1. Calculate Blur Score (Laplacian Variance)
        const blurScore = this.calculateBlurScore(imageData);

        // 2. Estimate Text Density (Edge Detection)
        const textDensity = this.estimateTextDensity(imageData);

        // 3. Detect Language (Placeholder for now, requires OCR sampling)
        // In Phase 2, we might connect this to a lightweight Tesseract call
        const dominantLanguage = 'unknown';


        return {
            blurScore,
            isBlurry: blurScore < this.config.blurThreshold,
            textDensity,
            dominantLanguage,
            confidence: 0.8 // Placeholder
        };
    }

    /**
     * Calculates the variance of the Laplacian of the image.
     * Lower variance means less edge data (blurrier).
     * Using a standard 3x3 Laplacian kernel:
     *  0  1  0
     *  1 -4  1
     *  0  1  0
     */
    private calculateBlurScore(imageData: ImageData): number {
        const { data, width, height } = imageData;
        const grayData = new Uint8Array(width * height);

        // Convert to grayscale first for performance
        for (let i = 0; i < data.length; i += 4) {
            // R*0.299 + G*0.587 + B*0.114
            grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        let mean = 0;
        let count = 0;
        const laplacianValues: number[] = [];

        // Convolve
        // Skip borders to avoid boundary checks for speed
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                // Neighbor indices
                const top = idx - width;
                const bottom = idx + width;
                const left = idx - 1;
                const right = idx + 1;

                // Apply Kernel
                const laplacian =
                    grayData[top] +
                    grayData[bottom] +
                    grayData[left] +
                    grayData[right] -
                    4 * grayData[idx];

                const val = Math.abs(laplacian);
                laplacianValues.push(val);
                mean += val;
                count++;
            }
        }

        mean /= count;

        // Calculate Variance
        let variance = 0;
        for (let i = 0; i < laplacianValues.length; i++) {
            variance += (laplacianValues[i] - mean) ** 2;
        }
        variance /= count;

        // Normalize score roughly to 0-100 range for usability
        // Typical variance for sharp images can be high, but let's scale it.
        // A variance < 100 often implies blur. 
        // We output the raw variance first to calibrate.
        // For UI display purposes we might clamp or log-scale it later.
        // For now, returning the raw variance as "score" but noted as such.
        // In practice, clear text images usually have variance > 300-500.
        // Blurry ones < 100.

        // Let's create a mapped score: sigmoid or linear clamp
        // 0-100 mapping: 0 variance -> 0, 500 variance -> 100
        const normalizedScore = Math.min(100, Math.max(0, variance / 5));

        return Math.round(normalizedScore);
    }

    /**
     * Estimates text density using simple edge density.
     * High edge density usually correlates with text areas.
     */
    private estimateTextDensity(_imageData: ImageData): number {
        // const { width, height } = imageData;
        // reuse grayscale logic or just sample stride
        // For speed, let's just check Sobel edges on a stride

        // ... Implementation similar to Laplacian but counting strong edges
        // Simplified: Count pixels with high Laplacian response from calculateBlurScore logic
        // But to save re-computation, we'll implement a standalone simpler version here
        // or refactor calculateBlurScore to return stats.

        // For P1, let's keep it simple: just return a placeholder or simple stat
        return 0.5; // TODO: Implement robust estimation
    }
}


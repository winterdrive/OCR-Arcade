export interface BoundingBox {
    x0: number
    y0: number
    x1: number
    y1: number
}

export interface TextStyle {
    fill: string
    fontSize: number
    // potential future properties: fontFamily, fontWeight, etc.
}

export class InpaintingService {
    /**
     * Determines the optimal background color to mask the given region.
     * Uses an "Edge Sampling" strategy: samples pixels just outside the bbox
     * and calculates the median color to ignore noise.
     */
    public getBackgroundMaskColor(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        padding: number = 2
    ): string {
        try {
            const { x0, y0, x1, y1 } = bbox
            const width = x1 - x0
            const height = y1 - y0

            // Define sampling regions (just outside the box)
            // Top, Bottom, Left, Right
            // We'll sample a 1px wide/tall strip with some padding
            const outerPadding = padding + 1

            // Helper to safely get image data
            const getImageDataSafe = (x: number, y: number, w: number, h: number) => {
                // Bounds check
                if (x < 0) x = 0
                if (y < 0) y = 0
                // We don't verify right/bottom edges against canvas size for simplicity here, 
                // but getContext usually handles out-of-bounds by returning transparent black
                return ctx.getImageData(x, y, w, h).data
            }

            const samples: number[][] = [] // [r, g, b]

            const pushPixels = (data: Uint8ClampedArray) => {
                for (let i = 0; i < data.length; i += 4) {
                    // Ignore transparent pixels
                    if (data[i + 3] < 10) continue
                    samples.push([data[i], data[i + 1], data[i + 2]])
                }
            }

            // Top Edge
            pushPixels(getImageDataSafe(x0 - padding, y0 - outerPadding, width + padding * 2, 1))
            // Bottom Edge
            pushPixels(getImageDataSafe(x0 - padding, y1 + padding, width + padding * 2, 1))
            // Left Edge
            pushPixels(getImageDataSafe(x0 - outerPadding, y0 - padding, 1, height + padding * 2))
            // Right Edge
            pushPixels(getImageDataSafe(x1 + padding, y0 - padding, 1, height + padding * 2))

            if (samples.length === 0) return '#ffffff' // Fallback

            // Calculate Median
            const medianColor = this.calculateMedianColor(samples)
            return this.rgbToHex(medianColor[0], medianColor[1], medianColor[2])

        } catch (e) {
            return '#ffffff'
        }
    }

    /**
     * Attempts to extract the text style (color, likely size) from the region.
     */
    public getTextStyle(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        currentFontSize?: number
    ): TextStyle {
        const defaultStyle: TextStyle = {
            fill: '#000000',
            fontSize: currentFontSize || Math.round((bbox.y1 - bbox.y0) * 0.8)
        }

        try {
            const { x0, y0, x1, y1 } = bbox
            const width = x1 - x0
            const height = y1 - y0

            // Sample the center region (where text is likely most dense)
            // Or sample the whole box
            const data = ctx.getImageData(x0, y0, width, height).data

            // Bucket sort / Histogram approach to find dominant colors
            // We assume the background color is known or dominant, 
            // so we look for the "second most dominant" or "dominant non-background"
            // For MVP, lets just try to find the darkest color in a light bg scenario (or inverse)
            // Simple heuristic: Find the color furthest from the background color? 

            // Let's stick to a simpler heuristic for MVP:
            // Accumulate all pixels, find the average of pixels that are significantly different from the "background masks" if we had it.
            // Or just average of the center line? Text usually crosses the center.

            const textSamples: number[][] = []
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                textSamples.push([data[i], data[i + 1], data[i + 2]])
            }

            if (textSamples.length === 0) return defaultStyle

            // Very naive "Darkest pixel" approach for light backgrounds (common in docs)
            // or "Lightest pixel" for dark backgrounds.
            // We need to know if it's light or dark mode. 
            // Let's determine luminance of the background (from edges)
            // Re-using background sampling logic here effectively...
            // For performance, let's just assume we want the *dominant color that isn't the edge color*.

            // ... For MVP v1, let's keep it robust but simple:
            // Sample the center H-line and V-line.
            // Find the "extremes" (min/max luminance).

            let minLum = 255
            let maxLum = 0
            let darkest = [0, 0, 0]

            for (const [r, g, b] of textSamples) {
                const lum = 0.299 * r + 0.587 * g + 0.114 * b
                if (lum < minLum) {
                    minLum = lum
                    darkest = [r, g, b]
                }
                if (lum > maxLum) {
                    maxLum = lum
                }
            }

            // Heuristic: If background is light (>128), text is darkest. If bg is dark, text is lightest.
            // We can get background luminance from the edge sampling (let's assume we do that outside or crudely here)
            // Let's assume white paper for now (Todo: proper contrast check)
            // Safe bet: The color "further" from white/light gray?

            // Let's return the darkest for now as Documents are usually dark text on light bg.
            // IMPROVEMENT: Pass the background color in to determine contrast.

            return {
                ...defaultStyle,
                fill: this.rgbToHex(darkest[0], darkest[1], darkest[2])
            }

        } catch (e) {
            return defaultStyle
        }
    }

    private calculateMedianColor(samples: number[][]): number[] {
        if (samples.length === 0) return [255, 255, 255]

        // Sort each channel independently? Or sort by luminance? 
        // Independent channel median is a robust estimator for background
        const r = samples.map(s => s[0]).sort((a, b) => a - b)
        const g = samples.map(s => s[1]).sort((a, b) => a - b)
        const b = samples.map(s => s[2]).sort((a, b) => a - b)

        const mid = Math.floor(r.length / 2)

        return [r[mid], g[mid], b[mid]]
    }

    private rgbToHex(r: number, g: number, b: number): string {
        const toHex = (c: number) => {
            const hex = c.toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }
}

export const inpaintingService = new InpaintingService()

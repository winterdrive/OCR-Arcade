import { fabric } from 'fabric'
import { OCR_HOTSPOT } from '@/shared/constants/canvas'
import type { OCRWord } from './ocr'

/**
 * OcrHotspotManager
 * 
 * Centralized manager for OCR hotspot creation, identification, and manipulation.
 * 
 * Design Principles:
 * - Single Responsibility: All OCR hotspot logic in one place
 * - Type Safety: Explicit types for OCR hotspots
 * - Reliability: Uses Fabric.js native 'name' property for identification
 * - Maintainability: Easy to modify hotspot behavior
 */
export class OcrHotspotManager {
    /**
     * Create an OCR hotspot rectangle
     * 
     * @param word - OCR word data containing text and bounding box
     * @param canvas - Fabric.js canvas instance for event handling
     * @returns Configured Fabric.js Rect object
     */
    static create(word: OCRWord, canvas: fabric.Canvas): fabric.Rect {
        const rect = new fabric.Rect({
            // CRITICAL: Use 'name' property for reliable identification
            // Unlike custom properties (e.g., isOcrHotspot), 'name' is preserved
            // during Fabric.js serialization (toJSON/loadFromJSON)
            name: this.generateName(word.text),
            left: word.bbox.x0,
            top: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            fill: OCR_HOTSPOT.STYLE.FILL,
            stroke: OCR_HOTSPOT.STYLE.STROKE,
            strokeWidth: OCR_HOTSPOT.STYLE.STROKE_WIDTH,
            selectable: false,
            hoverCursor: 'text',
            data: word,
        } as any)

        // Setup event handlers
        this.setupEventHandlers(rect, canvas)

        return rect
    }

    /**
     * Generate a unique name for an OCR hotspot
     * 
     * @param text - The recognized text
     * @returns Name string with OCR_HOTSPOT prefix
     */
    static generateName(text: string): string {
        return `${OCR_HOTSPOT.NAME_PREFIX}${text}`
    }

    /**
     * Check if a Fabric.js object is an OCR hotspot
     * 
     * @param obj - Fabric.js object to check
     * @returns True if the object is an OCR hotspot
     */
    static isHotspot(obj: fabric.Object): boolean {
        const name = (obj as any).name
        return typeof name === 'string' && name.startsWith(OCR_HOTSPOT.NAME_PREFIX)
    }

    /**
     * Find all OCR hotspots in a canvas
     * 
     * @param canvas - Fabric.js canvas instance
     * @returns Array of OCR hotspot objects
     */
    static findAll(canvas: fabric.Canvas): fabric.Object[] {
        return canvas.getObjects().filter(this.isHotspot)
    }

    /**
     * Hide all OCR hotspots in a canvas
     * 
     * @param canvas - Fabric.js canvas instance
     */
    static hideAll(canvas: fabric.Canvas): void {
        const hotspots = this.findAll(canvas)
        hotspots.forEach(o => o.set('visible', false))
        canvas.renderAll()
    }

    /**
     * Show all OCR hotspots in a canvas
     * 
     * @param canvas - Fabric.js canvas instance
     */
    static showAll(canvas: fabric.Canvas): void {
        const hotspots = this.findAll(canvas)
        hotspots.forEach(o => o.set('visible', true))
        canvas.renderAll()
    }

    /**
     * Remove all OCR hotspots from a canvas
     * 
     * @param canvas - Fabric.js canvas instance
     */
    static removeAll(canvas: fabric.Canvas): void {
        const hotspots = this.findAll(canvas)
        hotspots.forEach(o => canvas.remove(o))
        canvas.renderAll()
    }

    /**
     * Setup event handlers for an OCR hotspot
     * 
     * @param rect - Fabric.js Rect object
     * @param canvas - Fabric.js canvas instance
     */
    private static setupEventHandlers(rect: fabric.Rect, canvas: fabric.Canvas): void {
        rect.on('mouseover', () => {
            rect.set({
                fill: OCR_HOTSPOT.STYLE.HOVER_FILL,
                stroke: OCR_HOTSPOT.STYLE.HOVER_STROKE,
                strokeWidth: OCR_HOTSPOT.STYLE.HOVER_STROKE_WIDTH
            })
            canvas.renderAll()
        })

        rect.on('mouseout', () => {
            rect.set({
                fill: OCR_HOTSPOT.STYLE.FILL,
                stroke: OCR_HOTSPOT.STYLE.STROKE,
                strokeWidth: OCR_HOTSPOT.STYLE.STROKE_WIDTH
            })
            canvas.renderAll()
        })
    }
}


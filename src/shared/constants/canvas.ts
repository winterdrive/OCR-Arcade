/**
 * Canvas-related constants
 */

/**
 * OCR Hotspot Configuration
 * 
 * OCR hotspots are interactive rectangles that appear on the canvas
 * to indicate recognized text regions. When clicked, they convert to editable text boxes.
 */
export const OCR_HOTSPOT = {
    /**
     * Name prefix for OCR hotspot objects
     * Used to identify OCR hotspots reliably across serialization/deserialization
     * 
     * Example: "ocr-hotspot-Hello"
     */
    NAME_PREFIX: 'ocr-hotspot-',

    /**
     * Visual styling for OCR hotspots
     */
    STYLE: {
        FILL: 'rgba(74, 158, 255, 0.05)',
        STROKE: 'rgba(74, 158, 255, 0.2)',
        STROKE_WIDTH: 1,
        HOVER_FILL: 'rgba(74, 158, 255, 0.2)',
        HOVER_STROKE: 'rgba(74, 158, 255, 0.8)',
        HOVER_STROKE_WIDTH: 2,
    }
} as const

/**
 * PPTX Export Configuration
 */
export const PPTX_EXPORT = {
    /**
     * Font size conversion
     * 
     * Formula: canvasPx * scaleX * PT_PER_INCH
     * - canvasPx: Font size in pixels on canvas
     * - scaleX: Horizontal scaling factor (image width / canvas width)
     * - PT_PER_INCH: Points per inch (standard typography unit)
     */
    FONT_SIZE: {
        PT_PER_INCH: 72,
        MIN_SIZE: 6,
    }
} as const

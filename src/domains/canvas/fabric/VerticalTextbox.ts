import * as fabric from 'fabric'
import '@/domains/canvas/fabric/defaults'

/**
 * VerticalTextbox - Custom Fabric.js Textbox with vertical alignment support
 * 
 * Extends fabric.Textbox to add 'top', 'middle', 'bottom' vertical alignment.
 * This is necessary because Fabric.js doesn't natively support vertical text alignment.
 * 
 * Note: We use the standard 'textbox' type for compatibility with Fabric.js serialization.
 * The vertical alignment is implemented via the verticalAlign property and _renderText override.
 */
export class VerticalTextbox extends fabric.Textbox {
    // Don't override type - use the default 'textbox' type for Fabric.js compatibility
    verticalAlign: 'top' | 'middle' | 'bottom'

    constructor(text: string, options?: any) {
        // Fabric 7 exposes type as a read-only getter; serialized options include it.
        const { type: _type, ...textboxOptions } = options || {}
        super(text, textboxOptions)
        this.verticalAlign = options?.verticalAlign || 'top'
    }

    /**
     * Calculate vertical offset based on verticalAlign and minHeight.
     */
    private _getVerticalOffset(): number {
        const textHeight = this.calcTextHeight()
        const boxHeight = (this as any).minHeight ?? this.height ?? 0
        const availableSpace = Math.max(0, boxHeight - textHeight)

        switch (this.verticalAlign) {
            case 'middle':
                return availableSpace / 2
            case 'bottom':
                return availableSpace
            case 'top':
            default:
                return 0
        }
    }

    /**
     * Override _getTopOffset so text, cursor, selection, and decoration
     * all share the same vertical alignment offset.
     */
    _getTopOffset(): number {
        const boxHeight = (this as any).minHeight ?? this.height ?? 0
        const baseOffset = -boxHeight / 2
        return baseOffset + this._getVerticalOffset()
    }

    static customProperties = ['verticalAlign', 'minHeight']

    /**
     * Override initDimensions so that每次 Fabric 依據文字內容/寬度重算高度後，
     * 我們都會把高度鎖回 minHeight，避免使用者手動拉高的框在各種操作下被「縮回去」。
     */
    initDimensions() {
        // 先讓父類別完成文字排版與內部計算
        super.initDimensions()

        const minHeight = (this as any).minHeight
        if (minHeight != null) {
            ;(this as any).height = minHeight
        }
    }

}

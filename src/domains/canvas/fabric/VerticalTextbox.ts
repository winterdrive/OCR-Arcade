import { fabric } from 'fabric'

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
        super(text, options)
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

    /**
     * Override toObject to include verticalAlign and minHeight in serialization
     */
    toObject(propertiesToInclude?: string[]): any {
        return super.toObject([...(propertiesToInclude || []), 'verticalAlign', 'minHeight'])
    }

    /**
     * Override initDimensions so that每次 Fabric 依據文字內容/寬度重算高度後，
     * 我們都會把高度鎖回 minHeight，避免使用者手動拉高的框在各種操作下被「縮回去」。
     */
    initDimensions(options?: any) {
        // 先讓父類別完成文字排版與內部計算
        // @ts-ignore - Fabric 型別定義可能略有差異
        super.initDimensions(options)

        const minHeight = (this as any).minHeight
        if (minHeight != null) {
            ;(this as any).height = minHeight
        }
    }

    /**
     * Custom fromObject to ensure minHeight / verticalAlign are restored correctly
     * when Fabric.js deserializes from JSON.
     *
     * Note: 因為我們仍然使用預設的 'textbox' type，此靜態方法主要是提供
     * 類別層級的一致行為；實際的升級邏輯目前集中在 useCanvas 的 upgradeTextObject 內。
     */
    static fromObject(object: any, callback: (obj: VerticalTextbox) => any) {
        const options = {
            ...object,
            verticalAlign: object.verticalAlign || 'top'
        }

        const instance = new VerticalTextbox(object.text || '', options)
        ;(instance as any).minHeight =
            object.minHeight != null
                ? object.minHeight
                : options.height != null
                    ? options.height
                    : instance.height || 0

        if (callback) {
            callback(instance)
        }
        return instance
    }
}

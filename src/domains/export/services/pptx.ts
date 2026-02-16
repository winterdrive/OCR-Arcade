import PptxGenJS from 'pptxgenjs'
import { fabric } from 'fabric'
import { PPTX_EXPORT } from '@/shared/constants/canvas'
import { OcrHotspotManager } from '@/domains/ocr/services/OcrHotspotManager'
import { VerticalTextbox } from '@/domains/canvas/fabric/VerticalTextbox'
import i18n from '@/shared/i18n'

/**
 * 匯出用的文字物件升級：將 loadFromJSON 還原的 plain textbox 升級為 VerticalTextbox
 *
 * 問題根因：VerticalTextbox 使用 type='textbox' 來保持 Fabric 序列化相容性，
 * 但 loadFromJSON 只會建立 plain fabric.Textbox，導致 minHeight 與 verticalAlign
 * 等自訂屬性/行為遺失。匯出時文字框會被渲染為自動計算高度（比使用者手動拉高的框短），
 * 導致「沒有完整覆蓋」的問題。
 *
 * 此函式在匯出流程中，將每個 textbox 物件升級為 VerticalTextbox，
 * 確保渲染行為與編輯器中完全一致。
 */
const upgradeTextObjectsForExport = (canvas: fabric.StaticCanvas) => {
    const objects = canvas.getObjects()
    objects.forEach((obj: any) => {
        if (obj.type !== 'textbox' && obj.type !== 'i-text') return
        // 已經是 VerticalTextbox 的直接處理 minHeight
        if (obj instanceof VerticalTextbox) {
            if ((obj as any).minHeight == null && obj.height != null) {
                ; (obj as any).minHeight = obj.height
            }
            return
        }

        // 取得物件所有屬性（包含自訂屬性 minHeight, verticalAlign）
        const objectData = obj.toObject([
            'id', 'left', 'top', 'width', 'height', 'fontSize',
            'fontFamily', 'fontWeight', 'fontStyle', 'fill',
            'backgroundColor', 'textAlign', 'verticalAlign', 'minHeight',
            'underline', 'linethrough', 'text'
        ]) as any

        const verticalAlign = objectData.verticalAlign || 'top'
        const minHeight = objectData.minHeight != null
            ? objectData.minHeight
            : objectData.height != null
                ? objectData.height
                : obj.height || 0

        // 建立 VerticalTextbox 取代原物件
        const upgraded = new VerticalTextbox(obj.text as string, {
            ...objectData,
            verticalAlign
        } as any)
            ; (upgraded as any).minHeight = minHeight

        // 替換物件
        const index = objects.indexOf(obj)
        canvas.remove(obj)
        canvas.insertAt(upgraded, Math.max(index, 0), false)
    })
    canvas.renderAll()
}

interface ExportOptions {
    pages: { width: number; height: number; imageData: string }[]
    canvasStates: any[]
    mode: 'editable' | 'image'
}

export const exportToPPTX = async ({ pages, canvasStates, mode }: ExportOptions) => {
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_16x9'
    pptx.author = i18n.t('exportFile.author')
    pptx.title = i18n.t('exportFile.title')

    const slideWidth = 10
    const slideHeight = 5.625
    const maxBgPx = 2400

    const getLetterbox = (pageWidth: number, pageHeight: number) => {
        const imageAspect = pageWidth / pageHeight
        const slideAspect = slideWidth / slideHeight

        let imgWidth: number
        let imgHeight: number
        let imgX: number
        let imgY: number

        if (imageAspect > slideAspect) {
            imgWidth = slideWidth
            imgHeight = slideWidth / imageAspect
            imgX = 0
            imgY = (slideHeight - imgHeight) / 2
        } else {
            imgHeight = slideHeight
            imgWidth = slideHeight * imageAspect
            imgX = (slideWidth - imgWidth) / 2
            imgY = 0
        }

        return { imgWidth, imgHeight, imgX, imgY }
    }

    const canvasToDataUrl = (canvas: fabric.StaticCanvas) => {
        const srcCanvas = (canvas as any).getElement?.() || (canvas as any).lowerCanvasEl
        if (!srcCanvas) {
            return canvas.toDataURL({
                format: 'png',
                quality: 1.0,
                multiplier: 1
            })
        }

        const srcWidth = srcCanvas.width
        const srcHeight = srcCanvas.height
        const scale = Math.min(1, maxBgPx / Math.max(srcWidth, srcHeight))
        const outWidth = Math.max(1, Math.round(srcWidth * scale))
        const outHeight = Math.max(1, Math.round(srcHeight * scale))

        const outCanvas = document.createElement('canvas')
        outCanvas.width = outWidth
        outCanvas.height = outHeight

        const outCtx = outCanvas.getContext('2d')
        if (!outCtx) {
            return canvas.toDataURL({
                format: 'png',
                quality: 1.0,
                multiplier: 1
            })
        }

        outCtx.drawImage(srcCanvas, 0, 0, outWidth, outHeight)
        return outCanvas.toDataURL('image/png', 1.0)
    }

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const state = canvasStates[i]
        const slide = pptx.addSlide()

        // Create temporary canvas for rendering
        const tempCanvas = new fabric.StaticCanvas(null, {
            width: page.width,
            height: page.height
        })

        // Load canvas state
        await new Promise<void>((resolve) => {
            if (state) {
                tempCanvas.loadFromJSON(state, () => {
                    // Force export canvas to original page size (undo any editor zoom dimensions)
                    tempCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
                    tempCanvas.setZoom(1)
                    tempCanvas.setWidth(page.width)
                    tempCanvas.setHeight(page.height)
                    tempCanvas.calcOffset()

                    // CRITICAL: 升級 textbox → VerticalTextbox，還原 minHeight / verticalAlign
                    upgradeTextObjectsForExport(tempCanvas)

                    fabric.Image.fromURL(page.imageData, (img) => {
                        tempCanvas.setBackgroundImage(img, () => {
                            tempCanvas.renderAll()
                            resolve()
                        }, {
                            scaleX: page.width / (img.width || 1),
                            scaleY: page.height / (img.height || 1)
                        })
                    })
                })
            } else {
                fabric.Image.fromURL(page.imageData, (img) => {
                    tempCanvas.setBackgroundImage(img, () => {
                        tempCanvas.renderAll()
                        resolve()
                    }, {
                        scaleX: page.width / (img.width || 1),
                        scaleY: page.height / (img.height || 1)
                    })
                })
            }
        })

        if (mode === 'image') {
            // Flat mode: Export entire canvas as single image

            // Hide OCR hotspots before rendering
            OcrHotspotManager.hideAll(tempCanvas as any)

            const dataUrl = canvasToDataUrl(tempCanvas)

            // Restore visibility
            OcrHotspotManager.showAll(tempCanvas as any)

            const { imgWidth, imgHeight, imgX, imgY } = getLetterbox(page.width, page.height)

            slide.addImage({
                data: dataUrl,
                x: imgX,
                y: imgY,
                w: imgWidth,
                h: imgHeight
            })
        } else {
            // Editable mode: Background + text boxes
            const objects = tempCanvas.getObjects()
            const textObjects = objects.filter(o => o.type === 'textbox' || o.type === 'i-text')

            // Hide OCR hotspots + text boxes before rendering background
            // (背景只應該包含原始圖片；文字與白底遮罩由 PPTX shape/text 另外重建)
            OcrHotspotManager.hideAll(tempCanvas as any)
            const originalTextVisibility = new Map<any, boolean>()
            textObjects.forEach((obj: any) => {
                originalTextVisibility.set(obj, obj.visible !== false)
                obj.set('visible', false)
            })
            // IMPORTANT: Render canvas after hiding objects to ensure they are not in the exported image
            tempCanvas.renderAll()

            const bgData = canvasToDataUrl(tempCanvas)

            // Restore visibility
            textObjects.forEach((obj: any) => {
                const wasVisible = originalTextVisibility.get(obj)
                obj.set('visible', wasVisible !== false)
            })
            // Render again to restore state (optional but good for consistency)
            tempCanvas.renderAll()
            OcrHotspotManager.showAll(tempCanvas as any)

            const { imgWidth, imgHeight, imgX, imgY } = getLetterbox(page.width, page.height)

            // Add background
            slide.addImage({
                data: bgData,
                x: imgX,
                y: imgY,
                w: imgWidth,
                h: imgHeight
            })

            // Add text boxes
            const scaleX = imgWidth / page.width
            const scaleY = imgHeight / page.height

            textObjects.forEach((obj: any) => {
                const baseFontSize = obj.fontSize || 12
                const pptFontSize = Math.max(
                    PPTX_EXPORT.FONT_SIZE.MIN_SIZE,
                    baseFontSize * scaleX * PPTX_EXPORT.FONT_SIZE.PT_PER_INCH
                )

                const textX = imgX + (obj.left || 0) * scaleX
                const textY = imgY + (obj.top || 0) * scaleY
                const textW = (obj.width || 100) * scaleX
                const textH = ((obj.minHeight || obj.height) || 20) * scaleY

                const valignMap: Record<string, 'top' | 'middle' | 'bottom'> = {
                    top: 'top',
                    middle: 'middle',
                    bottom: 'bottom'
                }

                // Scheme A: Native PPTX Text Box (Background + Text in one object)
                const backgroundColor = obj.backgroundColor
                    ? { color: obj.backgroundColor.replace('#', '') }
                    : undefined

                // Add text
                slide.addText(obj.text || '', {
                    x: textX,
                    y: textY,
                    w: textW,
                    h: textH,
                    fontSize: pptFontSize,
                    color: (obj.fill || '#000000').replace('#', ''),
                    fill: backgroundColor, // Apply background color directly to text box
                    fontFace: obj.fontFamily || 'Arial',
                    align: obj.textAlign || 'left',
                    // pptxgenjs uses 'mid' (not 'middle')
                    valign: valignMap[obj.verticalAlign] || 'top',
                    bold: (obj.fontWeight === 'bold' || parseInt(obj.fontWeight as string) >= 700),
                    italic: obj.fontStyle === 'italic',
                    underline: obj.underline ? { style: 'sng' } : undefined,
                    strike: obj.linethrough === true,
                    // Layout improvements for better fidelity
                    margin: 0, // Remove default internal margin (padding) to prevent early wrapping
                    lineSpacing: pptFontSize * (obj.lineHeight || 1.16), // Sync line height (points)
                    fit: 'none', // Do not auto-resize text or shape
                    wrap: true // Enable wrapping
                })
            })
        }
    }

    await pptx.writeFile({ fileName: i18n.t('exportFile.pptxName', { mode }) })
}

/**
 * Export current page to PNG with user edits
 * Uses the same Canvas rendering logic as PPTX export
 */
export const exportToPNG = async (
    page: { width: number; height: number; imageData: string },
    canvasState: any,
    filename: string = i18n.t('exportFile.pngName')
) => {
    const loadImageElement = (src: string) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = src
        })
    }

    const backgroundImage = await loadImageElement(page.imageData)
    const exportWidth = backgroundImage.width || page.width
    const exportHeight = backgroundImage.height || page.height
    const scaleX = exportWidth / page.width
    const scaleY = exportHeight / page.height

    // Create temporary canvas for rendering
    const tempCanvas = new fabric.StaticCanvas(null, {
        width: exportWidth,
        height: exportHeight,
        enableRetinaScaling: false
    })

    // Load canvas state with user edits
    await new Promise<void>((resolve) => {
        if (canvasState) {
            tempCanvas.loadFromJSON(canvasState, () => {
                // Normalize viewport and size to export dimensions
                tempCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
                tempCanvas.setZoom(1)
                tempCanvas.setWidth(exportWidth)
                tempCanvas.setHeight(exportHeight)
                tempCanvas.calcOffset()

                // CRITICAL: 升級 textbox → VerticalTextbox，還原 minHeight / verticalAlign
                upgradeTextObjectsForExport(tempCanvas)

                if (scaleX !== 1 || scaleY !== 1) {
                    const scale = (scaleX + scaleY) / 2
                    tempCanvas.getObjects().forEach((obj: any) => {
                        obj.set({
                            left: (obj.left || 0) * scaleX,
                            top: (obj.top || 0) * scaleY,
                            scaleX: (obj.scaleX || 1) * scaleX,
                            scaleY: (obj.scaleY || 1) * scaleY
                        })
                        if (obj.fontSize) {
                            obj.fontSize = obj.fontSize * scale
                        }
                        obj.setCoords?.()
                    })
                }

                fabric.Image.fromURL(page.imageData, (img) => {
                    tempCanvas.setBackgroundImage(img, () => {
                        tempCanvas.renderAll()
                        resolve()
                    }, {
                        scaleX: exportWidth / (img.width || 1),
                        scaleY: exportHeight / (img.height || 1)
                    })
                })
            })
        } else {
            fabric.Image.fromURL(page.imageData, (img) => {
                tempCanvas.setBackgroundImage(img, () => {
                    tempCanvas.renderAll()
                    resolve()
                }, {
                    scaleX: exportWidth / (img.width || 1),
                    scaleY: exportHeight / (img.height || 1)
                })
            })
        }
    })

    // Hide OCR hotspots before export
    OcrHotspotManager.hideAll(tempCanvas as any)

    // Render to PNG with high quality
    const dataUrl = tempCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1  // match original pixel size
    })

    // Restore hotspots visibility (for cleanup)
    OcrHotspotManager.showAll(tempCanvas as any)

    // Download the image
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
}

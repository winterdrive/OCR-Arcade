import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url'

// Use local worker bundled by Vite for offline use.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface PDFPage {
    imageData: string
    width: number
    height: number
}

export const loadPDF = async (
    file: File,
    onProgress?: (current: number, total: number) => void
): Promise<PDFPage[]> => {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    const pages: PDFPage[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
        if (onProgress) {
            onProgress(i, pdf.numPages)
        }

        const page = await pdf.getPage(i)
        const scale = 2 // High resolution for better OCR and display
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport }).promise

        pages.push({
            imageData: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height
        })
    }

    return pages
}

export const loadImage = (file: File): Promise<PDFPage[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                resolve([{
                    imageData: e.target?.result as string,
                    width: img.width,
                    height: img.height
                }])
            }
            img.onerror = reject
            img.src = e.target?.result as string
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

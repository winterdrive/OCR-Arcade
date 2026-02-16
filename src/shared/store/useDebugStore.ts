import { create } from 'zustand'

/**
 * Debug BBox Store
 *
 * 儲存 OCR Debug 視覺化所需的三層 bbox 資料：
 * 1. rawWordBboxes: Tesseract 原始 word-level bbox（加 padding 前）
 * 2. lineBboxes: Tesseract line-level bbox（直接取自引擎）
 * 3. mergedBboxes: 經過 groupWordsIntoTextBoxes 合併後的最終 bbox
 *
 * 這些資料僅用於 debug overlay，不影響正式流程。
 */

export interface DebugBbox {
    x0: number
    y0: number
    x1: number
    y1: number
    label?: string
}

interface DebugBboxState {
    // 三層 bbox 資料
    rawWordBboxes: DebugBbox[]
    lineBboxes: DebugBbox[]
    mergedBboxes: DebugBbox[]

    // UI 狀態
    enabled: boolean
    showRawWords: boolean
    showLines: boolean
    showMerged: boolean

    // Actions
    setDebugData: (data: {
        rawWordBboxes: DebugBbox[]
        lineBboxes: DebugBbox[]
        mergedBboxes: DebugBbox[]
    }) => void
    setEnabled: (enabled: boolean) => void
    toggleLayer: (layer: 'rawWords' | 'lines' | 'merged') => void
    clear: () => void
    appendMergedBboxes: (bboxes: DebugBbox[]) => void
}

export const useDebugStore = create<DebugBboxState>((set) => ({
    rawWordBboxes: [],
    lineBboxes: [],
    mergedBboxes: [],

    enabled: false,
    showRawWords: true,
    showLines: true,
    showMerged: true,

    setDebugData: (data) => set(data),

    setEnabled: (enabled) => set({ enabled }),

    toggleLayer: (layer) => set((state) => {
        switch (layer) {
            case 'rawWords': return { showRawWords: !state.showRawWords }
            case 'lines': return { showLines: !state.showLines }
            case 'merged': return { showMerged: !state.showMerged }
        }
    }),

    clear: () => set({
        rawWordBboxes: [],
        lineBboxes: [],
        mergedBboxes: []
    }),

    appendMergedBboxes: (bboxes) => set((state) => ({
        mergedBboxes: [...state.mergedBboxes, ...bboxes]
    }))
}))

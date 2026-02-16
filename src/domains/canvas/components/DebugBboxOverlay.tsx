import React, { useCallback } from 'react'
import { useDebugStore, type DebugBbox } from '@/shared/store/useDebugStore'
import { useStore } from '@/shared/store/useStore'
import { Bug, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/**
 * DebugBboxOverlay
 *
 * Debug 視覺化元件，在 Canvas 上疊加顯示三層 OCR bbox：
 * - 🔴 紅色細框 = Tesseract 原始 word-level bbox（padding 前）
 * - 🟢 綠色虛框 = Tesseract line-level bbox（引擎回傳）
 * - 🔵 藍色粗框 = 合併後的最終 bbox（實際使用的）
 *
 * 用於精確診斷 OCR 對齊偏差來自哪一層。
 */

interface DebugBboxOverlayProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>
}

// 顏色與樣式定義
const LAYER_STYLES = {
    rawWords: {
        borderColor: 'rgba(239, 68, 68, 0.7)',   // 紅
        borderWidth: 1,
        borderStyle: 'solid' as const,
        bgColor: 'rgba(239, 68, 68, 0.05)',
        label: '原始 Word',
        labelBg: '#ef4444',
    },
    lines: {
        borderColor: 'rgba(34, 197, 94, 0.8)',    // 綠
        borderWidth: 2,
        borderStyle: 'dashed' as const,
        bgColor: 'rgba(34, 197, 94, 0.05)',
        label: 'Line-level',
        labelBg: '#22c55e',
    },
    merged: {
        borderColor: 'rgba(59, 130, 246, 0.8)',   // 藍
        borderWidth: 2,
        borderStyle: 'solid' as const,
        bgColor: 'rgba(59, 130, 246, 0.05)',
        label: '合併後',
        labelBg: '#3b82f6',
    },
} as const

export function DebugBboxOverlay({ canvasRef }: DebugBboxOverlayProps) {
    const {
        enabled,
        rawWordBboxes,
        lineBboxes,
        mergedBboxes,
        showRawWords,
        showLines,
        showMerged,
        setEnabled,
        toggleLayer
    } = useDebugStore()

    const { pages, currentPageIndex } = useStore()
    const currentPage = pages[currentPageIndex]

    // Visibility Check
    const [isVisible, setIsVisible] = React.useState(false)
    React.useEffect(() => {
        const checkVisibility = () => {
            const hasUrlParam = new URLSearchParams(window.location.search).has('debug_ocr')
            const hasLocalStorage = localStorage.getItem('reflow_debug_ocr') === 'true'
            setIsVisible(hasUrlParam || hasLocalStorage)
        }
        checkVisibility()
        // Listen for storage changes just in case
        window.addEventListener('storage', checkVisibility)
        return () => window.removeEventListener('storage', checkVisibility)
    }, [])

    if (!isVisible && !enabled) return null


    // 將 page-space 座標轉換為 screen-space
    const pageToScreen = useCallback((x: number, y: number) => {
        if (!canvasRef.current || !currentPage || currentPage.width <= 0 || currentPage.height <= 0) {
            return { x: 0, y: 0 }
        }
        const rect = canvasRef.current.getBoundingClientRect()
        const scaleX = rect.width / currentPage.width
        const scaleY = rect.height / currentPage.height
        return {
            x: x * scaleX,
            y: y * scaleY
        }
    }, [canvasRef, currentPage])

    const hasData = rawWordBboxes.length > 0 || lineBboxes.length > 0 || mergedBboxes.length > 0

    return (
        <>
            {/* 浮動控制面板 */}
            <DebugControlPanel
                enabled={enabled}
                hasData={hasData}
                showRawWords={showRawWords}
                showLines={showLines}
                showMerged={showMerged}
                counts={{
                    rawWords: rawWordBboxes.length,
                    lines: lineBboxes.length,
                    merged: mergedBboxes.length
                }}
                onToggleEnabled={() => setEnabled(!enabled)}
                onToggleLayer={toggleLayer}
            />

            {/* Debug Overlay 層 */}
            {enabled && hasData && (
                <div className="absolute inset-0 pointer-events-none z-20">
                    {/* 原始 Word BBox（紅色） */}
                    {showRawWords && rawWordBboxes.map((bbox, i) => (
                        <BboxRect key={`raw-${i}`} bbox={bbox} style={LAYER_STYLES.rawWords} pageToScreen={pageToScreen} />
                    ))}

                    {/* Line-level BBox（綠色） */}
                    {showLines && lineBboxes.map((bbox, i) => (
                        <BboxRect key={`line-${i}`} bbox={bbox} style={LAYER_STYLES.lines} pageToScreen={pageToScreen} />
                    ))}

                    {/* 合併後 BBox（藍色） */}
                    {showMerged && mergedBboxes.map((bbox, i) => (
                        <BboxRect key={`merged-${i}`} bbox={bbox} style={LAYER_STYLES.merged} pageToScreen={pageToScreen} />
                    ))}
                </div>
            )}
        </>
    )
}

// 單一 Bbox 矩形
function BboxRect({
    bbox,
    style,
    pageToScreen
}: {
    bbox: DebugBbox
    style: typeof LAYER_STYLES[keyof typeof LAYER_STYLES]
    pageToScreen: (x: number, y: number) => { x: number; y: number }
}) {
    const pos = pageToScreen(bbox.x0, bbox.y0)
    const size = pageToScreen(bbox.x1 - bbox.x0, bbox.y1 - bbox.y0)

    return (
        <div
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: Math.max(size.x, 1),
                height: Math.max(size.y, 1),
                border: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
                backgroundColor: style.bgColor,
                pointerEvents: 'none',
            }}
            title={bbox.label || ''}
        >
            {/* 小標籤（僅 line & merged 層顯示） */}
            {bbox.label && style.borderWidth >= 2 && (
                <span
                    style={{
                        position: 'absolute',
                        top: -14,
                        left: 0,
                        fontSize: 9,
                        lineHeight: '12px',
                        padding: '0 3px',
                        backgroundColor: style.labelBg,
                        color: 'white',
                        borderRadius: 2,
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {bbox.label}
                </span>
            )}
        </div>
    )
}

// Debug 控制面板
function DebugControlPanel({
    enabled,
    hasData,
    showRawWords,
    showLines,
    showMerged,
    counts,
    onToggleEnabled,
    onToggleLayer,
}: {
    enabled: boolean
    hasData: boolean
    showRawWords: boolean
    showLines: boolean
    showMerged: boolean
    counts: { rawWords: number; lines: number; merged: number }
    onToggleEnabled: () => void
    onToggleLayer: (layer: 'rawWords' | 'lines' | 'merged') => void
}) {
    return (
        <div className={cn(
            "absolute top-4 right-4 z-50 pointer-events-auto",
            "flex flex-col gap-1"
        )}>
            {/* 主開關 */}
            <button
                onClick={onToggleEnabled}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono shadow-lg border transition-all",
                    enabled
                        ? "bg-amber-500 text-white border-amber-600"
                        : "bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                )}
                title="Toggle Debug BBox Overlay"
            >
                <Bug size={14} />
                <span>Debug BBox</span>
                {hasData && !enabled && (
                    <span className="ml-1 px-1 py-0 bg-yellow-200 text-yellow-800 rounded text-[10px]">
                        {counts.merged}
                    </span>
                )}
            </button>

            {/* 各層切換 */}
            {enabled && hasData && (
                <div className="flex flex-col gap-0.5 bg-white/95 dark:bg-gray-800/95 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg p-1.5">
                    <LayerToggle
                        label={`🔴 原始 Word (${counts.rawWords})`}
                        active={showRawWords}
                        onToggle={() => onToggleLayer('rawWords')}
                    />
                    <LayerToggle
                        label={`🟢 Line-level (${counts.lines})`}
                        active={showLines}
                        onToggle={() => onToggleLayer('lines')}
                    />
                    <LayerToggle
                        label={`🔵 合併後 (${counts.merged})`}
                        active={showMerged}
                        onToggle={() => onToggleLayer('merged')}
                    />
                </div>
            )}
        </div>
    )
}

// 單一圖層切換按鈕
function LayerToggle({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-all w-full text-left",
                active
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
        >
            {active ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{label}</span>
        </button>
    )
}

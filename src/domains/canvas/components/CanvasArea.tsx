import { useCanvas } from '@/domains/canvas/hooks/useCanvas'
import { useStore } from '@/shared/store/useStore'
import { ZoomIn, ZoomOut, RotateCcw, Hand, MousePointer, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useRef, useEffect, useState } from 'react'
import { TextOverlay } from './TextOverlay'
import { OcrPromptOverlay } from './OcrPromptOverlay'
import { DebugBboxOverlay } from './DebugBboxOverlay'
import { useResponsiveLayout } from '@/domains/layout/hooks/useResponsiveLayout'
import { useThemeStore } from '@/shared/store/themeStore'
import { useTranslation } from 'react-i18next'

export function CanvasArea() {
    const { t } = useTranslation()
    // Measure Container Logic
    const containerRef = useRef<HTMLDivElement>(null)
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    const { canvasRef } = useCanvas(dimensions.width, dimensions.height)
    const { zoom, setZoom, textOverlayEnabled } = useStore()
    const { isMobile, isTablet } = useResponsiveLayout()
    const { theme } = useThemeStore()
    const [isPanMode, setIsPanMode] = useState(false)
    const [isGrabbing, setIsGrabbing] = useState(false)
    const isPanningRef = useRef(false)
    const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

    useEffect(() => {
        if (!containerRef.current) return

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                // Use a proper debounce to avoid rapid-fire updates during layout shifts
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }

                resizeTimeoutRef.current = setTimeout(() => {
                    setDimensions({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    })
                }, 100);
            }
        })

        observer.observe(containerRef.current)

        // Listen for canvas resize events from responsive layout manager
        const handleCanvasResize = () => {
            // Force a resize check
            if (containerRef.current) {
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }

                resizeTimeoutRef.current = setTimeout(() => {
                    if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect()
                        setDimensions({
                            width: rect.width,
                            height: rect.height
                        })
                    }
                }, 100);
            }
        }

        window.addEventListener('canvas:resize', handleCanvasResize)

        return () => {
            observer.disconnect()
            window.removeEventListener('canvas:resize', handleCanvasResize)
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
        }
    }, [])

    // Ctrl + Wheel Zoom
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                // Compute new zoom level
                const currentZoom = useStore.getState().zoom
                const newZoom = Math.max(0.1, Math.min(5.0, currentZoom + delta))
                useStore.getState().setZoom(parseFloat(newZoom.toFixed(1)))
            }
        }

        container.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            container.removeEventListener('wheel', handleWheel)
        }
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanningRef.current) return
            const dx = e.clientX - panStartRef.current.x
            const dy = e.clientY - panStartRef.current.y
            container.scrollLeft = panStartRef.current.scrollLeft - dx
            container.scrollTop = panStartRef.current.scrollTop - dy
        }

        const handleMouseUp = () => {
            if (!isPanningRef.current) return
            isPanningRef.current = false
            setIsGrabbing(false)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    // 100% = 1.0 (Fit to Screen)
    // 0.1 step = 10%
    const handleZoomIn = () => setZoom(zoom + 0.1)
    const handleZoomOut = () => setZoom(Math.max(0.1, zoom - 0.1))
    const handleReset = () => setZoom(1.0)

    return (
        <div className={cn(
            "flex-1 relative overflow-hidden",
            "bg-slate-50 dark:bg-slate-950",
            theme === 'light' && "bg-dot-pattern",
            // Ensure we fill the available space
            "min-h-0 min-w-0"
        )}>
            {/* Canvas Container - fills all available space */}
            <div
                ref={containerRef}
                className={cn(
                    "absolute inset-0 overflow-auto flex",
                    // Responsive padding adjustments
                    isMobile ? "p-4" : isTablet ? "p-6" : "p-8",
                    // Cursor logic:
                    // 1. If Grabbing (panning active) -> cursor-grabbing-custom
                    // 2. If Pan Mode (idle) -> cursor-pan-custom
                    // 3. If Select Mode -> default (let Fabric handle hover cursors)
                    isGrabbing ? "cursor-grabbing-custom" : isPanMode ? "cursor-pan-custom" : "cursor-default",
                    isPanMode && "select-none" // Prevent text selection while panning
                )}
                id="canvas-container"
                onClick={(e) => {
                    // Only trigger if clicking exactly on the grey background padding, not the canvas or its controls
                    if (e.target === e.currentTarget) {
                        window.dispatchEvent(new Event('canvas:deselectAll'))
                    }
                }}
                onMouseDown={(e) => {
                    if (!isPanMode) return
                    const target = e.target as HTMLElement | null
                    if (target) {
                        const tag = target.tagName
                        if (tag === 'INPUT' || tag === 'TEXTAREA' || (target as any).isContentEditable) {
                            return
                        }
                    }
                    if (!containerRef.current) return
                    isPanningRef.current = true
                    setIsGrabbing(true)
                    panStartRef.current = {
                        x: e.clientX,
                        y: e.clientY,
                        scrollLeft: containerRef.current.scrollLeft,
                        scrollTop: containerRef.current.scrollTop
                    }
                }}
            >
                {/* Canvas wrapper - stable sizing with pointer-events to prevent layout feedback */}
                {/* When in Pan Mode, we disable pointer events on the canvas so the click hits the container instead */}
                <div className={cn(
                    "relative shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10 w-max h-max m-auto flex-shrink-0",
                    isPanMode && "pointer-events-none"
                )}>
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                    {/* Text Overlay System */}
                    <TextOverlay
                        canvasRef={canvasRef}
                        visible={textOverlayEnabled}
                    />
                    {/* Debug BBox Overlay */}
                    <DebugBboxOverlay canvasRef={canvasRef} />
                </div>
            </div>

            <OcrPromptOverlay />

            {/* Floating Zoom Controls - Fixed at bottom-right of canvas area */}
            <div className={cn(
                "absolute flex items-center gap-1 p-1.5 rounded-xl backdrop-blur-md border shadow-2xl z-50 ring-1 ring-white/10",
                theme === 'light'
                    ? 'bg-white border-slate-400'
                    : 'bg-black/85 border-white/30',
                // Responsive positioning - ensure it's centered on mobile to avoid pet button, bottom-right on desktop
                isMobile
                    ? "bottom-4 left-1/2 -translate-x-1/2"
                    : "bottom-8 right-6"
            )}>
                <span className={cn(
                    "px-2 text-[10px] uppercase tracking-widest hidden sm:block",
                    theme === 'light' ? 'text-slate-600' : 'text-white/80'
                )}>
                    Zoom
                </span>
                <ZoomBtn icon={ZoomOut} onClick={handleZoomOut} title={t('canvas.zoomOut')} />
                <div
                    className={cn(
                        "w-14 text-center text-xs font-mono cursor-pointer select-none hover:text-primary transition-colors items-center justify-center hidden sm:flex",
                        theme === 'light' ? 'text-slate-900' : 'text-white'
                    )}
                    onClick={handleReset}
                    title={t('canvas.zoomReset')}
                >
                    {Math.round(zoom * 100)}%
                </div>
                <ZoomBtn icon={ZoomIn} onClick={handleZoomIn} title={t('canvas.zoomIn')} />
                <div className={cn(
                    "w-px h-4 mx-0.5 hidden sm:block",
                    theme === 'light' ? 'bg-slate-300' : 'bg-white/20'
                )} />
                <ZoomBtn icon={RotateCcw} onClick={handleReset} title={t('canvas.fitScreen')} />
                <div className={cn(
                    "w-px h-4 mx-0.5 hidden sm:block",
                    theme === 'light' ? 'bg-slate-300' : 'bg-white/20'
                )} />
                <ZoomBtn
                    icon={isPanMode ? Hand : MousePointer}
                    onClick={() => setIsPanMode((prev) => !prev)}
                    title={isPanMode ? 'Pan mode' : 'Select mode'}
                    active={isPanMode}
                />
            </div>
        </div>
    )
}

function ZoomBtn({ icon: Icon, onClick, title, active }: { icon: LucideIcon, onClick: () => void, title?: string, active?: boolean }) {
    const { theme } = useThemeStore()
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "p-2 rounded-lg transition-all active:scale-95",
                theme === 'light'
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-white/70 hover:text-white hover:bg-white/10',
                active && "text-primary bg-primary/10 hover:bg-primary/20"
            )}
        >
            <Icon size={16} />
        </button>
    )
}




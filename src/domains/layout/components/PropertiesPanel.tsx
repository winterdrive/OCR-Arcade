import { useStore, type ActiveObjectMixedKey, type ActiveObjectProps } from '@/shared/store/useStore'
import { Button } from '@/shared/ui/button'
import { Slider } from '@/shared/ui/slider'
import { Type, Palette, AlignLeft, Bold, Italic, AlignCenter, AlignRight, PanelRightClose, PanelBottomClose, PanelRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Trash2, CheckCircle2, AlertTriangle, ExternalLink, PaintRoller, ChevronDown, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useResponsiveLayout } from '@/domains/layout/hooks/useResponsiveLayout'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select'

export function PropertiesPanel() {
    const { t } = useTranslation()
    const {
        activeObjectProperties,
        updateActiveObjectProperty,
        isPropertiesPanelCollapsed,
        togglePropertiesPanel,
        setPropertiesPanelCollapsed,
        isFormatPainterActive,
        setIsFormatPainterActive,
        setCopiedStyle,
        selectedObjectCount,
        ocrStatus,
        currentPageIndex
    } = useStore()

    const { isMobile, isTablet } = useResponsiveLayout()

    const [localProps, setLocalProps] = useState<ActiveObjectProps | null>(null)
    const [initialProps, setInitialProps] = useState<ActiveObjectProps | null>(null)
    const normalizeHex = (value?: string) => {
        if (!value) return '#ffffff'
        if (value.startsWith('#') && value.length >= 7) return value.slice(0, 7)
        return value
    }
    const isMixed = (key: ActiveObjectMixedKey) => !!localProps?.mixed?.[key]

    // Dynamic Font Size Slider Logic
    const [initialFontSize, setInitialFontSize] = useState<number>(12)
    const [isEditorPulseActive, setIsEditorPulseActive] = useState(false)
    const [isAlignmentExpanded, setIsAlignmentExpanded] = useState(false)
    const prevOcrStatusRef = useRef<'idle' | 'processing' | 'completed' | 'error'>('idle')
    const hintedPagesRef = useRef<Set<number>>(new Set())
    const pendingPulsePagesRef = useRef<Set<number>>(new Set())
    const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasManualAlignmentToggleRef = useRef(false)


    useEffect(() => {
        setLocalProps(activeObjectProperties)
        // Set initial props only when selecting a new object (or first selection)
        if (activeObjectProperties?.id && (!initialProps || initialProps.id !== activeObjectProperties.id)) {
            setInitialProps(JSON.parse(JSON.stringify(activeObjectProperties)))
            setInitialFontSize(activeObjectProperties.fontSize || 12)
        }
        // If deselected, clear initialProps
        if (!activeObjectProperties) {
            setInitialProps(null)
        }
    }, [activeObjectProperties])

    // Auto-collapse on mobile/tablet instead of hiding completely
    useEffect(() => {
        if (isMobile || isTablet) {
            setPropertiesPanelCollapsed(true)
        }
    }, [isMobile, isTablet, setPropertiesPanelCollapsed])

    useEffect(() => {
        if (pulseTimerRef.current) {
            clearTimeout(pulseTimerRef.current)
        }
        return () => {
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
        }
    }, [])

    const triggerEditorPulse = () => {
        setIsEditorPulseActive(false)
        requestAnimationFrame(() => {
            setIsEditorPulseActive(true)
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
            pulseTimerRef.current = setTimeout(() => {
                setIsEditorPulseActive(false)
            }, 1700)
        })
    }

    useEffect(() => {
        const prev = prevOcrStatusRef.current
        if (prev === 'processing' && ocrStatus === 'completed' && !hintedPagesRef.current.has(currentPageIndex)) {
            if (activeObjectProperties) {
                triggerEditorPulse()
                hintedPagesRef.current.add(currentPageIndex)
                pendingPulsePagesRef.current.delete(currentPageIndex)
            } else {
                pendingPulsePagesRef.current.add(currentPageIndex)
            }
        }
        prevOcrStatusRef.current = ocrStatus
    }, [ocrStatus, currentPageIndex, activeObjectProperties])

    useEffect(() => {
        if (!activeObjectProperties) return
        if (pendingPulsePagesRef.current.has(currentPageIndex) && !hintedPagesRef.current.has(currentPageIndex)) {
            triggerEditorPulse()
            hintedPagesRef.current.add(currentPageIndex)
            pendingPulsePagesRef.current.delete(currentPageIndex)
        }
    }, [activeObjectProperties, currentPageIndex])

    useEffect(() => {
        if (hasManualAlignmentToggleRef.current) return
        setIsAlignmentExpanded(selectedObjectCount >= 2)
    }, [selectedObjectCount])

    // Show collapsed state (Desktop only to allow mobile bottom sheet animation)
    if (isPropertiesPanelCollapsed && !isMobile && !isTablet) {
        return (
            <div className="glass-panel border-l border-white/5 flex flex-col h-full shrink-0 z-10 w-10 transition-all duration-300">
                <button
                    onClick={togglePropertiesPanel}
                    className="h-16 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    title={t('properties.expand')}
                >
                    <PanelRight size={18} />
                </button>
            </div>
        )
    }

    const handleChange = (key: keyof ActiveObjectProps, value: any) => {
        if (!localProps) return
        const nextMixed = { ...(localProps.mixed || {}) }
        if (key in nextMixed) {
            delete (nextMixed as any)[key]
        }
        const newProps = {
            ...localProps,
            [key]: value,
            mixed: Object.keys(nextMixed).length > 0 ? nextMixed : undefined
        }
        setLocalProps(newProps)
        updateActiveObjectProperty(key, value)
    }

    const handleDelete = () => {
        window.dispatchEvent(new Event('canvas:deleteActiveObject'))
    }

    const dispatchAlignmentCommand = (type: 'align' | 'distribute', command: string) => {
        window.dispatchEvent(new CustomEvent('canvas:alignmentCommand', {
            detail: { type, command }
        }))
    }

    const canAlign = selectedObjectCount > 1
    const canDistribute = selectedObjectCount > 2
    const alignmentStatusText = canDistribute
        ? t('properties.alignStatusAlignAndDistribute', { count: selectedObjectCount })
        : canAlign
            ? t('properties.alignStatusAlignOnly', { count: selectedObjectCount })
            : t('properties.alignStatusNeedTwo', { count: selectedObjectCount })

    return (
        <div className={cn(
            "glass-panel flex flex-col shrink-0 z-40 transition-all duration-300 ease-out",
            (isMobile || isTablet)
                ? cn(
                    "fixed left-0 right-0 w-full h-[45vh] rounded-t-2xl border-t border-slate-200 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_-5px_30px_rgba(0,0,0,0.5)] bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl bottom-0",
                    isPropertiesPanelCollapsed ? "translate-y-[calc(100%-28px)] opacity-90" : "translate-y-0 opacity-100"
                )
                : "border-l border-slate-200 dark:border-white/5 h-full w-[260px]"
        )}>
            {/* Bottom Sheet Drag Handle */}
            {(isMobile || isTablet) && (
                <div
                    className="absolute top-0 left-0 right-0 h-7 flex items-center justify-center cursor-pointer pointer-events-auto z-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-t-2xl"
                    onClick={togglePropertiesPanel}
                    title={isPropertiesPanelCollapsed ? t('menu.open', '開啟') : t('menu.close', '收合')}
                >
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600/80" />
                </div>
            )}

            {/* Header */}
            <div className={cn(
                "border-b border-slate-200 dark:border-stranger-red/30 flex items-center justify-between px-3 shrink-0",
                (isMobile || isTablet) ? "h-14 pt-4 bg-transparent border-none" : "h-14 bg-white dark:bg-black/20"
            )}>
                <span className="font-medium text-sm text-slate-900 dark:text-stranger-red dark:font-stranger dark:tracking-widest dark:text-shadow-stranger-sm dark:uppercase animate-stranger-flicker">{t('properties.title')}</span>
                <div className="flex items-center gap-2">
                    {activeObjectProperties && (
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title={t('properties.deleteTextBox')}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (isFormatPainterActive) {
                                setIsFormatPainterActive(false)
                                setCopiedStyle(null)
                            } else {
                                if (activeObjectProperties) {
                                    const { fontSize, fill, fontFamily, fontWeight, fontStyle, textAlign, verticalAlign, backgroundColor } = activeObjectProperties
                                    setCopiedStyle({ fontSize, fill, fontFamily, fontWeight, fontStyle, textAlign, verticalAlign, backgroundColor })
                                    setIsFormatPainterActive(true)
                                }
                            }
                        }}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            isFormatPainterActive
                                ? "bg-primary text-primary-foreground animate-pulse"
                                : "text-muted-foreground hover:text-white hover:bg-white/10"
                        )}
                        title={isFormatPainterActive ? "Cancel Format Painter" : "Format Painter"}
                    >
                        <PaintRoller size={16} />
                    </button>
                    <button
                        onClick={togglePropertiesPanel}
                        className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                        title={t('properties.collapse')}
                    >
                        {(isMobile || isTablet) ? <PanelBottomClose size={16} /> : <PanelRightClose size={16} />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeObjectProperties ? (
                <>
                    <div className={cn(
                        "flex-1 overflow-y-auto space-y-4 custom-scrollbar",
                        // Responsive padding
                        isMobile ? "p-3 space-y-4 pb-8" : "p-4 space-y-4"
                    )}>
                        {/* Mobile only hint to edit on desktop if complex - Always visible */}
                        {(isMobile || isTablet) && (
                            <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200/90">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>{t('properties.mobileHint')}</span>
                            </div>
                        )}

                        {/* Text Content */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Type size={14} />
                                    <span>{t('properties.textContent')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isMixed('text') && (
                                        <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-medium px-2 py-0.5">
                                            {t('properties.mixed')}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 text-[10px] font-medium px-2 py-0.5">
                                        {t('properties.editableHint')}
                                    </span>
                                </div>
                            </div>
                            <textarea
                                value={localProps?.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                placeholder={t('properties.textPlaceholderEditable')}
                                className={cn(
                                    "w-full min-h-[120px] bg-slate-50/95 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 resize-none",
                                    isEditorPulseActive && "editor-attention-pulse",
                                    isMixed('text') && "border-sky-300 dark:border-sky-500/40"
                                )}
                            />

                            <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                                <details className="group rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5">
                                    <summary className="list-none cursor-pointer px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-white/70">
                                        <span>{t('properties.moreTools')}</span>
                                        <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-2 pb-2">
                                        <button
                                            onClick={() => window.open('https://www.piliapp.com/symbol/', '_blank', 'noopener,noreferrer')}
                                            className="w-full flex items-center justify-center gap-2 h-8 px-2 border border-slate-300 dark:border-white/10 rounded-md text-xs text-slate-700 dark:text-white/80 bg-white dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            title={t('properties.specialSymbols')}
                                        >
                                            <ExternalLink size={12} />
                                            <span>{t('properties.specialSymbols')}</span>
                                        </button>
                                    </div>
                                </details>
                            </div>
                        </div>

                        {/* Text Formatting Toolbar */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Type size={14} />
                                    <span>{t('properties.textFormat')}</span>
                                </div>
                                {(isMixed('fontWeight') || isMixed('fontStyle') || isMixed('textAlign') || isMixed('verticalAlign')) && (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-medium px-2 py-0.5">
                                        {t('properties.mixed')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Bold */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const currentWeight = localProps?.fontWeight || 'normal'
                                        handleChange('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold')
                                    }}
                                    className={`h-8 w-8 p-0 ${(localProps?.fontWeight === 'bold') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('fontWeight') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.bold')}
                                >
                                    <Bold size={16} />
                                </Button>

                                {/* Italic */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const currentStyle = localProps?.fontStyle || 'normal'
                                        handleChange('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic')
                                    }}
                                    className={`h-8 w-8 p-0 ${(localProps?.fontStyle === 'italic') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('fontStyle') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.italic')}
                                >
                                    <Italic size={16} />
                                </Button>

                                <div className="w-px h-6 bg-white/10 mx-1" />

                                {/* Alignment */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('textAlign', 'left')}
                                    className={`h-8 w-8 p-0 ${(localProps?.textAlign === 'left' || !localProps?.textAlign) ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('textAlign') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.alignLeft')}
                                >
                                    <AlignLeft size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('textAlign', 'center')}
                                    className={`h-8 w-8 p-0 ${(localProps?.textAlign === 'center') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('textAlign') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.alignCenter')}
                                >
                                    <AlignCenter size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('textAlign', 'right')}
                                    className={`h-8 w-8 p-0 ${(localProps?.textAlign === 'right') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('textAlign') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.alignRight')}
                                >
                                    <AlignRight size={16} />
                                </Button>

                                <div className="w-px h-6 bg-white/10 mx-1" />

                                {/* Vertical Alignment */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('verticalAlign', 'top')}
                                    className={`h-8 w-8 p-0 ${(localProps?.verticalAlign === 'top' || !localProps?.verticalAlign) ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('verticalAlign') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.alignTop')}
                                >
                                    <AlignVerticalJustifyStart size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('verticalAlign', 'middle')}
                                    className={`h-8 w-8 p-0 ${(localProps?.verticalAlign === 'middle') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('verticalAlign') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.alignMiddle')}
                                >
                                    <AlignVerticalJustifyCenter size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChange('verticalAlign', 'bottom')}
                                    className={`h-8 w-8 p-0 ${(localProps?.verticalAlign === 'bottom') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} ${isMixed('verticalAlign') ? 'ring-1 ring-sky-300 dark:ring-sky-500/40' : ''}`}
                                    title={t('properties.alignBottom')}
                                >
                                    <AlignVerticalJustifyEnd size={16} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2"
                                onClick={() => {
                                    hasManualAlignmentToggleRef.current = true
                                    setIsAlignmentExpanded((prev) => !prev)
                                }}
                                aria-expanded={isAlignmentExpanded}
                                title={isAlignmentExpanded ? t('properties.alignmentCollapse') : t('properties.alignmentExpand')}
                            >
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <AlignLeft size={14} />
                                        {t('alignment.sectionTitle')}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-600 dark:text-white/70">
                                        {isAlignmentExpanded
                                            ? alignmentStatusText
                                            : t('properties.alignmentCollapsedSummary', { count: selectedObjectCount })}
                                    </div>
                                </div>
                                <ChevronDown
                                    size={14}
                                    className={cn("text-slate-500 dark:text-white/60 transition-transform", isAlignmentExpanded && "rotate-180")}
                                />
                            </button>
                            {isAlignmentExpanded && (
                                <>
                                    <div className="grid grid-cols-8 gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canAlign}
                                            onClick={() => dispatchAlignmentCommand('align', 'alignLeft')}
                                            title={t('alignment.alignLeft')}
                                        >
                                            <AlignLeft size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canAlign}
                                            onClick={() => dispatchAlignmentCommand('align', 'alignCenterX')}
                                            title={t('alignment.alignCenterX')}
                                        >
                                            <AlignCenter size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canAlign}
                                            onClick={() => dispatchAlignmentCommand('align', 'alignRight')}
                                            title={t('alignment.alignRight')}
                                        >
                                            <AlignRight size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canAlign}
                                            onClick={() => dispatchAlignmentCommand('align', 'alignTop')}
                                            title={t('alignment.alignTop')}
                                        >
                                            <AlignVerticalJustifyStart size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canAlign}
                                            onClick={() => dispatchAlignmentCommand('align', 'alignCenterY')}
                                            title={t('alignment.alignCenterY')}
                                        >
                                            <AlignVerticalJustifyCenter size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canAlign}
                                            onClick={() => dispatchAlignmentCommand('align', 'alignBottom')}
                                            title={t('alignment.alignBottom')}
                                        >
                                            <AlignVerticalJustifyEnd size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canDistribute}
                                            onClick={() => dispatchAlignmentCommand('distribute', 'distributeHorizontally')}
                                            title={t('alignment.distributeHorizontally')}
                                        >
                                            <AlignHorizontalDistributeCenter size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-full p-0 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!canDistribute}
                                            onClick={() => dispatchAlignmentCommand('distribute', 'distributeVertically')}
                                            title={t('alignment.distributeVertically')}
                                        >
                                            <AlignVerticalDistributeCenter size={14} />
                                        </Button>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-white/60">
                                        {t('properties.multiSelectHint')}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Font Size */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Type size={14} />
                                    <span>{t('properties.fontSize')}</span>
                                </div>
                                {isMixed('fontSize') && (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-medium px-2 py-0.5">
                                        {t('properties.mixed')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Slider
                                    value={[localProps?.fontSize || 12]}
                                    min={Math.max(8, Math.floor((initialFontSize || 12) * 0.5))}
                                    max={Math.min(200, Math.ceil((initialFontSize || 12) * 2.0))}
                                    step={1}
                                    onValueChange={(vals) => handleChange('fontSize', vals[0])}
                                    className="flex-1 py-4"
                                />
                                <input
                                    type="number"
                                    value={localProps?.fontSize || 12}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value)
                                        if (!isNaN(val)) {
                                            handleChange('fontSize', val)
                                            // Update initialFontSize when manually typing, so range recenters around new value
                                            setInitialFontSize(val)
                                        }
                                    }}
                                    className={cn(
                                        "w-16 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-lg p-1 text-center text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50",
                                        isMixed('fontSize') && "border-sky-300 dark:border-sky-500/40"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Text Color */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Palette size={14} />
                                    <span>{t('properties.textColor')}</span>
                                </div>
                                {isMixed('fill') && (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-medium px-2 py-0.5">
                                        {t('properties.mixed')}
                                    </span>
                                )}
                            </div>
                            <div className={cn(
                                "flex items-center gap-3 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-lg p-2",
                                isMixed('fill') && "border-sky-300 dark:border-sky-500/40"
                            )}>
                                <div className="relative w-8 h-8 rounded border border-slate-200 dark:border-white/10 shadow-inner overflow-hidden">
                                    <input
                                        type="color"
                                        value={localProps?.fill || '#000000'}
                                        onChange={(e) => handleChange('fill', e.target.value)}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={localProps?.fill || '#000000'}
                                    onChange={(e) => handleChange('fill', e.target.value)}
                                    className="flex-1 bg-transparent border-none text-sm font-mono text-slate-900 dark:text-white focus:outline-none uppercase"
                                />
                            </div>
                        </div>

                        {/* Background Color */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Palette size={14} />
                                    <span>{t('properties.backgroundColor')}</span>
                                </div>
                                {isMixed('backgroundColor') && (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-medium px-2 py-0.5">
                                        {t('properties.mixed')}
                                    </span>
                                )}
                            </div>
                            <div className={cn(
                                "flex items-center gap-3 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-lg p-2",
                                isMixed('backgroundColor') && "border-sky-300 dark:border-sky-500/40"
                            )}>
                                <div className="relative w-8 h-8 rounded border border-slate-200 dark:border-white/10 shadow-inner overflow-hidden">
                                    <input
                                        type="color"
                                        value={normalizeHex(localProps?.backgroundColor)}
                                        onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={localProps?.backgroundColor || '#ffffff'}
                                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                    className="flex-1 bg-transparent border-none text-sm font-mono text-slate-900 dark:text-white focus:outline-none uppercase"
                                />
                            </div>
                        </div>

                        {/* Font Family */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Type size={14} />
                                    <span>{t('properties.fontFamily')}</span>
                                </div>
                                {isMixed('fontFamily') && (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-medium px-2 py-0.5">
                                        {t('properties.mixed')}
                                    </span>
                                )}
                            </div>
                            <Select
                                value={isMixed('fontFamily') ? undefined : (localProps?.fontFamily || 'Inter')}
                                onValueChange={(value) => handleChange('fontFamily', value)}
                            >
                                <SelectTrigger className={cn(
                                    "w-full bg-slate-50 dark:bg-black/40 border-slate-300 dark:border-white/10",
                                    isMixed('fontFamily') && "border-sky-300 dark:border-sky-500/40"
                                )}>
                                    <SelectValue placeholder={isMixed('fontFamily') ? t('properties.mixed') : t('properties.fontPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-50 dark:bg-[#1a1a1a] border-slate-300 dark:border-white/10">
                                    <SelectItem value="Inter">{t('properties.fontInter')}</SelectItem>
                                    <SelectItem value="Arial">Arial</SelectItem>
                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                    <SelectItem value="Courier New">Courier New</SelectItem>
                                    <SelectItem value="Georgia">Georgia</SelectItem>
                                    <SelectItem value="Microsoft JhengHei, sans-serif">{t('properties.fontJhengHei')}</SelectItem>
                                    <SelectItem value="KaiTi, serif">{t('properties.fontKaiTi')}</SelectItem>
                                    <SelectItem value="PMingLiU, serif">{t('properties.fontPMingLiU')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>


                    </div>
                </>
            ) : (
                <div className={cn("flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar", isMobile && "pb-8")}>
                    {/* Mobile only hint to edit on desktop if complex - Always visible */}
                    {(isMobile || isTablet) && (
                        <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200/90">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>{t('properties.mobileHint')}</span>
                        </div>
                    )}

                    {/* Page Info Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Type size={14} />
                            <span>{t('properties.pageInfo')}</span>
                        </div>
                        <div className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-3 space-y-2 text-sm shadow-sm dark:shadow-none">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('properties.currentPage')}</span>
                                <span className="text-slate-900 dark:text-white font-mono">{useStore.getState().currentPageIndex + 1} / {useStore.getState().pages.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('properties.ocrStatus')}</span>
                                {useStore.getState().pages[useStore.getState().currentPageIndex]?.ocrData ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900/10 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                        {t('properties.ocrDone')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900/10 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        <AlertTriangle size={12} className="text-amber-400" />
                                        {t('properties.ocrNotDone')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Guide */}
                    <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <AlignLeft size={14} />
                            <span>{t('properties.quickActions')}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <div className="shrink-0 w-6 h-6 rounded bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-xs font-mono">1</div>
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-white font-medium mb-1">{t('properties.actionOcrTitle')}</p>
                                    <p className="text-muted-foreground text-xs">{t('properties.actionOcrDesc')}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <div className="shrink-0 w-6 h-6 rounded bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-xs font-mono">2</div>
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-white font-medium mb-1">{t('properties.actionSelectTitle')}</p>
                                    <p className="text-muted-foreground text-xs">{t('properties.actionSelectDesc')}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <div className="shrink-0 w-6 h-6 rounded bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-xs font-mono">3</div>
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-white font-medium mb-1">{t('properties.actionAdjustTitle')}</p>
                                    <p className="text-muted-foreground text-xs">{t('properties.actionAdjustDesc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts */}
                    <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Palette size={14} />
                            <span>{t('properties.shortcuts')}</span>
                        </div>
                        <div className="bg-white/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-3 space-y-2 text-sm shadow-sm dark:shadow-none">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('properties.undo')}</span>
                                <kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded text-xs font-mono text-slate-700 dark:text-white">Ctrl+Z</kbd>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('properties.redo')}</span>
                                <kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded text-xs font-mono text-slate-700 dark:text-white">Ctrl+Y</kbd>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('properties.deleteText')}</span>
                                <kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded text-xs font-mono text-slate-700 dark:text-white">Del</kbd>
                            </div>
                        </div>
                    </div>

                    {/* Empty State Hint */}
                    <div className="mt-auto pt-4 border-t border-white/10">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                            <div className="shrink-0 p-2 rounded-full bg-blue-100 dark:bg-blue-500/20">
                                <Type size={16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">{t('properties.tipTitle')}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-200/80">{t('properties.tipBody')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div>
    )
}


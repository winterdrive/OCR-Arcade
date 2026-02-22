import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useStore, type PageData } from '@/shared/store/useStore'
import { DropZone } from '@/domains/project/components/DropZone'
import { LoadingOverlay } from '@/shared/components/LoadingOverlay'
import { ToastContainer } from '@/shared/components/ToastContainer'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { SimplifiedToolbar } from '@/domains/toolbar/components'
import { MobileHeaderMenu } from '@/shared/components/MobileHeaderMenu'
import { Sidebar } from '@/domains/layout/components/Sidebar'
import { CanvasArea } from '@/domains/canvas/components/CanvasArea'
import { PropertiesPanel } from '@/domains/layout/components/PropertiesPanel'
import { FirstTimeGuide, useFirstTimeGuide } from '@/shared/components/FirstTimeGuide'
import { useEnhancedUndoRedoShortcuts } from '@/domains/canvas/components/EnhancedUndoRedo'
import { loadImage, loadPDF } from '@/domains/export/services/pdf'
import { useLoadingStore } from '@/shared/store/feedbackStore'
import { useResponsiveLayout } from '@/domains/layout/hooks/useResponsiveLayout'
import { assetUrl, cn } from '@/shared/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { ocrServiceManager } from '@/domains/ocr/services/OCRServiceManager'
import { DesktopPets } from '@/shared/components/DesktopPets/DesktopPets'
import { LanguageToggle } from '@/shared/components/LanguageToggle'
import { useTranslation } from 'react-i18next'
import { HowItWorks } from '@/domains/project/components/HowItWorks'
import UpsideDownAtmosphere from '@/shared/components/UpsideDownAtmosphere'
import { ArcadeLogo } from '@/shared/components/ArcadeLogo'
import { UpsideDownDustLayer } from '@/shared/components/UpsideDownDustLayer'
import { InteractiveGrass } from '@/shared/components/layout/InteractiveGrass'

const GITHUB_REPO_URL = 'https://github.com/winterdrive/OCR-Arcade'

// Upload Page - 上傳頁面
function UploadPage({ showPets }: { showPets: boolean }) {
    const { t } = useTranslation()
    const { setPages } = useStore()
    const { setLoading } = useLoadingStore()
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)
    const demoItems = [
        {
            id: 'demo-scan-1',
            label: t('demos.scan1.label'),
            type: 'image',
            assetPath: assetUrl('assets/demo-scan-1.png'),
            thumbPath: assetUrl('assets/demo-scan-1.png'),
            description: t('demos.scan1.desc')
        },
        {
            id: 'demo-scan-2',
            label: t('demos.scan2.label'),
            type: 'image',
            assetPath: assetUrl('assets/demo-scan-2.png'),
            thumbPath: assetUrl('assets/demo-scan-2.png'),
            description: t('demos.scan2.desc')
        },
        {
            id: 'demo-simple',
            label: t('demos.simple.label'),
            type: 'image',
            assetPath: assetUrl('assets/demo-simple.png'),
            thumbPath: assetUrl('assets/demo-simple.png'),
            description: t('demos.simple.desc')
        },
        {
            id: 'demo-collaboration',
            label: t('demos.collaboration.label'),
            type: 'pdf',
            assetPath: assetUrl('assets/demo-collaboration.pdf'),
            thumbPath: assetUrl('assets/demo-collaboration.pdf'),
            description: t('demos.collaboration.desc')
        }
    ] as const

    const handleFileSelected = async (file: File) => {
        setLoading(true, t('messages.loadingFile'), 0)
        try {
            let loadedPages: PageData[] = []
            if (file.type === 'application/pdf') {
                const pdfPages = await loadPDF(file, (current, total) => {
                    setLoading(true, t('messages.loadingPdf', { current, total }), current / total)
                })
                loadedPages = pdfPages.map(p => ({ ...p, id: Math.random().toString() }))
            } else {
                const imgPages = await loadImage(file)
                loadedPages = imgPages.map(p => ({ ...p, id: Math.random().toString() }))
            }

            setPages(loadedPages)
            setLoading(false)

            // Navigate to edit page after successful upload
            navigate('/edit')
        } catch (e) {
            alert(t('messages.errorLoadingFile'))
            setLoading(false)
        }
    }

    const handleDemoLoad = async (assetPath: string, label: string) => {
        setLoading(true, t('messages.loadingLabel', { label }), 0)
        try {
            const response = await fetch(assetPath)
            const blob = await response.blob()
            const filename = assetPath.split('/').pop() ?? 'demo'
            const inferredType = blob.type || (filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png')
            const file = new File([blob], filename, { type: inferredType })

            let loadedPages: PageData[] = []
            if (file.type === 'application/pdf') {
                const pdfPages = await loadPDF(file, (current, total) => {
                    setLoading(true, t('messages.loadingLabelProgress', { label, current, total }), current / total)
                })
                loadedPages = pdfPages.map(p => ({ ...p, id: Math.random().toString() }))
            } else {
                const imgPages = await loadImage(file)
                loadedPages = imgPages.map(p => ({ ...p, id: Math.random().toString() }))
            }

            setPages(loadedPages)
            setLoading(false)

            // Navigate to edit page after successful demo load
            navigate('/edit')
        } catch (e) {
            alert(t('messages.errorLoadingDemo'))
            setLoading(false)
        }
    }

    return (
        <div className="relative flex-1 flex flex-col items-center p-6 pt-10 pb-10 animate-fade-in-up overflow-y-auto overflow-x-hidden min-h-0 w-full">
            <DesktopPets enabled={showPets} variant="subtle" edgeCorridor={false} transparencyMode="zone-based" />
            <div className="w-full max-w-4xl space-y-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <ArcadeLogo linkTo="/" size="lg" className="hover:opacity-80 transition-opacity" />
                    {/* Desktop Header Actions (hidden on mobile) */}
                    <div className="hidden sm:flex items-center gap-3">
                        <a
                            href={GITHUB_REPO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center w-9 h-9 border-2 border-border bg-card text-slate-900 shadow-[3px_3px_0_rgba(2,6,23,0.45)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgba(2,6,23,0.45)] dark:border-stranger-red/35 dark:bg-black/35 dark:text-stranger-red/85 dark:shadow-[3px_3px_0_rgba(255,0,51,0.28)] dark:hover:bg-stranger-red/15 dark:hover:text-white dark:hover:border-stranger-red"
                            aria-label="Open OCR Arcade on GitHub"
                            title="GitHub"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
                                <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.39 7.86 10.9.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.38.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.71 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.45.11-3.02 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.57.24 2.73.12 3.02.74.81 1.19 1.84 1.19 3.1 0 4.44-2.71 5.42-5.29 5.7.41.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.67.8.56a11.54 11.54 0 0 0 7.84-10.9C23.5 5.66 18.35.5 12 .5z" />
                            </svg>
                        </a>
                        {/* Theme Toggle */}
                        <ThemeToggle />
                        <LanguageToggle variant="compact" />
                    </div>

                    {/* Mobile Menu Action (hidden on desktop) */}
                    <MobileHeaderMenu />
                </div>

                {/* Drop Zone Area */}
                <div className="drop-zone glass-card rounded-2xl p-6 min-h-[400px] flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="text-left space-y-6">
                            <h1 className="text-2xl sm:text-5xl font-bold tracking-tight break-words">
                                <span className="text-gradient drop-shadow-2xl">{t('dropzone.heroTitle')}</span>
                            </h1>
                            <p className="text-muted-foreground dark:text-white text-base sm:text-lg">{t('dropzone.heroSubtitle')}</p>
                            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t('dropzone.heroHint')}</p>
                            <div className="flex items-start flex-col gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    className="px-5 py-3 bg-primary text-primary-foreground border-2 border-border shadow-[4px_4px_0_rgba(2,6,23,0.45)] text-xs font-semibold uppercase tracking-[0.14em]"
                                >
                                    {t('dropzone.cta')}
                                </button>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-white/60">
                                    PDF / PNG / JPG
                                </span>
                            </div>
                        </div>
                        <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors">
                            <DropZone onFileSelected={handleFileSelected} inputRef={inputRef} showCTA={false} />
                        </div>
                    </div>
                </div>

                {/* How It Works */}
                <HowItWorks />

                {/* Demo Gallery */}
                <section className="glass-card rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-white/60 to-white/30 dark:from-black/80 dark:to-black/30 dark:border-stranger-red/20">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white/90">
                                {t('upload.demoTitle')}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-white/60">
                                {t('upload.demoSubtitle')}
                            </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-white/50">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/5 dark:bg-white/10">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                {t('upload.labels.image')}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/5 dark:bg-white/10">
                                <span className="size-2 rounded-full bg-blue-500" />
                                {t('upload.labels.pdf')}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {demoItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleDemoLoad(item.assetPath, item.label)}
                                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/70 dark:bg-white/5 dark:hover:bg-stranger-red/10 shadow-md shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all glitch-hover"
                            >
                                <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                                    {item.type === 'image' && (
                                        <img
                                            src={item.thumbPath}
                                            alt={item.label}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    )}
                                    {item.type === 'pdf' && (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-white/70">
                                                <span className="text-3xl">📄</span>
                                                <span className="text-xs tracking-wide">PDF</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="p-4 text-left">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white/90">
                                            {item.label}
                                        </h3>
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${item.type === 'pdf'
                                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                                }`}
                                        >
                                            {item.type}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-600 dark:text-white/60 line-clamp-2">
                                        {item.description}
                                    </p>
                                    <div className="mt-3 text-xs font-medium text-primary group-hover:translate-x-1 transition-transform">
                                        {t('upload.loadCta')}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
                <footer className="pb-2 text-xs text-slate-600 dark:text-white/55 flex flex-wrap items-center gap-2">
                    <span>Open-source project on GitHub.</span>
                    <a
                        href={GITHUB_REPO_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline underline-offset-2"
                    >
                        Give it a star →
                    </a>
                </footer>
            </div>
        </div>
    )
}

// Edit Page - 編輯頁面
function EditPage({ showPets }: { showPets: boolean }) {
    const { pages, isSidebarCollapsed, isSidebarOverlayMode } = useStore()
    const { toggleSidebarOverlay } = useResponsiveLayout()

    // Initialize enhanced undo/redo shortcuts
    useEnhancedUndoRedoShortcuts()

    // Redirect to upload page if no pages loaded
    if (pages.length === 0) {
        return <Navigate to="/" replace />
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Simplified Toolbar - Floating Glass Header */}
            <header className="relative z-30 px-4 py-3 bg-background/50 backdrop-blur-sm border-b border-white/5">
                <div className="max-w-[1920px] mx-auto glass rounded-xl shadow-2xl shadow-black/20">
                    <SimplifiedToolbar />
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <DesktopPets enabled={showPets} variant="subtle" edgeCorridor />
                {/* Sidebar - Always show on desktop unless in overlay mode */}
                {!isSidebarOverlayMode && (
                    <aside className={cn(
                        "h-full glass-panel border-r border-white/5 shadow-2xl z-20 transition-all duration-300",
                        isSidebarCollapsed ? "w-10" : "w-[200px]"
                    )}>
                        <Sidebar />
                    </aside>
                )}

                {/* Sidebar Overlay Mode */}
                {isSidebarCollapsed && isSidebarOverlayMode && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                            onClick={() => toggleSidebarOverlay()}
                        />
                        {/* Overlay Sidebar */}
                        <aside className="fixed left-0 top-0 h-full z-50 lg:hidden w-[280px] glass-panel shadow-2xl animate-fade-in-up">
                            <Sidebar />
                        </aside>
                    </>
                )}

                {/* Canvas Area */}
                <div className={cn(
                    "flex-1 flex transition-all duration-300 relative bg-slate-950/30",
                    isSidebarCollapsed ? "ml-0" : "ml-0"
                )}>
                    <div className="flex-1 flex relative overflow-hidden m-2 md:m-3 glass-card rounded-xl shadow-inner border border-white/5">
                        <CanvasArea />
                        <PropertiesPanel />
                    </div>
                </div>
            </main>
        </div>
    )
}

// Main App Wrapper - 主應用包裝器
function MainApp() {
    const { showGuide, completeGuide, skipGuide } = useFirstTimeGuide()
    const [showPets, setShowPets] = useState(true)
    const { t } = useTranslation()


    // Initialize OCR Service Manager for optimal performance
    useEffect(() => {
        const initializeOCRService = async () => {
            try {
                await ocrServiceManager.initialize();
            } catch (error) {
                // Service will initialize on first use if this fails
            }
        }

        initializeOCRService();
    }, [])



    return (
        <div
            className="h-screen w-full flex flex-col bg-transparent dark:bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30"
        >
            <InteractiveGrass />
            <UpsideDownAtmosphere />
            <UpsideDownDustLayer />
            <LoadingOverlay />
            <ToastContainer />
            <button
                type="button"
                onClick={() => setShowPets((current) => !current)}
                className="fixed right-4 bottom-4 z-[9999] w-12 h-12 rounded-full glass flex items-center justify-center border-2 border-border shadow-[4px_4px_0_rgba(2,6,23,0.45)]"
                aria-pressed={!showPets}
                aria-label={showPets ? t('pets.hide') : t('pets.show')}
                title={showPets ? t('pets.hide') : t('pets.show')}
            >
                <span
                    className={`absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-border ${showPets ? 'bg-emerald-400' : 'bg-slate-400'}`}
                />
                <img
                    src={assetUrl('assets/pets/leopard_cat_walk_frame_0.png')}
                    alt=""
                    className="w-8 h-8 object-contain pixelated"
                    draggable={false}
                />
            </button>

            {/* First Time Guide */}
            {showGuide && (
                <FirstTimeGuide
                    onComplete={completeGuide}
                    onSkip={skipGuide}
                />
            )}

            {/* Router Outlet */}
            <Routes>
                <Route path="/" element={<UploadPage showPets={showPets} />} />
                <Route path="/edit" element={<EditPage showPets={showPets} />} />
            </Routes>
        </div>
    )
}


// App Router
function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/*" element={<MainApp />} />
            </Routes>
        </HashRouter>
    )
}

export default App

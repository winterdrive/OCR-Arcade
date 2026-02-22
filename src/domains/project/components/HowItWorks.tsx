import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { assetUrl } from '@/shared/lib/utils'

export function HowItWorks() {
    const { t } = useTranslation()
    const [previewSrc, setPreviewSrc] = useState<string | null>(null)

    useEffect(() => {
        if (!previewSrc) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewSrc(null)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [previewSrc])

    return (
        <section className="glass-card rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-white/70 to-white/30 dark:from-white/5 dark:to-white/0">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white/90">
                        {t('howItWorks.title')}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-white/60">
                        {t('resultPreview.desc')}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    t('howItWorks.step1'),
                    t('howItWorks.step2'),
                    t('howItWorks.step3'),
                ].map((label, index) => (
                    <div
                        key={label}
                        className="glass-card rounded-xl border border-white/10 bg-white/80 dark:bg-white/10 p-4 shadow-md"
                    >
                        <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/60">
                            {`0${index + 1}`}
                        </div>
                        <div className="mt-2 text-[13px] leading-5 font-semibold text-slate-900 dark:text-white/90">
                            {label}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white/90">
                    {t('resultPreview.title')}
                </h3>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-xl border border-white/10 bg-white/70 dark:bg-white/5 p-3">
                    <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                        <span className="absolute left-2 top-2 z-10 px-2.5 py-1 text-[11px] uppercase tracking-widest bg-primary/10 text-slate-900 dark:bg-slate-900/70 dark:text-slate-100 border border-border dark:border-white/20 rounded-full">
                            {t('resultPreview.before')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreviewSrc(assetUrl('assets/demo-simple.png'))}
                            className="h-full w-full"
                            aria-label={t('resultPreview.before')}
                        >
                            <img
                                src={assetUrl('assets/demo-simple.png')}
                                alt={t('resultPreview.title')}
                                className="h-full w-full object-cover pixelated"
                            />
                        </button>
                    </div>
                </div>
                <div className="glass-card rounded-xl border border-white/10 bg-white/70 dark:bg-white/5 p-3">
                    <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                        <span className="absolute left-2 top-2 z-10 px-2.5 py-1 text-[11px] uppercase tracking-widest bg-primary/10 text-slate-900 dark:bg-slate-900/70 dark:text-slate-100 border border-border dark:border-white/20 rounded-full">
                            {t('resultPreview.after')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreviewSrc(assetUrl('assets/demo-simple-fix.png'))}
                            className="h-full w-full"
                            aria-label={t('resultPreview.after')}
                        >
                            <img
                                src={assetUrl('assets/demo-simple-fix.png')}
                                alt={t('resultPreview.title')}
                                className="h-full w-full object-cover pixelated"
                            />
                        </button>
                    </div>
                </div>
            </div>
            {previewSrc && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setPreviewSrc(null)}
                >
                    <div
                        className="relative max-h-[90vh] w-[95vw] md:w-auto md:max-w-4xl lg:max-w-6xl rounded-2xl border border-white/10 bg-white dark:bg-slate-950 shadow-2xl flex flex-col p-2"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewSrc(null)}
                            className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] sm:text-xs uppercase tracking-widest text-white backdrop-blur-sm"
                        >
                            {t('projects.close')}
                        </button>
                        <div className="overflow-auto w-full max-h-[85vh] custom-scrollbar flex items-start justify-center">
                            <img
                                src={previewSrc}
                                alt={t('resultPreview.title')}
                                className="w-auto h-auto min-w-full md:max-h-[80vh] md:max-w-full object-contain pixelated"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    )
}

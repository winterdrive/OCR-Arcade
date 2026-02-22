import { X, ScanText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/shared/store/useStore'
import { cn } from '@/shared/lib/utils'
import { useOcrRunner } from '@/domains/ocr/hooks/useOcrRunner'

export function OcrPromptOverlay() {
  const { t } = useTranslation()
  const { pages, ocrHasTriggered, ocrPromptDismissed, setOcrPromptDismissed, ocrStatus } = useStore()
  const { startOcr } = useOcrRunner()

  const shouldShow = pages.length > 0 && !ocrHasTriggered && !ocrPromptDismissed
  if (!shouldShow) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto w-[320px] max-w-[90vw] glass-card border border-white/10",
          "bg-white/90 dark:bg-slate-900/80 !text-slate-900 dark:!text-white ocr-prompt-text",
          "p-5 shadow-2xl animate-fade-in-up"
        )}
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Noto Sans", "PingFang TC", "Microsoft JhengHei", "Helvetica Neue", Arial, sans-serif'
        }}
        role="dialog"
        aria-label={t('ocrPrompt.title')}
      >
        <button
          type="button"
          onClick={() => setOcrPromptDismissed(true)}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          aria-label={t('ocrPrompt.dismiss')}
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 border-2 border-border bg-primary/20 text-primary flex items-center justify-center">
            <ScanText size={18} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('ocrPrompt.title')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-5">
              {t('ocrPrompt.description')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            onClick={startOcr}
            disabled={ocrStatus === 'processing'}
            className={cn(
              "flex-1 px-3 py-2 border-2 border-border text-xs uppercase tracking-widest text-slate-900 dark:text-white",
              "bg-primary text-primary-foreground shadow-[3px_3px_0_rgba(2,6,23,0.45)]",
              "hover:opacity-90 active:translate-y-[1px]",
              ocrStatus === 'processing' && "opacity-60 cursor-not-allowed"
            )}
          >
            {t('ocrPrompt.cta')}
          </button>
          <button
            type="button"
            onClick={() => setOcrPromptDismissed(true)}
            className="px-3 py-2 border-2 border-border text-xs uppercase tracking-widest text-slate-800 dark:text-white bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20"
          >
            {t('ocrPrompt.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}

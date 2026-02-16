import { useCallback } from 'react'
import { useStore } from '@/shared/store/useStore'
import { useToastStore } from '@/shared/store/feedbackStore'
import { ocrServiceManager } from '@/domains/ocr/services/OCRServiceManager'
import { scanStrategyService, type OCRStrategy } from '@/domains/ocr/services/ScanStrategyService'
import { useTranslation } from 'react-i18next'

export function useOcrRunner() {
  const { t } = useTranslation()
  const {
    pages,
    currentPageIndex,
    ocrLanguage,
    setPageOCRData,
    markOcrTriggered,
    setOcrStatus,
    setOcrProgress
  } = useStore()
  const { addToast } = useToastStore()

  const startOcr = useCallback(async () => {
    const currentPage = pages[currentPageIndex]
    if (!currentPage) {
      addToast(t('toasts.needLoadImage'), 'info')
      return
    }

    const serviceState = ocrServiceManager.getState()
    if (serviceState.status !== 'ready') {
      addToast(t('toasts.waitForService'), 'info')
      return
    }

    if (currentPage.ocrData) {
      const confirmed = confirm(t('toasts.confirmReocr'))
      if (!confirmed) return
    }

    markOcrTriggered()

    let progressInterval: ReturnType<typeof setInterval> | null = null
    try {
      setOcrStatus('processing')
      setOcrProgress(0)
      addToast(t('toasts.startOcr'), 'info')

      progressInterval = setInterval(() => {
        const currentProgress = useStore.getState().ocrProgress
        setOcrProgress(Math.min(currentProgress + 10, 90))
      }, 200)

      const selectedStrategy: OCRStrategy = 'tesseract_morph'
      const result = await scanStrategyService.execute(
        selectedStrategy,
        currentPage.imageData,
        ocrLanguage
      )

      if (progressInterval) clearInterval(progressInterval)
      setOcrProgress(100)

      setPageOCRData(currentPageIndex, result.words || [])

      setOcrStatus('completed')
      addToast(t('toasts.ocrSuccess', { count: result.words?.length || 0 }), 'success')

      setTimeout(() => {
        setOcrStatus('idle')
        setOcrProgress(0)
      }, 2000)
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      setOcrStatus('error')
      addToast(t('toasts.ocrFail'), 'error')

      setTimeout(() => {
        setOcrStatus('idle')
        setOcrProgress(0)
      }, 2000)
    }
  }, [
    pages,
    currentPageIndex,
    ocrLanguage,
    setPageOCRData,
    markOcrTriggered,
    setOcrStatus,
    setOcrProgress,
    addToast,
    t
  ])

  return { startOcr }
}

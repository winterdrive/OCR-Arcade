import React, { useState, useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { X, ChevronLeft, ChevronRight, Upload, ScanText, Edit3, Download, Sparkles } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/shared/components/LanguageToggle'

interface GuideStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  target?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface FirstTimeGuideProps {
  onComplete: () => void
  onSkip: () => void
}

export function FirstTimeGuide({ onComplete, onSkip }: FirstTimeGuideProps) {
  const { t } = useTranslation()
  const GUIDE_STEPS: GuideStep[] = [
    {
      id: 'welcome',
      title: t('firstTimeGuide.title'),
      description: t('firstTimeGuide.description'),
      icon: <Sparkles size={24} className="text-blue-500" />
    },
    {
      id: 'upload',
      title: t('firstTimeGuide.uploadTitle'),
      description: t('firstTimeGuide.uploadDesc'),
      icon: <Upload size={24} className="text-green-500" />,
      target: '.drop-zone',
      position: 'top'
    },
    {
      id: 'ocr',
      title: t('firstTimeGuide.ocrTitle'),
      description: t('firstTimeGuide.ocrDesc'),
      icon: <ScanText size={24} className="text-purple-500" />,
      target: '.ocr-toolbar',
      position: 'left'
    },
    {
      id: 'edit',
      title: t('firstTimeGuide.editTitle'),
      description: t('firstTimeGuide.editDesc'),
      icon: <Edit3 size={24} className="text-orange-500" />,
      target: '.canvas-area',
      position: 'top'
    },
    {
      id: 'export',
      title: t('firstTimeGuide.exportTitle'),
      description: t('firstTimeGuide.exportDesc'),
      icon: <Download size={24} className="text-red-500" />,
      target: '.toolbar',
      position: 'bottom'
    }
  ]
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

  const step = GUIDE_STEPS[currentStep]

  // Find target element when step changes
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement
      setTargetElement(element)
    } else {
      setTargetElement(null)
    }
  }, [step.target])

  // 弹窗固定居中，不跳动
  const getTooltipPosition = () => {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  const handleSkip = () => {
    setIsVisible(false)
    setTimeout(() => {
      onSkip()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop - 轻度变暗，不模糊 */}
      <div className="fixed inset-0 bg-black/30 z-50 transition-opacity duration-300">
        {/* Highlight target element */}
        {targetElement && (
          <div
            className="absolute border-2 border-blue-500 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Guide Tooltip */}
        <div
          className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-80 transition-all duration-300"
          style={getTooltipPosition()}
        >
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <LanguageToggle variant="compact" />
            {/* Close Button - 更明显 */}
            <button
              onClick={handleSkip}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors group"
              aria-label={t('firstTimeGuide.close')}
            >
              <X size={18} className="text-gray-600 group-hover:text-gray-900" />
            </button>
          </div>

          {/* Step Content */}
          <div className="space-y-4 pt-6">
            {/* Icon and Title */}
            <div className="flex items-center gap-3">
              {step.icon}
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">{step.description}</p>

            {/* Progress Indicator - 显示步数 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {GUIDE_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentStep ? "bg-blue-500" : "bg-gray-300"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500 font-medium">
                {currentStep + 1}/{GUIDE_STEPS.length}
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gap-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <ChevronLeft size={16} />
                  {t('firstTimeGuide.prev')}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  {t('firstTimeGuide.skip')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                >
                  {currentStep === GUIDE_STEPS.length - 1 ? t('firstTimeGuide.done') : t('firstTimeGuide.next')}
                  {currentStep < GUIDE_STEPS.length - 1 && <ChevronRight size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to manage first-time guide state
export function useFirstTimeGuide() {
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    // Check if user has seen the guide before
    const hasSeenGuide = localStorage.getItem('ocr-arcade-guide-completed')
    if (!hasSeenGuide) {
      // Show guide after a short delay
      const timer = setTimeout(() => {
        setShowGuide(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const completeGuide = () => {
    localStorage.setItem('ocr-arcade-guide-completed', 'true')
    setShowGuide(false)
  }

  const skipGuide = () => {
    localStorage.setItem('ocr-arcade-guide-completed', 'true')
    setShowGuide(false)
  }

  const resetGuide = () => {
    localStorage.removeItem('ocr-arcade-guide-completed')
    setShowGuide(true)
  }

  return {
    showGuide,
    completeGuide,
    skipGuide,
    resetGuide
  }
}

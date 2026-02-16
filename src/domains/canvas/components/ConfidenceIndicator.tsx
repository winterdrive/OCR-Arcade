import React from 'react'
import { cn } from '@/shared/lib/utils'
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ConfidenceIndicatorProps {
  confidence: number
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function ConfidenceIndicator({ 
  confidence, 
  size = 'md', 
  showText = false, 
  className 
}: ConfidenceIndicatorProps) {
  const { t } = useTranslation()
  // Determine confidence level and styling
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 0.9) return 'high'
    if (conf >= 0.7) return 'medium'
    return 'low'
  }

  const level = getConfidenceLevel(confidence)
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20
  }

  const getIcon = () => {
    switch (level) {
      case 'high':
        return <CheckCircle size={iconSize[size]} className="text-green-600" />
      case 'medium':
        return <AlertCircle size={iconSize[size]} className="text-yellow-600" />
      case 'low':
        return <AlertTriangle size={iconSize[size]} className="text-red-600" />
    }
  }

  const getBadgeColor = () => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getTooltipText = () => {
    const percentage = Math.round(confidence * 100)
    switch (level) {
      case 'high':
        return t('confidence.high', { percentage })
      case 'medium':
        return t('confidence.medium', { percentage })
      case 'low':
        return t('confidence.low', { percentage })
    }
  }

  if (showText) {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium",
          getBadgeColor(),
          className
        )}
        title={getTooltipText()}
      >
        {getIcon()}
        <span>{Math.round(confidence * 100)}%</span>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 border-white shadow-sm",
        sizeClasses[size],
        level === 'high' && "bg-green-500",
        level === 'medium' && "bg-yellow-500", 
        level === 'low' && "bg-red-500",
        className
      )}
      title={getTooltipText()}
    >
      {size === 'lg' && getIcon()}
    </div>
  )
}

// Confidence Statistics Component
interface ConfidenceStatsProps {
  confidenceScores: number[]
  className?: string
}

export function ConfidenceStats({ confidenceScores, className }: ConfidenceStatsProps) {
  const { t } = useTranslation()
  if (confidenceScores.length === 0) return null

  const high = confidenceScores.filter(c => c >= 0.9).length
  const medium = confidenceScores.filter(c => c >= 0.7 && c < 0.9).length
  const low = confidenceScores.filter(c => c < 0.7).length
  const total = confidenceScores.length
  const average = confidenceScores.reduce((sum, c) => sum + c, 0) / total

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-gray-700">
        {t('confidence.title')}
      </div>
      
      {/* Overall Score */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{t('confidence.average')}</span>
        <ConfidenceIndicator confidence={average} showText />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">{t('confidence.highLabel', { count: high })}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">{t('confidence.mediumLabel', { count: medium })}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">{t('confidence.lowLabel', { count: low })}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="h-full flex">
          <div 
            className="bg-green-500" 
            style={{ width: `${(high / total) * 100}%` }}
          />
          <div 
            className="bg-yellow-500" 
            style={{ width: `${(medium / total) * 100}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${(low / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Hook for confidence-based filtering
export function useConfidenceFilter() {
  const [minConfidence, setMinConfidence] = React.useState(0)
  const [showLowConfidence, setShowLowConfidence] = React.useState(true)

  const filterByConfidence = React.useCallback((items: Array<{ confidence?: number }>) => {
    return items.filter(item => {
      if (item.confidence === undefined) return true
      if (!showLowConfidence && item.confidence < 0.7) return false
      return item.confidence >= minConfidence
    })
  }, [minConfidence, showLowConfidence])

  return {
    minConfidence,
    setMinConfidence,
    showLowConfidence,
    setShowLowConfidence,
    filterByConfidence
  }
}

import React from 'react'
import { useStore } from '@/shared/store/useStore'
import { useToastStore } from '@/shared/store/feedbackStore'
import { Button } from '@/shared/ui/button'
import {
  Undo2,
  Redo2,
  History,
  RotateCcw,
  Type,
  Image as ImageIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface HistoryAction {
  id: string
  type: 'canvas' | 'text' | 'ocr' | 'page'
  description: string
  timestamp: Date
  canUndo: boolean
}

interface EnhancedUndoRedoProps {
  className?: string
  showHistory?: boolean
}

export function EnhancedUndoRedo({ className, showHistory = true }: EnhancedUndoRedoProps) {
  const { t } = useTranslation()
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    undoTextOverlay,
    redoTextOverlay,
    canUndoTextOverlay,
    canRedoTextOverlay,
    history,
    textOverlayHistory
  } = useStore()

  // Generate history actions from store state
  const getHistoryActions = (): HistoryAction[] => {
    const actions: HistoryAction[] = []

    // Canvas history
    history.past.forEach((_, index) => {
      actions.push({
        id: `canvas-${index}`,
        type: 'canvas',
        description: t('undoRedo.canvasEdit', { index: index + 1 }),
        timestamp: new Date(Date.now() - (history.past.length - index) * 60000),
        canUndo: true
      })
    })

    // Text overlay history
    textOverlayHistory.past.forEach((_, index) => {
      actions.push({
        id: `text-${index}`,
        type: 'text',
        description: t('undoRedo.textEdit', { index: index + 1 }),
        timestamp: new Date(Date.now() - (textOverlayHistory.past.length - index) * 30000),
        canUndo: true
      })
    })

    // Sort by timestamp (most recent first)
    return actions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)
  }

  const historyActions = getHistoryActions()

  const handleUndo = () => {
    // Try text overlay undo first, then canvas undo
    if (canUndoTextOverlay()) {
      undoTextOverlay()
    } else if (canUndo()) {
      undo()
      window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
    }
  }

  const handleRedo = () => {
    // Try text overlay redo first, then canvas redo
    if (canRedoTextOverlay()) {
      redoTextOverlay()
    } else if (canRedo()) {
      redo()
      window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
    }
  }

  const handleSpecificUndo = (actionType: 'canvas' | 'text') => {
    if (actionType === 'canvas' && canUndo()) {
      undo()
      window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
    } else if (actionType === 'text' && canUndoTextOverlay()) {
      undoTextOverlay()
    }
  }

  const getActionIcon = (type: HistoryAction['type']) => {
    switch (type) {
      case 'canvas':
        return <ImageIcon size={14} className="text-blue-500" />
      case 'text':
        return <Type size={14} className="text-green-500" />
      case 'ocr':
        return <RotateCcw size={14} className="text-purple-500" />
      case 'page':
        return <History size={14} className="text-orange-500" />
      default:
        return <History size={14} className="text-gray-500" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return t('undoRedo.justNow')
    if (minutes < 60) return t('undoRedo.minutesAgo', { minutes })

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('undoRedo.hoursAgo', { hours })

    return date.toLocaleDateString()
  }

  const hasAnyUndo = canUndo() || canUndoTextOverlay()
  const hasAnyRedo = canRedo() || canRedoTextOverlay()

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Basic Undo/Redo Buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleUndo}
        disabled={!hasAnyUndo}
        className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={t('toolbar.undo')}
      >
        <Undo2 size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleRedo}
        disabled={!hasAnyRedo}
        className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={t('toolbar.redo')}
      >
        <Redo2 size={16} />
      </Button>

      {/* History Dropdown */}
      {showHistory && historyActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              title={t('undoRedo.history')}
            >
              <History size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px] bg-[#1a1a1a] border-white/10">
            <div className="p-2 text-xs font-medium text-gray-400 border-b border-white/10">
              {t('undoRedo.historyTitle')}
            </div>

            {historyActions.map((action, index) => (
              <DropdownMenuItem
                key={action.id}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                onClick={() => {
                  // For now, just perform a single undo/redo
                  // In a more advanced implementation, we could undo to a specific point
                  if (action.type === 'canvas') {
                    handleSpecificUndo('canvas')
                  } else if (action.type === 'text') {
                    handleSpecificUndo('text')
                  }
                }}
              >
                {getActionIcon(action.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {action.description}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTime(action.timestamp)}
                  </div>
                </div>
                {index === 0 && (
                  <div className="text-xs text-blue-400 font-medium">
                    {t('undoRedo.latest')}
                  </div>
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="bg-white/10" />

            {/* Specific Undo/Redo Options */}
            <div className="p-2 space-y-1">
              <div className="text-xs font-medium text-gray-400 mb-2">
                {t('undoRedo.specific')}
              </div>

              <DropdownMenuItem
                onClick={() => handleSpecificUndo('canvas')}
                disabled={!canUndo()}
                className="flex items-center gap-2 text-sm"
              >
                <ImageIcon size={14} className="text-blue-500" />
                {t('undoRedo.undoCanvas')}
                {canUndo() && (
                  <span className="ml-auto text-xs text-gray-400">
                    Ctrl+Z
                  </span>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSpecificUndo('text')}
                disabled={!canUndoTextOverlay()}
                className="flex items-center gap-2 text-sm"
              >
                <Type size={14} className="text-green-500" />
                {t('undoRedo.undoText')}
                {canUndoTextOverlay() && (
                  <span className="ml-auto text-xs text-gray-400">
                    Alt+Z
                  </span>
                )}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// Keyboard shortcuts hook for enhanced undo/redo
export function useEnhancedUndoRedoShortcuts() {
  const { t } = useTranslation()
  const {
    undo,
    redo,
    undoTextOverlay,
    redoTextOverlay,
    canUndo,
    canRedo,
    canUndoTextOverlay,
    canRedoTextOverlay
  } = useStore()

  const { addToast } = useToastStore()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (target as any).isContentEditable) {
          return
        }
      }
      // Standard undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        // Try text overlay undo first, then canvas undo
        if (canUndoTextOverlay()) {
          undoTextOverlay()
          addToast(t('undoRedo.toastUndoText'), 'info')
        } else if (canUndo()) {
          undo()
          addToast(t('undoRedo.toastUndo'), 'info')
          window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
        }
      }

      // Standard redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !e.altKey) {
        e.preventDefault()
        // Try text overlay redo first, then canvas redo
        if (canRedoTextOverlay()) {
          redoTextOverlay()
          addToast(t('undoRedo.toastRedoText'), 'info')
        } else if (canRedo()) {
          redo()
          addToast(t('undoRedo.toastRedo'), 'info')
          window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
        }
      }

      // Text-specific undo (Alt+Z)
      else if (e.altKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndoTextOverlay()) {
          undoTextOverlay()
        }
      }

      // Text-specific redo (Alt+Y)
      else if (e.altKey && e.key === 'y') {
        e.preventDefault()
        if (canRedoTextOverlay()) {
          redoTextOverlay()
        }
      }

      // Canvas-specific undo (Ctrl+Alt+Z)
      else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'z') {
        e.preventDefault()
        if (canUndo()) {
          undo()
          window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
        }
      }

      // Canvas-specific redo (Ctrl+Alt+Y)
      else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'y') {
        e.preventDefault()
        if (canRedo()) {
          redo()
          window.dispatchEvent(new Event('canvas:reloadCurrentPage'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    undo, redo, undoTextOverlay, redoTextOverlay,
    canUndo, canRedo, canUndoTextOverlay, canRedoTextOverlay, t
  ])
}


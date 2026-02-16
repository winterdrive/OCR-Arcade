import React, { useRef, useState } from 'react'
import { Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'


interface DropZoneProps {
    onFileSelected: (file: File) => void
    inputRef?: React.RefObject<HTMLInputElement | null>
    showCTA?: boolean
}

export function DropZone({ onFileSelected, inputRef: externalInputRef, showCTA = true }: DropZoneProps) {
    const { t } = useTranslation()
    const [isDragOver, setIsDragOver] = useState(false)
    const internalRef = useRef<HTMLInputElement>(null)
    const inputRef = externalInputRef ?? internalRef

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const handleFile = (file: File) => {
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
            onFileSelected(file)
        } else {
            alert(t('dropzone.onlyPdfImage'))
        }
    }

    // Handle Paste
    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile()
                    if (file) onFileSelected(file)
                    break
                }
            }
        }
        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    }, [onFileSelected])

    return (
        <div className="relative flex flex-col items-center justify-center p-4">
            <div
                className={cn(
                    "w-full max-w-2xl h-80 rounded-3xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group",
                    isDragOver
                        ? "bg-primary/5 scale-[1.01] shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                        : "bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:-translate-y-1"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <div className={cn(
                    "p-6 rounded-full mb-6 transition-all duration-300 group-hover:bg-primary/90 group-hover:text-white",
                    isDragOver
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-white/5 text-muted-foreground dark:text-white"
                )}>
                    <Upload size={48} />
                </div>

                <p className="text-xl font-medium text-slate-700 dark:text-slate-200 mb-3">
                    {t('dropzone.action')}
                </p>
                {showCTA && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            inputRef.current?.click()
                        }}
                        className="mb-3 px-4 py-2 bg-primary text-primary-foreground border-2 border-border shadow-[4px_4px_0_rgba(2,6,23,0.45)] text-[10px] uppercase tracking-widest"
                    >
                        {t('dropzone.cta')}
                    </button>
                )}
                <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
                    <FileText size={14} /> PDF
                    <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                    <ImageIcon size={14} /> PNG / JPG
                    <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                    <span className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/20 text-xs font-mono">Ctrl+V</span>
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={handleChange}
                />
            </div>

            <footer className="mt-4 text-sm text-slate-600 dark:text-slate-300 font-medium text-center">
                {t('dropzone.footer')}
            </footer>
        </div>
    )
}


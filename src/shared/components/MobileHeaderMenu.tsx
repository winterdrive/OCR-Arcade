import { useState, useRef, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { useTranslation } from 'react-i18next'

const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL || 'https://github.com/winterdrive/OCR-Arcade'

interface MobileHeaderMenuProps {
    children?: React.ReactNode;
}

export function MobileHeaderMenu({ children }: MobileHeaderMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { t } = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current) return
            if (!containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative sm:hidden" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 bg-card border-none hover:bg-white/10 dark:hover:bg-white/5 transition-colors rounded-lg flex items-center justify-center text-slate-800 dark:text-white"
                aria-label={isOpen ? t('menu.close') : t('menu.open')}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border-2 border-border shadow-[4px_4px_0_rgba(2,6,23,0.45)] dark:shadow-[4px_4px_0_rgba(255,0,51,0.28)] dark:bg-black/90 dark:border-stranger-red/50 animate-fade-in-up z-50 flex flex-col p-3 rounded-lg gap-3">
                    {children}

                    {/* Theme Toggle in Mobile Menu */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
                        <ThemeToggle />
                    </div>

                    {/* Language Toggle in Mobile Menu */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Language</span>
                        <LanguageToggle variant="compact" />
                    </div>

                    {/* GitHub Link in Mobile Menu */}
                    <a
                        href={GITHUB_REPO_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-2 py-2 w-full text-slate-700 dark:text-slate-300 hover:bg-primary/10 transition-colors rounded-md text-sm font-medium"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
                            <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.39 7.86 10.9.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.38.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.71 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.45.11-3.02 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.57.24 2.73.12 3.02.74.81 1.19 1.84 1.19 3.1 0 4.44-2.71 5.42-5.29 5.7.41.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.67.8.56a11.54 11.54 0 0 0 7.84-10.9C23.5 5.66 18.35.5 12 .5z" />
                        </svg>
                        GitHub Repo
                    </a>
                </div>
            )}
        </div>
    )
}

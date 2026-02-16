
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface ArcadeLogoProps {
    className?: string
    iconOnly?: boolean
    size?: 'sm' | 'md' | 'lg'
    linkTo?: string
}

export function ArcadeLogo({ className, iconOnly = false, size = 'md', linkTo = '/' }: ArcadeLogoProps) {
    const { t } = useTranslation()

    // Size mappings for container
    const sizeClasses = {
        sm: {
            container: "w-8 h-8",
            label: "text-sm",
            gap: "gap-1.5"
        },
        md: {
            container: "w-10 h-10",
            label: "text-base",
            gap: "gap-2"
        },
        lg: {
            container: "w-12 h-12",
            label: "text-2xl",
            gap: "gap-3"
        }
    }

    const s = sizeClasses[size]

    const Content = (
        <div className={cn("flex items-center group", s.gap, className)}>
            <div className={cn("relative shrink-0", s.container)}>
                {/* Light Mode Logo (Option B: Retro Beige) */}
                <svg viewBox="0 0 64 64" className="w-full h-full dark:hidden drop-shadow-sm transition-transform group-hover:scale-105">
                    <path d="M16 8 L48 8 L54 16 L54 56 L10 56 L10 16 Z" fill="#fef3c7" stroke="#d4d4d8" strokeWidth="2" />
                    <rect x="16" y="10" width="32" height="6" fill="#fae8b0" />
                    <text x="32" y="14.5" fontSize="3" textAnchor="middle" fill="#b45309" fontWeight="bold">SYSTEM</text>
                    <path d="M14 20 L50 20 L50 38 L14 38 Z" fill="#ecfccb" />
                    <text x="32" y="30" fontSize="6" textAnchor="middle" fill="#365314" fontFamily="monospace">OCR</text>
                    <path d="M10 38 L54 38 L58 44 L6 44 Z" fill="#fffbeb" />
                    {/* Joystick: Gray Stick + Red Ball (Larger) */}
                    <rect x="19" y="37" width="2" height="5" fill="#a3a3a3" />
                    <circle cx="20" cy="36" r="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
                    <circle cx="36" cy="41" r="1.5" fill="#f59e0b" />
                    <circle cx="42" cy="41" r="1.5" fill="#10b981" />
                    <rect x="28" y="48" width="8" height="6" fill="#e5e5e5" />
                    <rect x="31" y="49" width="2" height="4" fill="#a3a3a3" />
                </svg>

                {/* Dark Mode Logo (Red Variant) */}
                <svg viewBox="0 0 64 64" className="w-full h-full hidden dark:block drop-shadow-[0_0_10px_rgba(220,38,38,0.6)] transition-transform group-hover:scale-105">
                    <path d="M16 8 L48 8 L54 16 L54 56 L10 56 L10 16 Z" fill="#0f172a" stroke="#7f1d1d" strokeWidth="2" />
                    <rect x="16" y="10" width="32" height="6" fill="#450a0a" />
                    <text x="32" y="14.5" fontSize="3" textAnchor="middle" fill="#ef4444" fontWeight="bold">ARCADE</text>
                    <path d="M14 20 L50 20 L50 38 L14 38 Z" fill="#000000" />
                    <text x="32" y="30" fontSize="6" textAnchor="middle" fill="#ef4444" style={{ textShadow: "0 0 4px #dc2626" }} fontFamily="monospace">OCR</text>
                    <path d="M10 38 L54 38 L58 44 L6 44 Z" fill="#1e293b" />
                    {/* Joystick: Black Stick + Red Ball (Larger) */}
                    <rect x="19" y="37" width="2" height="5" fill="#000000" />
                    <circle cx="20" cy="36" r="3" fill="#ef4444" stroke="#991b1b" strokeWidth="0.5" />
                    <circle cx="36" cy="41" r="1.5" fill="#fca5a5" />
                    <circle cx="42" cy="41" r="1.5" fill="#fca5a5" />
                    <rect x="28" y="48" width="8" height="6" fill="#000000" />
                    <rect x="31" y="49" width="2" height="4" fill="#334155" />
                </svg>
            </div>

            {!iconOnly && (
                <span className={cn(
                    "font-bold text-slate-900 dark:text-white leading-none transition-colors",
                    s.label,
                    "font-stranger tracking-widest uppercase", // Common font style
                    "dark:text-stranger-red dark:text-shadow-stranger-sm dark:animate-stranger-flicker" // Dark mode specific effects
                )}>
                    {t('brand')}
                </span>
            )}
        </div>
    )

    if (linkTo) {
        return (
            <Link to={linkTo} className="hover:opacity-90 transition-opacity block">
                {Content}
            </Link>
        )
    }

    return Content
}

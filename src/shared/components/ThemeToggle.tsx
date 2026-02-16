import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/shared/store/themeStore'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
    const { t } = useTranslation()
    const { theme, toggleTheme } = useThemeStore()

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative p-2 rounded-lg transition-all duration-300",
                "hover:bg-white/10 active:scale-95",
                "border border-white/10 hover:border-white/20"
            )}
            title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            aria-label={t('theme.toggle')}
        >
            {/* Icon Container with rotation animation */}
            <div className="relative w-5 h-5">
                {/* Sun Icon */}
                <Sun
                    size={20}
                    className={cn(
                        "absolute inset-0 transition-all duration-300",
                        theme === 'light'
                            ? "rotate-0 scale-100 opacity-100 text-yellow-500"
                            : "rotate-90 scale-0 opacity-0 text-white/50"
                    )}
                />
                {/* Moon Icon */}
                <Moon
                    size={20}
                    className={cn(
                        "absolute inset-0 transition-all duration-300",
                        theme === 'dark'
                            ? "rotate-0 scale-100 opacity-100 text-blue-400"
                            : "-rotate-90 scale-0 opacity-0 text-white/50"
                    )}
                />
            </div>
        </button>
    )
}


import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeStore {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            theme: 'light',
            toggleTheme: () => set((state) => {
                const newTheme = state.theme === 'light' ? 'dark' : 'light'
                // Update document class
                const root = document.documentElement
                if (newTheme === 'light') {
                    root.classList.remove('dark')
                    root.classList.add('light')
                } else {
                    root.classList.remove('light')
                    root.classList.add('dark')
                }
                return { theme: newTheme }
            }),
            setTheme: (theme) => set(() => {
                // Update document class
                const root = document.documentElement
                if (theme === 'light') {
                    root.classList.remove('dark')
                    root.classList.add('light')
                } else {
                    root.classList.remove('light')
                    root.classList.add('dark')
                }
                return { theme }
            }),
        }),
        {
            name: 'ocr-arcade-theme',
            onRehydrateStorage: () => (state) => {
                // Apply theme on initial load
                const root = document.documentElement
                if (state?.theme === 'light') {
                    root.classList.remove('dark')
                    root.classList.add('light')
                } else {
                    root.classList.remove('light')
                    root.classList.add('dark')
                }
            },
        }
    )
)

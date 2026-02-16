import { create } from 'zustand'

export interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}

export interface LoadingState {
    isLoading: boolean
    message: string
    progress?: number
}

interface ToastStore {
    toasts: Toast[]
    addToast: (message: string, type: Toast['type']) => void
    removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (message, type) => {
        const id = Math.random().toString(36).substr(2, 9)
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }))
        // Auto-remove after 3 seconds
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }))
        }, 3000)
    },
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    }))
}))

interface LoadingStore {
    loadingState: LoadingState
    setLoading: (isLoading: boolean, message?: string, progress?: number) => void
}

export const useLoadingStore = create<LoadingStore>((set) => ({
    loadingState: {
        isLoading: false,
        message: '',
        progress: undefined
    },
    setLoading: (isLoading, message = '', progress) => set({
        loadingState: { isLoading, message, progress }
    })
}))

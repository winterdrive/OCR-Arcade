import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useLoadingStore } from '@/shared/store/feedbackStore'

export function LoadingOverlay() {
    const { loadingState } = useLoadingStore()

    return (
        <AnimatePresence>
            {loadingState.isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
                >
                    <div className="glass-card p-8 rounded-2xl flex flex-col items-center max-w-md w-full">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="mb-6 text-primary"
                        >
                            <Loader2 size={48} />
                        </motion.div>

                        <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
                            {loadingState.message}
                        </h3>

                        {loadingState.progress !== undefined && (
                            <>
                                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-4 relative">
                                    <motion.div
                                        className="absolute top-0 left-0 h-full bg-primary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${loadingState.progress}%` }}
                                        transition={{ duration: 0.2 }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 font-mono text-right w-full">
                                    {Math.round(loadingState.progress)}%
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}


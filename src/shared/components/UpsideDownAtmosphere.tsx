import { useEffect, useState } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

const UpsideDownAtmosphere = () => {
    const isDark = useDarkMode();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className={`fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-1000 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
            {/* 1. Film Grain / Noise Layer */}
            <div
                className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    transform: 'scale(1.5)',
                }}
            />

            {/* 2. Vignette (Dark Corners) */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 6, 23, 0.4) 100%)',
                }}
            />

            {/* 3. Red Tint / Atmosphere Gradient */}
            <div
                className="absolute inset-0 mix-blend-soft-light opacity-20"
                style={{
                    background: 'radial-gradient(circle at 50% 30%, rgba(255, 0, 51, 0.1), transparent 60%)',
                }}
            />

            {/* 4. Scanlines (Subtle) */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, black 3px)',
                    backgroundSize: '100% 4px'
                }}
            />

        </div>
    );
};

export default UpsideDownAtmosphere;

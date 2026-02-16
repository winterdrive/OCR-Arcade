import { usePetBehavior } from './usePetBehavior';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const eyeDetectionCache = new Map<string, { xPct: number; yPct: number }>();
const animationAssetCache = new Map<string, Promise<string>>();
const TROT_PETS = new Set(['black_bear', 'muntjac', 'leopard_cat']);
const EYE_POSITIONS_BY_FRAME: Record<string, { xPct: number; yPct: number }> = {
    // black bear
    'black_bear_walk_v2_frame_0.png': { xPct: 61.2, yPct: 33.8 },
    'black_bear_walk_v2_frame_1.png': { xPct: 60.4, yPct: 33.2 },
    'black_bear_walk_v2_frame_2.png': { xPct: 61.6, yPct: 34.1 },
    'black_bear_walk_v2_frame_3.png': { xPct: 60.8, yPct: 33.5 },
    // muntjac
    'muntjac_walk_frame_0.png': { xPct: 60.1, yPct: 31.5 },
    'muntjac_walk_frame_1.png': { xPct: 59.4, yPct: 31.1 },
    'muntjac_walk_frame_2.png': { xPct: 60.6, yPct: 31.8 },
    'muntjac_walk_frame_3.png': { xPct: 59.9, yPct: 31.3 },
    // leopard cat
    'leopard_cat_walk_frame_0.png': { xPct: 62.4, yPct: 33.6 },
    'leopard_cat_walk_frame_1.png': { xPct: 61.8, yPct: 33.2 },
    'leopard_cat_walk_frame_2.png': { xPct: 62.9, yPct: 33.9 },
    'leopard_cat_walk_frame_3.png': { xPct: 62.2, yPct: 33.4 },
    // hare
    'hare_walk_frame_0.png': { xPct: 60.3, yPct: 34.2 },
    'hare_walk_frame_1.png': { xPct: 59.8, yPct: 33.9 },
    'hare_walk_frame_2.png': { xPct: 60.6, yPct: 34.5 },
    'hare_walk_frame_3.png': { xPct: 60.1, yPct: 34.1 },
    // salamander
    'salamander_walk_frame_0.png': { xPct: 57.2, yPct: 36.5 },
    'salamander_walk_frame_1.png': { xPct: 56.8, yPct: 36.1 },
    'salamander_walk_frame_2.png': { xPct: 57.5, yPct: 36.8 },
    'salamander_walk_frame_3.png': { xPct: 57.0, yPct: 36.3 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resolveAnimationAsset = async (src: string): Promise<string> => {
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) {
        return src;
    }

    const cached = animationAssetCache.get(src);
    if (cached) return cached;

    const promise = (async () => {
        try {
            const response = await fetch(src);
            if (!response.ok) return src;
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch {
            return src;
        }
    })();

    animationAssetCache.set(src, promise);
    return promise;
};

const detectEyePosition = async (src: string): Promise<{ xPct: number; yPct: number }> => {
    const cached = eyeDetectionCache.get(src);
    if (cached) return cached;

    const img = new Image();
    img.src = src;
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        const fallback = { xPct: 58, yPct: 35 };
        eyeDetectionCache.set(src, fallback);
        return fallback;
    }

    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasOpaque = false;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];
            if (a > 40) {
                hasOpaque = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (!hasOpaque) {
        const fallback = { xPct: 58, yPct: 35 };
        eyeDetectionCache.set(src, fallback);
        return fallback;
    }

    const boxW = Math.max(1, maxX - minX + 1);
    const boxH = Math.max(1, maxY - minY + 1);

    const roiLeft = Math.floor(minX + boxW * 0.42);
    const roiRight = Math.floor(minX + boxW * 0.94);
    const roiTop = Math.floor(minY + boxH * 0.12);
    const roiBottom = Math.floor(minY + boxH * 0.5);

    let bestScore = -Infinity;
    let bestX = Math.floor(minX + boxW * 0.58);
    let bestY = Math.floor(minY + boxH * 0.35);

    for (let y = roiTop; y <= roiBottom; y++) {
        for (let x = roiLeft; x <= roiRight; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (a < 60) continue;

            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const darkness = 255 - luminance;
            const xBias = (x - roiLeft) / Math.max(1, roiRight - roiLeft); // prefer front side
            const yBias = 1 - Math.abs(((y - roiTop) / Math.max(1, roiBottom - roiTop)) - 0.45);
            const score = darkness * 0.72 + a * 0.22 + xBias * 20 + yBias * 12;

            if (score > bestScore) {
                bestScore = score;
                bestX = x;
                bestY = y;
            }
        }
    }

    const result = {
        xPct: clamp((bestX / width) * 100, 0, 100),
        yPct: clamp((bestY / height) * 100, 0, 100),
    };
    eyeDetectionCache.set(src, result);
    return result;
};

// Simple window size hook
const useWindowSizeLocal = () => {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
};

// Dark Mode Hook
const useDarkMode = () => {
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
};

export interface PetProps {
    id: string;
    imageSrc: string; // Path to static pixel art asset (fallback)
    initialX?: number;
    initialY?: number;
    name: string;
    frameCount?: number; // For Sprite Sheet
    frames?: string[]; // New: For individual frame files
    interactive?: boolean;
    speed?: number;
    edgeCorridor?: boolean;
    corridorWidth?: number;
    blockedInsets?: { top?: number; right?: number; bottom?: number; left?: number };
    avoidPositions?: () => { x: number; y: number }[];
    minDistance?: number;
    onPositionChange?: (pos: { x: number; y: number }) => void;
    size?: number; // New size prop
    fadeZones?: DOMRect[];
    fadeInZonesOpacity?: number;
}

const DEFAULT_PET_SIZE = 100;
const WALK_EPSILON = 0.08;

export const Pet = ({
    id,
    imageSrc,
    initialX,
    initialY,
    name,
    frameCount = 1,
    frames,
    interactive = true,
    speed = 1.5,
    edgeCorridor = false,
    corridorWidth = 80,
    blockedInsets,
    avoidPositions,
    minDistance,
    onPositionChange,
    size = DEFAULT_PET_SIZE,
    fadeZones,
    fadeInZonesOpacity = 0.42
}: PetProps) => {
    const { t } = useTranslation();
    const [isHovered, setIsHovered] = useState(false);
    const [eyeDotPos, setEyeDotPos] = useState<{ xPct: number; yPct: number } | null>(null);
    const { width, height } = useWindowSizeLocal();
    const isDark = useDarkMode(); // Detect Dark Mode
    const bounds = { width, height };

    const useDarkVariant = false;
    const shouldShowRedEyeDot = isDark;

    // Determine current assets based on theme.
    // Keep dark variant only for black bear to avoid over-red faces/neck and white edge artifacts on other pets.
    const currentFrames = useDarkVariant && frames
        ? frames.map(f => f.replace('_frame_', '_dark_frame_'))
        : frames;

    const currentImageSrc = useDarkVariant
        ? imageSrc.replace('.png', '_dark.png')
        : imageSrc;
    const [resolvedFrameSources, setResolvedFrameSources] = useState<string[] | null>(null);
    const [resolvedImageSource, setResolvedImageSource] = useState(currentImageSrc);

    // Initialize with provided pos or random
    const startPos = {
        x: initialX ?? Math.random() * (width - 100),
        y: initialY ?? Math.random() * (height - 100)
    };

    const { position, state, direction, stop, resume, startDrag } = usePetBehavior({
        initialPosition: startPos,
        bounds,
        speed,
        edgeCorridor,
        corridorWidth,
        blockedInsets,
        avoidPositions,
        minDistance: minDistance ?? (size + 20)
    });

    useEffect(() => {
        onPositionChange?.(position);
    }, [position, onPositionChange]);

    const centerX = position.x + size / 2;
    const centerY = position.y + size / 2;
    const isInFadeZone = !!fadeZones?.some(
        (zone) =>
            centerX >= zone.left &&
            centerX <= zone.right &&
            centerY >= zone.top &&
            centerY <= zone.bottom
    );
    const visualOpacity = state === 'hidden' ? 0 : (isInFadeZone ? fadeInZonesOpacity : 1);

    // Animation State
    const [frameIndex, setFrameIndex] = useState(0);
    const frameRef = useRef(0);
    const cycleIndexRef = useRef(0);
    const movementAccumulatorRef = useRef(0);
    const lastPositionRef = useRef(startPos);

    // Determine animation mode
    const isFrameAnimation = currentFrames && currentFrames.length > 1; // Use currentFrames
    const isSpriteSheet = frameCount > 1 && !isFrameAnimation;
    const isAnimated = isSpriteSheet || isFrameAnimation;
    const activeFrameOriginalSrc = isFrameAnimation ? currentFrames?.[frameIndex] : currentImageSrc;
    const activeFrameRenderSrc = isFrameAnimation
        ? (resolvedFrameSources?.[frameIndex] || currentFrames?.[frameIndex])
        : resolvedImageSource;
    const totalFrames = isFrameAnimation ? currentFrames!.length : frameCount;
    const walkCycle = useMemo(() => {
        if (totalFrames <= 1) return [0];
        if (TROT_PETS.has(id) && totalFrames >= 4) {
            // Diagonal gait (trot): LF+RH <-> LH+RF alternating.
            // Use a 4-pose cycle to keep the motion cross-linked and readable.
            return [0, 2, 1, 3];
        }
        if (totalFrames === 2) return [0, 1];
        if (totalFrames === 3) return [0, 1, 2, 1];
        return [0, 1, 2, 3, 2, 1];
    }, [id, totalFrames]);

    useEffect(() => {
        let cancelled = false;

        const hydrateAssets = async () => {
            const nextImageSource = await resolveAnimationAsset(currentImageSrc);
            if (!cancelled) {
                setResolvedImageSource(nextImageSource);
            }

            if (isFrameAnimation && currentFrames && currentFrames.length > 0) {
                const hydratedFrames = await Promise.all(currentFrames.map((src) => resolveAnimationAsset(src)));
                if (!cancelled) {
                    setResolvedFrameSources(hydratedFrames);
                }
                return;
            }

            if (!cancelled) {
                setResolvedFrameSources(null);
            }
        };

        hydrateAssets();
        return () => {
            cancelled = true;
        };
    }, [currentImageSrc, isFrameAnimation, currentFrames]);

    useEffect(() => {
        if (!isAnimated || state === 'hidden') {
            setFrameIndex(0);
            frameRef.current = 0;
            cycleIndexRef.current = 0;
            movementAccumulatorRef.current = 0;
            return;
        }

        const prev = lastPositionRef.current;
        const dx = position.x - prev.x;
        const dy = position.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        lastPositionRef.current = position;

        const movingNow = distance > WALK_EPSILON && state !== 'dragged';

        if (!movingNow) {
            movementAccumulatorRef.current = 0;
            cycleIndexRef.current = 0;
            if (frameRef.current !== 0) {
                frameRef.current = 0;
                setFrameIndex(0);
            }
            return;
        }

        const stepThreshold = clamp(size * 0.012, 0.8, 2.2);
        movementAccumulatorRef.current += distance;
        while (movementAccumulatorRef.current >= stepThreshold) {
            movementAccumulatorRef.current -= stepThreshold;
            cycleIndexRef.current = (cycleIndexRef.current + 1) % walkCycle.length;
            const nextFrame = walkCycle[cycleIndexRef.current] % totalFrames;
            if (nextFrame !== frameRef.current) {
                frameRef.current = nextFrame;
                setFrameIndex(nextFrame);
            }
        }
    }, [position, state, isAnimated, size, totalFrames, walkCycle]);

    useEffect(() => {
        let cancelled = false;
        if (!shouldShowRedEyeDot || !activeFrameRenderSrc) {
            setEyeDotPos(null);
            return;
        }

        const frameName = (activeFrameOriginalSrc || '').split('/').pop() || activeFrameOriginalSrc || '';
        const mapped = EYE_POSITIONS_BY_FRAME[frameName];
        if (mapped) {
            setEyeDotPos(mapped);
            return;
        }

        detectEyePosition(activeFrameRenderSrc)
            .then((pos) => {
                if (!cancelled) setEyeDotPos(pos);
            })
            .catch(() => {
                if (!cancelled) setEyeDotPos({ xPct: 58, yPct: 35 });
            });

        return () => {
            cancelled = true;
        };
    }, [shouldShowRedEyeDot, activeFrameOriginalSrc, activeFrameRenderSrc]);

    const handleMouseEnter = () => {
        if (interactive) {
            stop();
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        if (interactive) {
            resume();
            setIsHovered(false);
        }
    };

    return (
        <div
            className={`absolute z-10 select-none transition-transform will-change-transform ${state === 'dragged' ? 'cursor-grabbing scale-110' : 'cursor-grab'
                }`}
            style={{
                left: 0,
                top: 0,
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                pointerEvents: interactive ? 'auto' : 'none',
                width: `${size}px`,
                height: `${size}px`,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={interactive ? startDrag : undefined}
            onTouchStart={interactive ? startDrag : undefined}
        >
            {/* Greeting Speech Bubble */}
            {isHovered && state !== 'hidden' && (
                <div className="absolute bottom-[100%] left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-[13px] font-semibold rounded-lg shadow-[0_8px_24px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 dark:ring-slate-700/80 opacity-100 whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200 border border-slate-300 dark:border-slate-700">
                    {t('pets.greeting', { name })}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-white dark:border-t-slate-700" />
                </div>
            )}

            <div
                className="w-full h-full"
                style={{
                    transform: `scaleX(${direction === 'left' ? -1 : 1})`,
                    opacity: visualOpacity,
                    imageRendering: 'pixelated',
                    // Mode 1: Sprite Sheet Styling (CSS Background)
                    ...(isSpriteSheet ? {
                        backgroundImage: `url(${currentImageSrc})`, // Use currentImageSrc
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${frameCount * size}px ${size}px`,
                        backgroundPosition: `-${frameIndex * size}px 0`,
                    } : {}),
                }}
            >
                {/* Mode 2: Individual Frames (IMG Tag) */}
                {isFrameAnimation && (
                    <div className="relative w-full h-full pointer-events-none">
                        {(resolvedFrameSources || currentFrames || []).map((frameSrc, idx) => (
                            <img
                                key={`${id}-frame-${idx}`}
                                src={frameSrc}
                                alt={name}
                                className="absolute inset-0 w-full h-full object-contain pet-sprite"
                                draggable={false}
                                style={{
                                    opacity: idx === frameIndex ? 1 : 0
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Mode 3: Static Image (Fallback) */}
                {!isAnimated && (
                    <img
                        src={resolvedImageSource}
                        alt={name}
                        className="w-full h-full object-contain pointer-events-none pet-sprite"
                        draggable={false}
                    />
                )}

                {/* Night mode eye effect for non-bear pets: single-dot red eye only */}
                {shouldShowRedEyeDot && eyeDotPos && (
                    <span
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            top: `${eyeDotPos.yPct}%`,
                            left: `${eyeDotPos.xPct}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '1px',
                            height: '1px',
                            backgroundColor: 'rgba(255, 44, 78, 0.95)',
                            boxShadow: '0 0 2px rgba(255, 44, 78, 0.75)',
                        }}
                    />
                )}

            </div>
        </div>
    );
};

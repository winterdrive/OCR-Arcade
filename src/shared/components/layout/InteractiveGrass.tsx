import { useEffect, useRef, useState } from 'react';

type BladeShade = 'dark' | 'mid' | 'light';
type TipStyle = 'single' | 'fork' | 'hook';

interface GrassBlade {
    dx: number;
    heightPx: number;
    lean: number;
    shade: BladeShade;
    tipStyle: TipStyle;
}

interface GrassTuft {
    x: number;
    y: number;
    shapeId: number;
    blades: GrassBlade[];
    phase: number;
    speed: number;
    swayAmpPx: number;
    anchorStiffness: number;
}

const BG_COLOR = '#f0fdf4';
const PIXEL = 2;
const DENSITY = 0.00008;
const MAX_TUFTS = 280;
const GRASS_SCALE = 1.75;
const LEAN_SCALE = 1.2;
const SHADES: Record<BladeShade, string> = {
    dark: '#5b9f62',
    mid: '#7fbe78',
    light: '#a6d89a',
};

const SHAPE_WEIGHTS = [
    { id: 0, weight: 1.1 }, // V-split
    { id: 1, weight: 1.05 }, // Triple-fan
    { id: 2, weight: 1.0 }, // Asymmetric-3
    { id: 3, weight: 0.85 }, // Needle-pair
    { id: 4, weight: 1.0 }, // Center-tall
    { id: 5, weight: 1.0 }, // Low-clump
    { id: 6, weight: 0.8 }, // Hook-tip
    { id: 7, weight: 0.9 }, // Sparse-4
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const scaleHeight = (value: number) => Math.max(3, Math.round(value * GRASS_SCALE));
const scaleOffset = (value: number) => value * GRASS_SCALE;
const scaleLean = (value: number) => value * LEAN_SCALE;

const weightedPickShape = (forbidden: Set<number>) => {
    const allowed = SHAPE_WEIGHTS.filter((item) => !forbidden.has(item.id));
    const source = allowed.length > 0 ? allowed : SHAPE_WEIGHTS;
    const total = source.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * total;
    for (const item of source) {
        r -= item.weight;
        if (r <= 0) return item.id;
    }
    return source[source.length - 1].id;
};

const buildShape = (shapeId: number): Omit<GrassBlade, 'shade'>[] => {
    switch (shapeId) {
        case 0: // V-split
            return [
                { dx: scaleOffset(-1.5), heightPx: scaleHeight(5), lean: scaleLean(-0.12), tipStyle: 'single' },
                { dx: scaleOffset(1.5), heightPx: scaleHeight(5), lean: scaleLean(0.12), tipStyle: 'single' },
            ];
        case 1: // Triple-fan
            return [
                { dx: scaleOffset(-2), heightPx: scaleHeight(4), lean: scaleLean(-0.08), tipStyle: 'fork' },
                { dx: scaleOffset(0), heightPx: scaleHeight(7), lean: scaleLean(0.02), tipStyle: 'single' },
                { dx: scaleOffset(2), heightPx: scaleHeight(5), lean: scaleLean(0.1), tipStyle: 'single' },
            ];
        case 2: // Asymmetric-3
            return [
                { dx: scaleOffset(-1.5), heightPx: scaleHeight(6), lean: scaleLean(-0.12), tipStyle: 'single' },
                { dx: scaleOffset(0.5), heightPx: scaleHeight(4), lean: scaleLean(0.04), tipStyle: 'fork' },
                { dx: scaleOffset(2), heightPx: scaleHeight(5), lean: scaleLean(0.18), tipStyle: 'single' },
            ];
        case 3: // Needle-pair
            return [
                { dx: scaleOffset(-0.8), heightPx: scaleHeight(8), lean: scaleLean(-0.06), tipStyle: 'single' },
                { dx: scaleOffset(0.8), heightPx: scaleHeight(7), lean: scaleLean(0.09), tipStyle: 'hook' },
            ];
        case 4: // Center-tall
            return [
                { dx: scaleOffset(-2.2), heightPx: scaleHeight(4), lean: scaleLean(-0.06), tipStyle: 'single' },
                { dx: scaleOffset(0), heightPx: scaleHeight(9), lean: scaleLean(0.03), tipStyle: 'single' },
                { dx: scaleOffset(2.2), heightPx: scaleHeight(4), lean: scaleLean(0.08), tipStyle: 'single' },
            ];
        case 5: // Low-clump
            return [
                { dx: scaleOffset(-2), heightPx: scaleHeight(4), lean: scaleLean(-0.1), tipStyle: 'fork' },
                { dx: scaleOffset(-0.8), heightPx: scaleHeight(5), lean: scaleLean(-0.02), tipStyle: 'single' },
                { dx: scaleOffset(0.6), heightPx: scaleHeight(4), lean: scaleLean(0.08), tipStyle: 'single' },
                { dx: scaleOffset(1.8), heightPx: scaleHeight(3), lean: scaleLean(0.12), tipStyle: 'single' },
            ];
        case 6: // Hook-tip
            return [
                { dx: scaleOffset(-1.2), heightPx: scaleHeight(5), lean: scaleLean(-0.08), tipStyle: 'single' },
                { dx: scaleOffset(0.2), heightPx: scaleHeight(7), lean: scaleLean(0.16), tipStyle: 'hook' },
                { dx: scaleOffset(1.8), heightPx: scaleHeight(4), lean: scaleLean(0.08), tipStyle: 'fork' },
            ];
        case 7: // Sparse-4
            return [
                { dx: scaleOffset(-2.8), heightPx: scaleHeight(3), lean: scaleLean(-0.1), tipStyle: 'single' },
                { dx: scaleOffset(-0.8), heightPx: scaleHeight(6), lean: scaleLean(-0.04), tipStyle: 'single' },
                { dx: scaleOffset(1), heightPx: scaleHeight(5), lean: scaleLean(0.1), tipStyle: 'fork' },
                { dx: scaleOffset(2.8), heightPx: scaleHeight(4), lean: scaleLean(0.14), tipStyle: 'single' },
            ];
        default:
            return [{ dx: scaleOffset(0), heightPx: scaleHeight(5), lean: scaleLean(0), tipStyle: 'single' }];
    }
};

const assignShades = (shape: Omit<GrassBlade, 'shade'>[]): GrassBlade[] => {
    const withCenter = [...shape].sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));
    const centerRef = withCenter[0];
    const centerDx = centerRef?.dx ?? 0;
    const centerShade: BladeShade = Math.random() > 0.5 ? 'dark' : 'mid';
    let hasLight = false;
    let hasDark = centerShade === 'dark';

    const blades = shape.map((blade) => {
        if (blade.dx === centerDx) {
            return { ...blade, shade: centerShade };
        }

        let shade: BladeShade;
        const sideBias = Math.abs(blade.dx) >= 2 ? 0.72 : 0.45;
        if (Math.random() < sideBias) {
            shade = 'light';
        } else {
            shade = Math.random() < 0.6 ? 'mid' : 'dark';
        }

        hasLight = hasLight || shade === 'light';
        hasDark = hasDark || shade === 'dark';
        return { ...blade, shade };
    });

    if (!hasLight && blades.length > 1) {
        blades[blades.length - 1].shade = 'light';
    }
    if (!hasDark && blades.length > 1) {
        blades[0].shade = 'dark';
    }

    return blades;
};

const createTuft = (x: number, y: number, shapeId: number): GrassTuft => ({
    x,
    y,
    shapeId,
    blades: assignShades(buildShape(shapeId)),
    phase: randomBetween(0, Math.PI * 2),
    speed: randomBetween(0.0009, 0.0019),
    swayAmpPx: randomBetween(1.1, 3.1),
    anchorStiffness: randomBetween(0.76, 0.92),
});

const drawTip = (
    ctx: CanvasRenderingContext2D,
    tipStyle: TipStyle,
    unitX: number,
    unitY: number,
    swayDirection: number,
    color: string
) => {
    ctx.fillStyle = color;
    const pxX = unitX * PIXEL;
    const pxY = unitY * PIXEL;
    const tipOffset = swayDirection >= 0 ? 1 : -1;

    if (tipStyle === 'fork') {
        ctx.fillRect((unitX - 1) * PIXEL, pxY, PIXEL, PIXEL);
        ctx.fillRect((unitX + 1) * PIXEL, pxY, PIXEL, PIXEL);
        return;
    }
    if (tipStyle === 'hook') {
        ctx.fillRect((unitX + tipOffset) * PIXEL, (unitY - 1) * PIXEL, PIXEL, PIXEL);
    }
    ctx.fillRect(pxX, pxY, PIXEL, PIXEL);
};

const drawTuft = (ctx: CanvasRenderingContext2D, tuft: GrassTuft, time: number) => {
    const wind = Math.sin(time * tuft.speed + tuft.phase);
    const tipOffset = wind * tuft.swayAmpPx;

    ctx.save();
    ctx.translate(Math.round(tuft.x), Math.round(tuft.y));

    for (const blade of tuft.blades) {
        const color = SHADES[blade.shade];
        const height = blade.heightPx;
        const exponent = 1.8 + tuft.anchorStiffness * 1.25;

        for (let row = 0; row < height; row++) {
            const progress = row / Math.max(1, height - 1);
            const dynamicOffset = tipOffset * Math.pow(progress, exponent);
            const staticLeanOffset = blade.lean * row;
            const unitX = Math.round(blade.dx + staticLeanOffset + dynamicOffset);
            const unitY = -row;
            const maxWidthUnits = height >= 12 ? 3 : 2;
            const flow = Math.pow(1 - progress, 1.6);
            let rowWidthUnits = Math.max(1, Math.round(1 + flow * (maxWidthUnits - 1)));
            if (progress > 0.78) rowWidthUnits = 1;
            const leftUnit = unitX - Math.floor(rowWidthUnits / 2);

            ctx.fillStyle = color;
            ctx.fillRect(leftUnit * PIXEL, unitY * PIXEL, rowWidthUnits * PIXEL, PIXEL);

            if (row === height - 1) {
                drawTip(ctx, blade.tipStyle, unitX, unitY, dynamicOffset, color);
            }
        }
    }

    // Keep the base visually stable and slightly grounded.
    const baseOffset = Math.round((GRASS_SCALE - 1) * 1);
    ctx.fillStyle = SHADES.mid;
    ctx.fillRect((-1 - baseOffset) * PIXEL, 0, (2 + baseOffset) * PIXEL, PIXEL);
    if (tuft.shapeId % 2 === 0) {
        ctx.fillStyle = SHADES.light;
        ctx.fillRect((1 + baseOffset) * PIXEL, 0, PIXEL, PIXEL);
    }

    ctx.restore();
};

export const InteractiveGrass = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Detect Dark Mode (Theme)
    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
        };

        // Check initially
        checkDarkMode();

        // Observer for class changes on <html>
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || isDarkMode) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;
        let tufts: GrassTuft[] = [];
        let viewWidth = 0;
        let viewHeight = 0;

        const initGrass = () => {
            viewWidth = window.innerWidth;
            viewHeight = window.innerHeight;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(viewWidth * dpr);
            canvas.height = Math.floor(viewHeight * dpr);
            canvas.style.width = `${viewWidth}px`;
            canvas.style.height = `${viewHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const area = viewWidth * viewHeight;
            const target = clamp(Math.floor(area * DENSITY), 24, MAX_TUFTS);
            const cellSize = Math.max(28, Math.sqrt(area / target));
            const cols = Math.max(1, Math.floor(viewWidth / cellSize));
            const rows = Math.max(1, Math.floor(viewHeight / cellSize));
            const neighborShape = new Map<string, number>();
            const recentShapes: number[] = [];
            const nextTufts: GrassTuft[] = [];

            for (let row = 0; row < rows && nextTufts.length < target; row++) {
                for (let col = 0; col < cols && nextTufts.length < target; col++) {
                    if (Math.random() > 0.88) continue;

                    const x = (col + randomBetween(0.18, 0.82)) * cellSize;
                    const y = (row + randomBetween(0.2, 0.84)) * cellSize;
                    if (x >= viewWidth || y >= viewHeight) continue;

                    const forbidden = new Set<number>();
                    const nearKeys = [
                        `${col - 1},${row}`,
                        `${col},${row - 1}`,
                        `${col - 1},${row - 1}`,
                        `${col + 1},${row - 1}`,
                    ];
                    nearKeys.forEach((key) => {
                        const shape = neighborShape.get(key);
                        if (shape !== undefined) forbidden.add(shape);
                    });

                    if (recentShapes.length >= 2) {
                        const tail = recentShapes.slice(-2);
                        if (tail[0] === tail[1]) forbidden.add(tail[0]);
                    }

                    let shapeId = weightedPickShape(forbidden);
                    if (recentShapes.length >= 2) {
                        const tail = recentShapes.slice(-2);
                        if (tail[0] === tail[1] && tail[1] === shapeId) {
                            shapeId = weightedPickShape(new Set<number>([shapeId]));
                        }
                    }

                    neighborShape.set(`${col},${row}`, shapeId);
                    recentShapes.push(shapeId);
                    if (recentShapes.length > 4) recentShapes.shift();

                    nextTufts.push(createTuft(x, y, shapeId));
                }
            }

            while (nextTufts.length < target) {
                const x = randomBetween(0, viewWidth);
                const y = randomBetween(0, viewHeight);
                const shapeId = weightedPickShape(new Set<number>());
                nextTufts.push(createTuft(x, y, shapeId));
            }

            tufts = nextTufts;
        };

        const render = () => {
            ctx.fillStyle = BG_COLOR;
            ctx.fillRect(0, 0, viewWidth, viewHeight);

            const time = performance.now();

            tufts.forEach(tuft => {
                drawTuft(ctx, tuft, time);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            initGrass();
        };

        window.addEventListener('resize', handleResize);
        initGrass();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isDarkMode]);

    if (isDarkMode) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none'
            }}
        />
    );
};

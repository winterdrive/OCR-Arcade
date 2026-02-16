import { useEffect, useRef } from 'react';
import { useDarkMode } from '@/shared/hooks/useDarkMode';

interface DustParticle {
    x: number;
    y: number;
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    driftX: number;
    driftY: number;
    wobbleAmpX: number;
    wobbleAmpY: number;
    wobbleFreq: number;
    wobblePhase: number;
    size: number;
    alpha: number;
    rot: number;
    rotSpeed: number;
    radii: number[];
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const createParticle = (width: number, height: number): DustParticle => {
    const points = 5 + Math.floor(Math.random() * 3); // 5~7 points for irregular shape
    const base = randomBetween(1.4, 3.6);
    return {
        x: randomBetween(0, width),
        y: randomBetween(0, height),
        ox: randomBetween(0, width),
        oy: randomBetween(0, height),
        vx: randomBetween(-0.1, 0.1),
        vy: randomBetween(-0.14, -0.03),
        driftX: randomBetween(-0.08, 0.08),
        driftY: randomBetween(-0.14, 0.08),
        wobbleAmpX: randomBetween(7, 18),
        wobbleAmpY: randomBetween(9, 22),
        wobbleFreq: randomBetween(0.00065, 0.0018),
        wobblePhase: randomBetween(0, Math.PI * 2),
        size: base,
        alpha: randomBetween(0.2, 0.6),
        rot: randomBetween(0, Math.PI * 2),
        rotSpeed: randomBetween(-0.01, 0.01),
        radii: Array.from({ length: points }, () => randomBetween(0.65, 1.28)),
    };
};

const drawIrregularDust = (ctx: CanvasRenderingContext2D, p: DustParticle) => {
    const pointCount = p.radii.length;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    for (let i = 0; i < pointCount; i++) {
        const angle = (Math.PI * 2 * i) / pointCount;
        const radius = p.size * p.radii[i];
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

export const UpsideDownDustLayer = () => {
    const isDark = useDarkMode();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isDark) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let rafId = 0;
        let width = 0;
        let height = 0;
        let dpr = 1;
        let particles: DustParticle[] = [];
        const mouse = { x: -9999, y: -9999, active: false };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.max(90, Math.min(180, Math.floor((width * height) / 18000)));
            particles = Array.from({ length: count }, () => createParticle(width, height));
        };

        const onMouseMove = (event: MouseEvent) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
            mouse.active = true;
        };

        const onMouseLeave = () => {
            mouse.active = false;
            mouse.x = -9999;
            mouse.y = -9999;
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.25)';
            ctx.shadowBlur = 2;

            const now = performance.now();
            const repelRadius = 145;
            const repelRadiusSq = repelRadius * repelRadius;

            for (const p of particles) {
                const wobbleX = Math.sin(now * p.wobbleFreq + p.wobblePhase) * p.wobbleAmpX;
                const wobbleY = Math.cos(now * p.wobbleFreq * 0.82 + p.wobblePhase) * p.wobbleAmpY;
                p.vx += p.driftX * 0.015;
                p.vy += p.driftY * 0.015;

                if (mouse.active) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 0 && distSq < repelRadiusSq) {
                        const dist = Math.sqrt(distSq);
                        const force = (1 - dist / repelRadius) * 1.05;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        p.vx += nx * force * 0.11;
                        p.vy += ny * force * 0.11;
                    }
                }

                p.vx *= 0.986;
                p.vy *= 0.986;
                p.vx = Math.max(-0.72, Math.min(0.72, p.vx));
                p.vy = Math.max(-0.76, Math.min(0.76, p.vy));

                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotSpeed;
                p.x += wobbleX * 0.022;
                p.y += wobbleY * 0.022;

                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10;
                if (p.y > height + 10) p.y = -10;

                const shimmer = 0.76 + 0.24 * Math.sin(now * p.wobbleFreq * 1.9 + p.wobblePhase);
                ctx.globalAlpha = p.alpha * shimmer;
                drawIrregularDust(ctx, p);
            }

            ctx.globalAlpha = 1;
            rafId = requestAnimationFrame(animate);
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseleave', onMouseLeave);
        rafId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseleave', onMouseLeave);
            cancelAnimationFrame(rafId);
        };
    }, [isDark]);

    if (!isDark) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[10000]"
            style={{ background: 'transparent' }}
            aria-hidden="true"
        />
    );
};

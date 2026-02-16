import { useState, useEffect, useRef, useCallback } from 'react';

type PetState = 'idle' | 'walking' | 'dragged' | 'hidden';
type Direction = 'left' | 'right';

interface Position {
    x: number;
    y: number;
}

const PET_SIZE = 80;
const OFFSCREEN_MARGIN = 80;

interface UsePetBehaviorProps {
    initialPosition?: Position;
    speed?: number;
    bounds?: { width: number; height: number };
    edgeCorridor?: boolean;
    corridorWidth?: number;
    blockedInsets?: { top?: number; right?: number; bottom?: number; left?: number };
    avoidPositions?: () => Position[];
    minDistance?: number;
}

export const usePetBehavior = ({
    initialPosition = { x: 0, y: 0 },
    speed = 2, // pixels per tick
    bounds,
    edgeCorridor = false,
    corridorWidth = 80,
    blockedInsets,
    avoidPositions,
    minDistance = 100
}: UsePetBehaviorProps = {}) => {
    const [position, setPosition] = useState<Position>(initialPosition);
    const [state, setState] = useState<PetState>('walking'); // Start walking
    const [direction, setDirection] = useState<Direction>(Math.random() > 0.5 ? 'left' : 'right');

    // Internal refs for animation loop to avoid dependency cycles
    const positionRef = useRef(initialPosition);
    const stateRef = useRef<PetState>('walking');
    const directionRef = useRef<Direction>(direction);
    const targetRef = useRef<Position | null>(null);
    const nextTargetRef = useRef<Position | null>(null);
    const pendingTargetRef = useRef<Position | null>(null);
    const timeToChangeStateRef = useRef<number>(Date.now() + 600);
    const speedRef = useRef<number>(0);
    const desiredDirectionRef = useRef<Direction | null>(null);
    const lastStepTimeRef = useRef<number>(Date.now());
    const stepIntervalRef = useRef<number>(120);
    const segmentSpeedRef = useRef<number>(1);

    // Sync refs with state
    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => { directionRef.current = direction; }, [direction]);

    const getSafeBounds = useCallback(() => {
        if (!bounds) return null;
        const minX = blockedInsets?.left ?? 0;
        const minY = blockedInsets?.top ?? 0;
        const maxX = Math.max(minX, bounds.width - (blockedInsets?.right ?? 0) - PET_SIZE);
        const maxY = Math.max(minY, bounds.height - (blockedInsets?.bottom ?? 0) - PET_SIZE);
        return { minX, minY, maxX, maxY };
    }, [bounds, blockedInsets]);

    const isFarEnough = useCallback((candidate: Position) => {
        if (!avoidPositions) return true;
        const others = avoidPositions() ?? [];
        return others.every((pos) => {
            const dx = pos.x - candidate.x;
            const dy = pos.y - candidate.y;
            return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });
    }, [avoidPositions, minDistance]);

    const getNewTarget = useCallback(() => {
        if (!bounds) return null;
        const safe = getSafeBounds();
        if (!safe) return null;
        const { minX, minY, maxX, maxY } = safe;

        const generate = () => {
            if (!edgeCorridor) {
                return {
                    x: minX + Math.random() * (maxX - minX),
                    y: minY + Math.random() * (maxY - minY)
                };
            }

            const corridor = Math.min(corridorWidth, Math.min(maxX - minX, maxY - minY) / 2);
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) {
                return { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * Math.min(corridor, maxY - minY) };
            }
            if (edge === 1) {
                return { x: minX + Math.random() * (maxX - minX), y: Math.max(minY, maxY - corridor) + Math.random() * Math.min(corridor, maxY - minY) };
            }
            if (edge === 2) {
                return { x: minX + Math.random() * Math.min(corridor, maxX - minX), y: minY + Math.random() * (maxY - minY) };
            }
            return { x: Math.max(minX, maxX - corridor) + Math.random() * Math.min(corridor, maxX - minX), y: minY + Math.random() * (maxY - minY) };
        };

        let candidate = generate();
        for (let i = 0; i < 8; i++) {
            if (isFarEnough(candidate)) return candidate;
            candidate = generate();
        }
        return candidate;
    }, [bounds, edgeCorridor, corridorWidth, getSafeBounds, isFarEnough]);

    const getWaypointNearEdge = useCallback((edge: 'top' | 'bottom' | 'left' | 'right') => {
        if (!bounds) return null;
        const maxX = Math.max(0, bounds.width - PET_SIZE);
        const maxY = Math.max(0, bounds.height - PET_SIZE);
        const corridor = Math.min(corridorWidth, Math.min(bounds.width, bounds.height) / 2);
        const offset = Math.min(corridor, 120);
        if (edge === 'top') {
            return { x: Math.random() * maxX, y: Math.min(maxY, offset + Math.random() * offset) };
        }
        if (edge === 'bottom') {
            return { x: Math.random() * maxX, y: Math.max(0, maxY - offset - Math.random() * offset) };
        }
        if (edge === 'left') {
            return { x: Math.min(maxX, offset + Math.random() * offset), y: Math.random() * maxY };
        }
        return { x: Math.max(0, maxX - offset - Math.random() * offset), y: Math.random() * maxY };
    }, [bounds, corridorWidth]);

    const resolveEdge = useCallback(() => {
        if (!bounds) return null;
        const safe = getSafeBounds();
        if (!safe) return null;
        const { minX, minY, maxX, maxY } = safe;
        const corridor = Math.min(corridorWidth, Math.min(maxX - minX, maxY - minY) / 2);
        const { x, y } = positionRef.current;
        if (y <= minY + corridor) return 'top';
        if (y >= maxY - corridor) return 'bottom';
        if (x <= minX + corridor) return 'left';
        if (x >= maxX - corridor) return 'right';
        return null;
    }, [getSafeBounds, corridorWidth]);

    const isOffscreen = useCallback((pos: Position) => {
        if (!bounds) return false;
        return (
            pos.x < -OFFSCREEN_MARGIN ||
            pos.x > bounds.width - PET_SIZE + OFFSCREEN_MARGIN ||
            pos.y < -OFFSCREEN_MARGIN ||
            pos.y > bounds.height - PET_SIZE + OFFSCREEN_MARGIN
        );
    }, [bounds]);

    const getEdgePosition = useCallback((edge: 'top' | 'bottom' | 'left' | 'right') => {
        if (!bounds) return null;
        const safe = getSafeBounds();
        if (!safe) return null;
        const { minX, minY, maxX, maxY } = safe;
        const corridor = Math.min(corridorWidth, Math.min(maxX - minX, maxY - minY) / 2);
        if (edge === 'top') {
            return { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * Math.min(corridor, maxY - minY) };
        }
        if (edge === 'bottom') {
            return { x: minX + Math.random() * (maxX - minX), y: Math.max(minY, maxY - corridor) + Math.random() * Math.min(corridor, maxY - minY) };
        }
        if (edge === 'left') {
            return { x: minX + Math.random() * Math.min(corridor, maxX - minX), y: minY + Math.random() * (maxY - minY) };
        }
        return { x: Math.max(minX, maxX - corridor) + Math.random() * Math.min(corridor, maxX - minX), y: minY + Math.random() * (maxY - minY) };
    }, [getSafeBounds, corridorWidth]);

    const getOffscreenTarget = useCallback((dir: Direction) => {
        if (!bounds) return null;
        const safe = getSafeBounds();
        if (!safe) return null;
        const { minY, maxY } = safe;
        const y = Math.min(maxY, Math.max(minY, positionRef.current.y));
        if (dir === 'left') {
            return { x: -PET_SIZE - OFFSCREEN_MARGIN, y };
        }
        return { x: bounds.width - PET_SIZE + OFFSCREEN_MARGIN, y };
    }, [bounds, getSafeBounds]);

    // Main game loop
    useEffect(() => {
        if (!bounds) return;

        let animationFrameId: number;

        const update = () => {
            const now = Date.now();
            const currentState = stateRef.current;

            if (currentState === 'dragged' || currentState === 'hidden') {
                // Do nothing if dragged, position is controlled by mouse
                animationFrameId = requestAnimationFrame(update);
                return;
            }

            // State machine
            if (now > timeToChangeStateRef.current) {
                const nextState = Math.random() > 0.15 ? 'walking' : 'idle';
                setState(nextState);
                speedRef.current = 0;
                segmentSpeedRef.current = 0.7 + Math.random() * 0.8; // vary walk speed
                stepIntervalRef.current = 90 + Math.random() * 80; // step cadence
                lastStepTimeRef.current = now;
                // Set next change time
                timeToChangeStateRef.current = now + Math.random() * 2500 + 1200;

                if (nextState === 'walking') {
                    const nextTarget = getNewTarget();
                    targetRef.current = nextTarget;
                    nextTargetRef.current = null;
                    if (nextTarget) {
                        const newDir = nextTarget.x > positionRef.current.x ? 'right' : 'left';
                        if (newDir !== directionRef.current) {
                            desiredDirectionRef.current = newDir;
                            if (isOffscreen(positionRef.current)) {
                                setDirection(newDir);
                                desiredDirectionRef.current = null;
                            } else {
                                pendingTargetRef.current = nextTarget;
                                targetRef.current = getOffscreenTarget(directionRef.current);
                            }
                        } else {
                            setDirection(newDir);
                        }
                    }
                }
            }

            if (currentState === 'walking' && !targetRef.current) {
                targetRef.current = getNewTarget();
            }

            if (currentState === 'walking' && targetRef.current) {
                const dx = targetRef.current.x - positionRef.current.x;
                const dy = targetRef.current.y - positionRef.current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Ease in/out speed to avoid sliding feel
                const maxSpeed = speed * segmentSpeedRef.current * 1.25;
                speedRef.current = Math.min(maxSpeed, speedRef.current + maxSpeed * 0.08);

                // Step cadence: move in discrete steps
                if (now - lastStepTimeRef.current < stepIntervalRef.current) {
                    animationFrameId = requestAnimationFrame(update);
                    return;
                }
                lastStepTimeRef.current = now;

                const easeOut = Math.min(1, distance / 90);
                const effectiveSpeed = Math.max(0.9, speedRef.current * easeOut);

                if (distance < effectiveSpeed) {
                    // Reached target
                    setPosition(targetRef.current);
                    positionRef.current = targetRef.current;
                    speedRef.current = 0;

                    if (desiredDirectionRef.current && isOffscreen(positionRef.current)) {
                        setDirection(desiredDirectionRef.current);
                        desiredDirectionRef.current = null;
                        if (pendingTargetRef.current) {
                            targetRef.current = pendingTargetRef.current;
                            pendingTargetRef.current = null;
                            setState('walking');
                            timeToChangeStateRef.current = now + Math.random() * 1500 + 500;
                            return;
                        }
                    }

                    if (nextTargetRef.current) {
                        targetRef.current = nextTargetRef.current;
                        nextTargetRef.current = null;
                        setState('walking');
                        timeToChangeStateRef.current = now + Math.random() * 1500 + 500;
                        return;
                    }

                    setState('idle');
                    timeToChangeStateRef.current = now + Math.random() * 1500 + 500; // short rest
                } else {
                    // Move towards target
                    const moveX = (dx / distance) * effectiveSpeed;
                    const moveY = (dy / distance) * effectiveSpeed;

                    const newPos = {
                        x: positionRef.current.x + moveX,
                        y: positionRef.current.y + moveY
                    };

                    setPosition(newPos);
                    positionRef.current = newPos;

                    // Do not flip direction while on-screen; flips only when offscreen
                }
            }

            animationFrameId = requestAnimationFrame(update);
        };

        animationFrameId = requestAnimationFrame(update);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [bounds, speed, getNewTarget, edgeCorridor, resolveEdge, getEdgePosition, getWaypointNearEdge, getOffscreenTarget, isOffscreen]); // Removing state dependencies to run in a loop

    const stop = useCallback(() => {
            if (state !== 'dragged') {
                setState('idle');
                speedRef.current = 0;
                // Extend idle time so it doesn't immediately start walking again
                timeToChangeStateRef.current = Date.now() + 999999;
            }
    }, [state]);

    const resume = useCallback(() => {
        if (state !== 'dragged') {
            setState('walking');
            speedRef.current = 0;
            segmentSpeedRef.current = 0.7 + Math.random() * 0.8;
            stepIntervalRef.current = 90 + Math.random() * 80;
            timeToChangeStateRef.current = Date.now() + Math.random() * 3000 + 2000;
        }
    }, [state]);

    // Drag handlers
    const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevent text selection etc.
        setState('dragged');
    }, []);

    // Global drag move/end listeners are needed because mouse can move faster than element
    useEffect(() => {
        if (state !== 'dragged') return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            // Center the pet on the cursor roughly (assuming 64x64)
        const newPos = {
            x: clientX - PET_SIZE / 2,
            y: clientY - PET_SIZE / 2
        };

            setPosition(newPos);
            positionRef.current = newPos;
        };

            const handleEnd = () => {
                setState('idle'); // Drop to idle
                speedRef.current = 0;
                timeToChangeStateRef.current = Date.now() + 1000; // Wait a bit before moving
            };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [state]);

    return {
        position,
        state,
        direction,
        stop,
        resume,
        startDrag
    };
};

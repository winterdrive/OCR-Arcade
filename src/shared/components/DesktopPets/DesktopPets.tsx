import { Pet } from './Pet';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '@/shared/lib/utils';



export const DesktopPets = ({
    enabled = true,
    variant = 'normal',
    edgeCorridor = false,
    corridorWidth = 80,
    blockedInsets,
    transparencyMode = 'global-subtle'
}: {
    enabled?: boolean,
    variant?: 'normal' | 'subtle',
    edgeCorridor?: boolean,
    corridorWidth?: number,
    blockedInsets?: { top?: number; right?: number; bottom?: number; left?: number },
    transparencyMode?: 'global-subtle' | 'zone-based'
}) => {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false);
    const positionsRef = useRef(new Map<string, { x: number; y: number }>());
    const isSubtle = variant === 'subtle'
    const [fadeZones, setFadeZones] = useState<DOMRect[]>([]);
    const petAsset = (name: string) => assetUrl(`assets/pets/${name}`)
    // 固定體型映射（山椒魚 70px 基準）：
    // 台灣黑熊 180、山羌 150、石虎 80、台灣野兔 74、山椒魚 70。
    const pets = [
        {
            id: 'black_bear',
            name: t('petsData.black_bear'),
            src: petAsset('black_bear.png'),
            size: 180,
            frames: [
                petAsset('black_bear_walk_v2_frame_0.png'),
                petAsset('black_bear_walk_v2_frame_1.png'),
                petAsset('black_bear_walk_v2_frame_2.png'),
                petAsset('black_bear_walk_v2_frame_3.png')
            ]
        },
        {
            id: 'muntjac',
            name: t('petsData.muntjac'),
            src: petAsset('muntjac.png'),
            size: 150,
            frames: [
                petAsset('muntjac_walk_frame_0.png'),
                petAsset('muntjac_walk_frame_1.png'),
                petAsset('muntjac_walk_frame_2.png'),
                petAsset('muntjac_walk_frame_3.png')
            ]
        },
        {
            id: 'leopard_cat',
            name: t('petsData.leopard_cat'),
            src: petAsset('leopard_cat.png'), // Fallback
            size: 80,
            frames: [
                petAsset('leopard_cat_walk_frame_0.png'),
                petAsset('leopard_cat_walk_frame_1.png'),
                petAsset('leopard_cat_walk_frame_2.png'),
                petAsset('leopard_cat_walk_frame_3.png')
            ]
        },
        {
            id: 'hare',
            name: t('petsData.hare'),
            src: petAsset('hare.png'),
            size: 74,
            frames: [
                petAsset('hare_walk_frame_0.png'),
                petAsset('hare_walk_frame_1.png'),
                petAsset('hare_walk_frame_2.png'),
                petAsset('hare_walk_frame_3.png')
            ]
        },
        {
            id: 'salamander',
            name: t('petsData.salamander'),
            src: petAsset('salamander.png'),
            size: 70,
            frames: [
                petAsset('salamander_walk_frame_0.png'),
                petAsset('salamander_walk_frame_1.png'),
                petAsset('salamander_walk_frame_2.png'),
                petAsset('salamander_walk_frame_3.png')
            ]
        },
    ];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !isSubtle || transparencyMode !== 'zone-based') {
            setFadeZones([]);
            return;
        }

        const selectors = ['.drop-zone', 'section.glass-card'];
        const updateFadeZones = () => {
            const nodes = selectors.flatMap((selector) =>
                Array.from(document.querySelectorAll<HTMLElement>(selector))
            );
            const zones = nodes
                .map((node) => node.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);
            setFadeZones(zones);
        };

        updateFadeZones();
        window.addEventListener('resize', updateFadeZones);
        window.addEventListener('scroll', updateFadeZones, true);

        return () => {
            window.removeEventListener('resize', updateFadeZones);
            window.removeEventListener('scroll', updateFadeZones, true);
        };
    }, [mounted, isSubtle, transparencyMode]);

    if (!mounted || !enabled) return null;

    return (
        <div className={`absolute top-0 left-0 w-full h-full pointer-events-none z-10 overflow-hidden ${isSubtle && transparencyMode === 'global-subtle' ? 'opacity-40' : ''}`}>
            {pets.map((pet) => (
                <Pet
                    key={pet.id}
                    id={pet.id}
                    name={pet.name}
                    imageSrc={pet.src}
                    frameCount={4} // Defaulting frameCount since it was missing in array
                    frames={pet.frames}
                    size={pet.size}
                    speed={isSubtle ? 0.6 : 1.5}
                    interactive={true}
                    edgeCorridor={edgeCorridor}
                    corridorWidth={corridorWidth}
                    blockedInsets={blockedInsets}
                    avoidPositions={() => Array.from(positionsRef.current.entries())
                        .filter(([id]) => id !== pet.id)
                        .map(([, pos]) => pos)
                    }
                    // minDistance removed, using internal default based on size
                    onPositionChange={(pos) => {
                        positionsRef.current.set(pet.id, pos);
                    }}
                    fadeZones={isSubtle && transparencyMode === 'zone-based' ? fadeZones : undefined}
                    fadeInZonesOpacity={0.42}
                />
            ))}
        </div>
    );
};

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Realistic3DDiceProps {
  value: number;
  isRolling: boolean;
  size?: number; // en px (ex: 72, 80)
  rollSide?: 'left' | 'right';
}

// Emplacements des points pour chaque valeur de 1 à 6
const PIP_CONFIGS: Record<number, Array<{ top: string; left: string }>> = {
  1: [{ top: '50%', left: '50%' }],
  2: [
    { top: '25%', left: '25%' },
    { top: '75%', left: '75%' },
  ],
  3: [
    { top: '25%', left: '25%' },
    { top: '50%', left: '50%' },
    { top: '75%', left: '75%' },
  ],
  4: [
    { top: '25%', left: '25%' },
    { top: '25%', left: '75%' },
    { top: '75%', left: '25%' },
    { top: '75%', left: '75%' },
  ],
  5: [
    { top: '25%', left: '25%' },
    { top: '25%', left: '75%' },
    { top: '50%', left: '50%' },
    { top: '75%', left: '25%' },
    { top: '75%', left: '75%' },
  ],
  6: [
    { top: '25%', left: '28%' },
    { top: '50%', left: '28%' },
    { top: '75%', left: '28%' },
    { top: '25%', left: '72%' },
    { top: '50%', left: '72%' },
    { top: '75%', left: '72%' },
  ],
};

const FACE_VALUES = [1, 2, 3, 4, 5, 6];

const TARGET_ROTATIONS: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: 0, ry: 180 },
  3: { rx: 0, ry: -90 },
  4: { rx: 0, ry: 90 },
  5: { rx: -90, ry: 0 },
  6: { rx: 90, ry: 0 },
};

export function Realistic3DDice({
  value,
  isRolling,
  size = 76,
  rollSide = 'left',
}: Realistic3DDiceProps) {
  const halfSize = size / 2;

  const faceTransformStyles = useMemo(() => {
    return {
      1: `translateZ(${halfSize}px)`,
      2: `rotateY(180deg) translateZ(${halfSize}px)`,
      3: `rotateY(90deg) translateZ(${halfSize}px)`,
      4: `rotateY(-90deg) translateZ(${halfSize}px)`,
      5: `rotateX(90deg) translateZ(${halfSize}px)`,
      6: `rotateX(-90deg) translateZ(${halfSize}px)`,
    };
  }, [halfSize]);

  const targetRotation = TARGET_ROTATIONS[value] || TARGET_ROTATIONS[1];

  // Déplacement et rebondissements physique à travers l'arène jaune
  const travelX =
    rollSide === 'left'
      ? [-140, -40, -90, -20, -50, 0]
      : [140, 40, 90, 20, 50, 0];

  const travelY = [-75, 0, -45, 0, -20, 0];

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Conteneur 3D avec Perspective */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `${size * 1.5}px`,
          height: `${size * 1.5}px`,
          perspective: '1000px',
        }}
      >
        {/* Ombre portée réaliste au sol qui se déplace en phase avec le dé */}
        <motion.div
          animate={
            isRolling
              ? {
                  x: travelX,
                  scale: [0.4, 1.2, 0.6, 1.1, 0.8, 1],
                  opacity: [0.2, 0.6, 0.3, 0.5, 0.4, 0.55],
                }
              : {
                  x: 0,
                  scale: value ? 1 : 0.9,
                  opacity: value ? 0.55 : 0.4,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 0.8, ease: 'easeOut' }
              : { duration: 0.4 }
          }
          className="absolute rounded-full bg-black/40 blur-md pointer-events-none"
          style={{
            width: `${size * 1.1}px`,
            height: `${size * 0.4}px`,
            bottom: `${size * 0.05}px`,
          }}
        />

        {/* Cube 3D Animé qui culbute ET se déplace à travers la table */}
        <motion.div
          animate={
            isRolling
              ? {
                  x: travelX,
                  y: travelY,
                  rotateX:
                    rollSide === 'left'
                      ? [0, 360, 720, 1080, 1440]
                      : [0, -360, -720, -1080, -1440],
                  rotateY:
                    rollSide === 'left'
                      ? [0, 540, 900, 1260, 1620]
                      : [0, -540, -900, -1260, -1620],
                  rotateZ:
                    rollSide === 'left'
                      ? [-60, 30, -90, 45, 0]
                      : [60, -30, 90, -45, 0],
                }
              : {
                  x: 0,
                  y: 0,
                  rotateX: targetRotation.rx,
                  rotateY: targetRotation.ry,
                  rotateZ: 0,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 0.8, ease: 'easeOut' }
              : { type: 'spring', stiffness: 200, damping: 17 }
          }
          style={{
            width: `${size}px`,
            height: `${size}px`,
            transformStyle: 'preserve-3d',
          }}
          className="relative"
        >
          {FACE_VALUES.map((faceVal) => {
            const dots = PIP_CONFIGS[faceVal] || [];
            const transformStr =
              faceTransformStyles[faceVal as keyof typeof faceTransformStyles];

            return (
              <div
                key={faceVal}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  transform: transformStr,
                  backfaceVisibility: 'hidden',
                  borderRadius: `${Math.round(size * 0.18)}px`,
                  background:
                    'linear-gradient(145deg, #ffffff 0%, #f4f4f6 50%, #e2e2e8 100%)',
                  boxShadow:
                    'inset 0 0 6px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.9), 0 4px 10px rgba(0,0,0,0.25)',
                  border: '1px solid rgba(210,210,220,0.85)',
                }}
                className="absolute inset-0 p-1 flex items-center justify-center overflow-hidden"
              >
                {/* Reflet brillant supérieur */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none opacity-40"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
                  }}
                />

                {/* Points noirs incrustés */}
                {dots.map((dot, idx) => (
                  <span
                    key={idx}
                    style={{
                      top: dot.top,
                      left: dot.left,
                      width: `${Math.round(size * 0.19)}px`,
                      height: `${Math.round(size * 0.19)}px`,
                      background:
                        'radial-gradient(circle at 35% 35%, #2c2c2c 0%, #080808 80%, #000000 100%)',
                      boxShadow:
                        'inset 0 1.5px 3px rgba(0,0,0,0.9), 0 0.5px 1px rgba(255,255,255,0.4)',
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40"
                  />
                ))}
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

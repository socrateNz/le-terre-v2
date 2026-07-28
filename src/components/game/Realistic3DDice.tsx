'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Realistic3DDiceProps {
  value: number;
  isRolling: boolean;
  size?: number; // en px (ex: 64)
  diceIndex?: 1 | 2;
  trajectorySeed?: number; // Trajectoire et point d'arrêt aléatoires sécurisés
}

// Emplacements des points (pips) pour chaque valeur de 1 à 6
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

// Angles de rotation finaux pour exposer la valeur au regard du joueur
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
  size = 64,
  diceIndex = 1,
  trajectorySeed = 0,
}: Realistic3DDiceProps) {
  const halfSize = size / 2;

  // Calcul du style de transformation pour chaque face en 3D
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

  // Génération de positions de repos et trajectoires 100% IMPRÉVISIBLES mais MATHEMATIQUEMENT CONFINÉES À L'ARÈNE
  const randomTrajectory = useMemo(() => {
    const isLeft = diceIndex === 1;

    // Pseudo-random seeder basé sur trajectorySeed & diceIndex pour consistance inter-renders
    const currentSeed = (trajectorySeed || 12345) * (diceIndex * 9301 + 49297);
    const rnd1 = (Math.abs(Math.sin(currentSeed + 1)) * 10000) % 1;
    const rnd2 = (Math.abs(Math.sin(currentSeed + 2)) * 10000) % 1;
    const rnd3 = (Math.abs(Math.sin(currentSeed + 3)) * 10000) % 1;
    const rnd4 = (Math.abs(Math.sin(currentSeed + 4)) * 10000) % 1;

    // Plage X par rapport au centre de l'arène (0px):
    // Dé 1 (gauche) : de -105px à -25px (reste strictement sur le tapis jaune gauche sans toucher le bord gauche)
    // Dé 2 (droite) : de +25px à +105px (reste strictement sur le tapis jaune droit sans toucher le bord droit)
    const restX = isLeft
      ? -105 + rnd1 * 80  // -105px à -25px
      : 25 + rnd2 * 80;   // +25px à +105px

    // Plage Y par rapport au centre de l'arène : de -32px à +32px (garantit de ne jamais toucher le header ni les boutons)
    const restY = -32 + rnd3 * 64;

    // Trajectoire d'entrée dans le périmètre du tapis jaune
    const startX = isLeft ? -130 - rnd1 * 20 : 130 + rnd2 * 20;
    const startY = -80 - rnd4 * 30;

    // Rebondissements physiques sur le tapis convergeant vers la position d'arrêt (restX, restY)
    const midX1 = (rnd4 - 0.5) * 120;
    const midX2 = (restX + startX) / 2 + (rnd2 - 0.5) * 30;

    const bounce1Y = restY + 12 + rnd1 * 12;
    const peak2Y = restY - 30 - rnd2 * 20;
    const bounce2Y = restY + 6 + rnd3 * 6;
    const peak3Y = restY - 12 - rnd4 * 8;

    const spinDirection = isLeft ? 1 : -1;
    const revsX = (4 + Math.floor(rnd1 * 3)) * 360 * spinDirection;
    const revsY = (5 + Math.floor(rnd2 * 3)) * 360 * spinDirection;

    const rotZ1 = (rnd3 - 0.5) * 360;
    const rotZ2 = (rnd4 - 0.5) * 540;
    const rotZ3 = (rnd1 - 0.5) * 180;

    return {
      x: [startX, midX1, midX2, (midX2 + restX) / 2, restX],
      y: [startY, bounce1Y, peak2Y, bounce2Y, peak3Y, restY],
      scale: [1.2, 0.85, 1.12, 0.95, 1.04, 1],
      shadowOpacity: [0.15, 0.65, 0.25, 0.55, 0.35, 0.5],
      shadowScale: [0.35, 1.25, 0.5, 1.1, 0.7, 1.0],
      rotateX: [0, revsX * 0.3, revsX * 0.65, revsX * 0.85, revsX],
      rotateY: [0, revsY * 0.35, revsY * 0.7, revsY * 0.9, revsY],
      rotateZ: [rotZ1, rotZ2, rotZ3, 0],
      restX,
      restY,
    };
  }, [diceIndex, trajectorySeed]);

  const targetRotation = TARGET_ROTATIONS[value] || TARGET_ROTATIONS[1];

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Conteneur 3D avec Perspective */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `${size * 1.3}px`,
          height: `${size * 1.3}px`,
          perspective: isRolling ? '1200px' : 'none',
        }}
      >
        {/* Ombre portée dynamique au sol qui suit le dé à sa position d'arrêt dans l'arène */}
        <motion.div
          animate={
            isRolling
              ? {
                  x: randomTrajectory.x,
                  y: randomTrajectory.y,
                  scale: randomTrajectory.shadowScale,
                  opacity: randomTrajectory.shadowOpacity,
                }
              : {
                  x: randomTrajectory.restX,
                  y: randomTrajectory.restY,
                  scale: value ? 1 : 0.9,
                  opacity: value ? 0.5 : 0.4,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 1.1, ease: [0.25, 1, 0.5, 1] }
              : { type: 'spring', stiffness: 220, damping: 19 }
          }
          className="absolute rounded-full bg-black/40 blur-md pointer-events-none"
          style={{
            width: `${size * 1.05}px`,
            height: `${size * 0.35}px`,
            bottom: `-${Math.round(size * 0.12)}px`,
          }}
        />

        {/* Cube 3D Animé qui reste MATHEMATIQUEMENT DANS LES LIMITES DU TAPIS JAUNE */}
        <motion.div
          animate={
            isRolling
              ? {
                  x: randomTrajectory.x,
                  y: randomTrajectory.y,
                  scale: randomTrajectory.scale,
                  rotateX: randomTrajectory.rotateX,
                  rotateY: randomTrajectory.rotateY,
                  rotateZ: randomTrajectory.rotateZ,
                }
              : {
                  x: randomTrajectory.restX,
                  y: randomTrajectory.restY,
                  scale: 1,
                  rotateX: targetRotation.rx,
                  rotateY: targetRotation.ry,
                  rotateZ: 0,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 1.1, ease: [0.25, 1, 0.5, 1] }
              : { type: 'spring', stiffness: 220, damping: 19 }
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
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: `${Math.round(size * 0.22)}px`,
                  background:
                    'linear-gradient(145deg, #ffffff 0%, #f4f4f7 55%, #e1e1e8 100%)',
                  boxShadow:
                    'inset 0 0 5px rgba(0,0,0,0.1), inset 0 2.5px 5px rgba(255,255,255,1), 0 5px 14px rgba(0,0,0,0.25)',
                  border: '1.5px solid rgba(215,215,225,0.95)',
                }}
                className="absolute inset-0 p-1 flex items-center justify-center overflow-hidden"
              >
                {/* Reflet brillant supérieur */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none opacity-45"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
                  }}
                />

                {/* Points noirs incrustés */}
                {dots.map((dot, idx) => (
                  <span
                    key={idx}
                    style={{
                      top: dot.top,
                      left: dot.left,
                      width: `${Math.round(size * 0.2)}px`,
                      height: `${Math.round(size * 0.2)}px`,
                      background:
                        'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #080808 80%, #000000 100%)',
                      boxShadow:
                        'inset 0 1.5px 3px rgba(0,0,0,0.9), 0 0.5px 1px rgba(255,255,255,0.5)',
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

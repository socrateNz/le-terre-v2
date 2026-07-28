'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Realistic3DDiceProps {
  value: number;
  isRolling: boolean;
  size?: number; // en px (ex: 76)
  diceIndex?: 1 | 2;
  trajectorySeed?: number; // Génère une nouvelle trajectoire aléatoire unique à chaque lancer
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

  // Génération de trajectoires PHYSIQUES ALÉATOIRES sans direction prédéfinie
  const randomTrajectory = useMemo(() => {
    const isLeft = diceIndex === 1;

    // Positions X aléatoires amples à travers le grand tapis jaune
    const startX = isLeft
      ? -180 - Math.random() * 80
      : 180 + Math.random() * 80;
    const midX1 = (Math.random() - 0.5) * 260;
    const midX2 = isLeft ? -90 + Math.random() * 120 : 90 - Math.random() * 120;
    const restX = isLeft ? -45 + Math.random() * 20 : 45 - Math.random() * 20;

    // Hauteurs de rebonds Y aléatoires (effet de lancer en l'air et choc sur le tapis)
    const startY = -150 - Math.random() * 90;
    const bounce1Y = 25 + Math.random() * 20;
    const peak2Y = -80 - Math.random() * 50;
    const bounce2Y = 15 + Math.random() * 15;
    const peak3Y = -35 - Math.random() * 25;
    const restY = (Math.random() - 0.5) * 30;

    // Rotations 3D imprévisibles sur les 3 axes X, Y, Z
    const spinDirection = isLeft ? 1 : -1;
    const revsX = (4 + Math.floor(Math.random() * 3)) * 360 * spinDirection;
    const revsY = (5 + Math.floor(Math.random() * 3)) * 360 * spinDirection;

    const rotZ1 = (Math.random() - 0.5) * 360;
    const rotZ2 = (Math.random() - 0.5) * 540;
    const rotZ3 = (Math.random() - 0.5) * 180;
    const restZ = (Math.random() - 0.5) * 30; // légère inclinaison naturelle au repos

    return {
      x: [startX, midX1, midX2, restX / 2, restX],
      y: [startY, bounce1Y, peak2Y, bounce2Y, peak3Y, restY],
      scale: [1.35, 0.8, 1.25, 0.9, 1.1, 1],
      shadowOpacity: [0.15, 0.7, 0.25, 0.6, 0.35, 0.55],
      shadowScale: [0.35, 1.35, 0.5, 1.2, 0.7, 1.0],
      rotateX: [0, revsX * 0.3, revsX * 0.65, revsX * 0.85, revsX],
      rotateY: [0, revsY * 0.35, revsY * 0.7, revsY * 0.9, revsY],
      rotateZ: [rotZ1, rotZ2, rotZ3, restZ],
      restX,
      restY,
      restZ,
    };
    // Re-calcule une nouvelle trajectoire aléatoire à chaque nouveau lancer ou seed
  }, [diceIndex, trajectorySeed, isRolling]);

  const targetRotation = TARGET_ROTATIONS[value] || TARGET_ROTATIONS[1];

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Conteneur 3D avec Perspective Élargie */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `${size * 1.6}px`,
          height: `${size * 1.6}px`,
          perspective: '1200px',
        }}
      >
        {/* Ombre portée dynamique au sol qui suit les rebonds et le vol du dé */}
        <motion.div
          animate={
            isRolling
              ? {
                  x: randomTrajectory.x,
                  scale: randomTrajectory.shadowScale,
                  opacity: randomTrajectory.shadowOpacity,
                }
              : {
                  x: randomTrajectory.restX,
                  y: randomTrajectory.restY,
                  scale: value ? 1 : 0.9,
                  opacity: value ? 0.55 : 0.4,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 1.1, ease: [0.25, 1, 0.5, 1] }
              : { duration: 0.4 }
          }
          className="absolute rounded-full bg-black/45 blur-md pointer-events-none"
          style={{
            width: `${size * 1.15}px`,
            height: `${size * 0.42}px`,
            bottom: `${size * 0.05}px`,
          }}
        />

        {/* Cube 3D Animé avec vol, rebonds et culbutage totalement aléatoires */}
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
                  rotateZ: randomTrajectory.restZ,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 1.1, ease: [0.25, 1, 0.5, 1] }
              : { type: 'spring', stiffness: 210, damping: 18 }
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
                    'inset 0 0 6px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.9), 0 5px 14px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(210,210,220,0.9)',
                }}
                className="absolute inset-0 p-1 flex items-center justify-center overflow-hidden"
              >
                {/* Reflet brillant supérieur */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none opacity-40"
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

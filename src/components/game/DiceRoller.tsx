'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DiceRollerProps {
  value: number;
  isRolling: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const DOT_CONFIGS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export function DiceRoller({
  value,
  isRolling,
  size = 'md',
  label,
}: DiceRollerProps) {
  const [rollingValue, setRollingValue] = useState<number>(value || 1);

  // Animation de roulement aléatoire rapide quand isRolling est actif
  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setRollingValue(Math.floor(Math.random() * 6) + 1);
    }, 70);
    return () => clearInterval(interval);
  }, [isRolling]);

  const displayValue = isRolling ? rollingValue : value || 0;

  const sizeClasses = {
    sm: 'w-10 h-10 text-base',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  }[size];

  const dots = DOT_CONFIGS[displayValue] || [];

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest font-semibold">
          {label}
        </span>
      )}

      <div className="relative group">
        {/* Glow effect pendant le lancer */}
        {isRolling && (
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{ repeat: Infinity, duration: 0.4 }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#6C3BFF] to-[#F4B400] blur-md pointer-events-none"
          />
        )}

        <motion.div
          animate={
            isRolling
              ? {
                  rotateX: [0, 360, 720],
                  rotateY: [0, 360, 720],
                  rotateZ: [0, 180, 360],
                  scale: [1, 1.15, 0.95, 1],
                }
              : {
                  rotateX: 0,
                  rotateY: 0,
                  rotateZ: 0,
                  scale: value ? [1.2, 1] : 1,
                }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 0.5, ease: 'linear' }
              : { type: 'spring', stiffness: 300, damping: 15 }
          }
          className={`relative ${sizeClasses} rounded-2xl bg-gradient-to-br from-[#1E2230] via-[#12141D] to-[#0A0C12] border-2 ${
            isRolling
              ? 'border-[#F4B400] shadow-[0_0_15px_rgba(244,180,0,0.6)]'
              : value > 0
              ? 'border-[#6C3BFF] shadow-[0_0_12px_rgba(108,59,255,0.4)]'
              : 'border-white/10'
          } flex items-center justify-center shadow-xl select-none`}
        >
          {displayValue > 0 ? (
            <div className="relative w-full h-full p-2">
              {dots.map(([cx, cy], idx) => (
                <span
                  key={idx}
                  style={{ top: `${cy}%`, left: `${cx}%` }}
                  className={`absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    isRolling
                      ? 'bg-[#F4B400] shadow-[0_0_6px_#F4B400]'
                      : 'bg-gradient-to-r from-[#F4B400] to-yellow-200 shadow-[0_0_5px_rgba(244,180,0,0.9)]'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="font-mono text-gray-500 font-bold">?</span>
          )}
        </motion.div>
      </div>
    </div>
  );
}

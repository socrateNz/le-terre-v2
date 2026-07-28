'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Realistic3DDice } from './Realistic3DDice';
import { Sparkles, Dices, Play, Smartphone } from 'lucide-react';
import { useShakeDetector } from '@/hooks/useShakeDetector';

interface SharedDiceArenaProps {
  diceOne: number;
  diceTwo: number;
  isRolling: boolean;
  activeRollerName?: string | null;
  canRoll: boolean;
  onRoll: () => void;
  gameStatus: string;
  totalScore?: number;
}

export function SharedDiceArena({
  diceOne,
  diceTwo,
  isRolling,
  activeRollerName,
  canRoll,
  onRoll,
  gameStatus,
  totalScore,
}: SharedDiceArenaProps) {
  const [trajectorySeed, setTrajectorySeed] = useState<number>(() => Date.now());

  const displayScore =
    diceOne > 0 && diceTwo > 0 ? diceOne + diceTwo : totalScore || 0;

  const triggerRollWithNewTrajectory = () => {
    setTrajectorySeed(Date.now());
    onRoll();
  };

  const {
    isSupported,
    needsPermission,
    permissionGranted,
    requestPermission,
    lastMagnitude,
  } = useShakeDetector({
    onShake: () => {
      if (canRoll && !isRolling) {
        triggerRollWithNewTrajectory();
      }
    },
    enabled: canRoll && !isRolling,
    threshold: 11,
  });

  const handleRollClick = async () => {
    if (needsPermission && !permissionGranted) {
      await requestPermission();
    }
    triggerRollWithNewTrajectory();
  };

  const handleGrantPermissionClick = async () => {
    await requestPermission();
  };

  return (
    <div
      className="relative w-full flex-1 min-h-[240px] max-h-[380px] rounded-3xl overflow-hidden shadow-2xl border-4 md:border-6 border-[#C88E00]/70 p-4 md:p-6 flex flex-col items-center justify-between gap-3 transition-all select-none"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, #FFE543 0%, #F5B800 55%, #D69700 85%, #9E6B00 100%)',
        boxShadow:
          'inset 0 0 40px rgba(90, 55, 0, 0.5), 0 15px 35px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Texture de surface & Vignette de l'arène */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/25 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-2.5 border border-black/10 rounded-2xl pointer-events-none" />

      {/* Header Badge sur le tapis Jaune */}
      <div className="relative z-10 flex items-center justify-between w-full border-b border-black/15 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black/90 flex items-center justify-center text-[#FFE543] shadow-md">
            <Dices className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-black/90 tracking-wider">
              Arène Jaune • Dés Partagés
            </h3>
            <p className="text-[10px] font-mono text-black/70 font-bold">
              {isRolling
                ? `🎲 Lancer en cours (${activeRollerName || 'Joueur'})...`
                : activeRollerName
                ? `Dernier lancer : ${activeRollerName}`
                : 'Paire de dés unique en direct'}
            </p>
          </div>
        </div>

        {displayScore > 0 && !isRolling && (
          <div className="bg-black/90 text-[#FFE543] px-3 py-1 rounded-xl text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg whitespace-nowrap flex-shrink-0">
            <span>SCORE :</span>
            <span className="text-sm font-black text-white">{displayScore}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              ({diceOne} + {diceTwo})
            </span>
          </div>
        )}
      </div>

      {/* Zone centrale : Plateau 3D Centré (Contrôle absolu des dés sans débordement) */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center min-h-[140px] overflow-hidden">
        {/* Dé 1 (Côté gauche sécurisé) */}
        <div className="absolute flex items-center justify-center">
          <Realistic3DDice
            value={diceOne || 1}
            isRolling={isRolling}
            size={64}
            diceIndex={1}
            trajectorySeed={trajectorySeed}
          />
        </div>

        {/* Dé 2 (Côté droit sécurisé) */}
        <div className="absolute flex items-center justify-center">
          <Realistic3DDice
            value={diceTwo || 1}
            isRolling={isRolling}
            size={64}
            diceIndex={2}
            trajectorySeed={trajectorySeed}
          />
        </div>
      </div>

      {/* Zone d'action au bas de la table jaune */}
      <div className="relative z-10 w-full space-y-1.5">
        {canRoll ? (
          <>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRollClick}
              disabled={isRolling}
              className="w-full py-3 md:py-3.5 rounded-xl bg-black hover:bg-gray-900 text-[#FFE543] font-extrabold text-xs md:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isRolling ? (
                <>
                  <Dices className="w-4 h-4 animate-spin text-[#FFE543]" />
                  Lancer en cours...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-[#FFE543]" />
                  🎲 Lancer les Dés dans l'Arène !
                </>
              )}
            </motion.button>

            {isSupported && !isRolling && (
              <div>
                {needsPermission && !permissionGranted ? (
                  <button
                    onClick={handleGrantPermissionClick}
                    className="w-full py-1.5 px-2 rounded-lg bg-black/85 text-[#FFE543] text-[11px] font-mono font-extrabold flex items-center justify-center gap-1.5 shadow"
                  >
                    <Smartphone className="w-3.5 h-3.5 animate-bounce" />
                    <span>Activer la secousse mobile 📱</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-[10px] font-mono font-extrabold text-black/80 bg-black/10 py-1 px-2.5 rounded-lg border border-black/10">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 animate-bounce text-black" />
                      📱 Secouez le téléphone pour lancer !
                    </span>
                    {lastMagnitude > 0 && (
                      <span className="text-[9px] bg-black/20 px-1 rounded text-black/70 font-mono">
                        Intensité: {lastMagnitude}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : isRolling ? (
          <div className="w-full py-2.5 rounded-xl bg-black/75 text-[#FFE543] text-center font-mono text-xs font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            Lancer de dés en cours...
          </div>
        ) : gameStatus === 'FINISHED' ? (
          <div className="w-full py-2 rounded-xl bg-black/25 backdrop-blur-sm text-black/85 font-mono text-center text-xs font-extrabold">
            🏁 Partie terminée
          </div>
        ) : (
          <div className="w-full py-2 rounded-xl bg-black/30 backdrop-blur-sm text-black/90 font-mono text-center text-xs font-bold">
            {diceOne > 0
              ? '✅ Votre lancer est effectué !'
              : '⏳ En attente du lancer de dés...'}
          </div>
        )}
      </div>
    </div>
  );
}

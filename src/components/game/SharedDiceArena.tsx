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

  // Intégration de la détection de secousse (Shake to Roll)
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
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-[#C88E00]/70 p-6 md:p-8 flex flex-col items-center justify-between gap-6 transition-all select-none min-h-[380px] md:min-h-[440px]"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, #FFE543 0%, #F5B800 55%, #D69700 85%, #9E6B00 100%)',
        boxShadow:
          'inset 0 0 50px rgba(90, 55, 0, 0.5), 0 25px 50px rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* Texture de surface & Rail de bordure de l'arène */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/25 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-3 border-2 border-black/10 rounded-2xl pointer-events-none" />

      {/* Header Badge sur le tapis Jaune */}
      <div className="relative z-10 flex items-center justify-between w-full border-b border-black/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-black/90 flex items-center justify-center text-[#FFE543] shadow-lg">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-black uppercase text-black/90 tracking-wider">
              Grande Arène de Lancer • Dés 3D Partagés
            </h3>
            <p className="text-[10px] md:text-xs font-mono text-black/70 font-bold">
              {isRolling
                ? `🎲 Lancer en cours (${activeRollerName || 'Joueur'})...`
                : activeRollerName
                ? `Dernier lancer par : ${activeRollerName}`
                : 'Tous les joueurs utilisent cette même paire de dés en direct'}
            </p>
          </div>
        </div>

        {displayScore > 0 && !isRolling && (
          <div className="bg-black/90 text-[#FFE543] px-4 py-1.5 rounded-xl text-xs md:text-sm font-mono font-extrabold flex items-center gap-2 shadow-xl">
            <span>SCORE :</span>
            <span className="text-base font-black text-white">{displayScore}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              ({diceOne} + {diceTwo})
            </span>
          </div>
        )}
      </div>

      {/* Zone centrale ÉLARGIE : Les 2 Dés 3D Partagés avec trajectoires physiques aléatoires */}
      <div className="relative z-10 w-full flex items-center justify-around my-4 min-h-[220px] md:min-h-[260px] px-4 overflow-visible">
        {/* Dé 1 (Index 1 - Trajectoire dynamique) */}
        <div className="transform -rotate-3 hover:scale-105 transition-transform">
          <Realistic3DDice
            value={diceOne || 1}
            isRolling={isRolling}
            size={80}
            diceIndex={1}
            trajectorySeed={trajectorySeed}
          />
        </div>

        {/* Separateur / Plus de l'arène */}
        <div className="text-black/30 font-black text-3xl font-mono select-none">
          +
        </div>

        {/* Dé 2 (Index 2 - Trajectoire dynamique) */}
        <div className="transform rotate-3 hover:scale-105 transition-transform">
          <Realistic3DDice
            value={diceTwo || 1}
            isRolling={isRolling}
            size={80}
            diceIndex={2}
            trajectorySeed={trajectorySeed}
          />
        </div>
      </div>

      {/* Zone d'action centrale / Message au bas de la table jaune */}
      <div className="relative z-10 w-full space-y-2 pt-2">
        {canRoll ? (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRollClick}
              disabled={isRolling}
              className="w-full py-4 rounded-2xl bg-black hover:bg-gray-900 text-[#FFE543] font-extrabold text-sm md:text-base uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isRolling ? (
                <>
                  <Dices className="w-5 h-5 animate-spin text-[#FFE543]" />
                  Lancer de vos dés dans l'arène en cours...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current text-[#FFE543]" />
                  🎲 Lancer les Dés dans l'Arène !
                </>
              )}
            </motion.button>

            {/* Support Mobile Shake Info / Permission Button */}
            {isSupported && !isRolling && (
              <div className="space-y-1.5">
                {needsPermission && !permissionGranted ? (
                  <button
                    onClick={handleGrantPermissionClick}
                    className="w-full py-2 px-3 rounded-xl bg-black/85 hover:bg-black text-[#FFE543] text-xs font-mono font-extrabold flex items-center justify-center gap-2 border border-black/20 shadow-md transition-all"
                  >
                    <Smartphone className="w-4 h-4 animate-bounce" />
                    <span>Activer les capteurs pour secouer le téléphone 📱</span>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-1.5 text-[11px] font-mono font-extrabold text-black/80 bg-black/10 backdrop-blur-md py-2 px-3 rounded-xl border border-black/10"
                  >
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 animate-bounce text-black" />
                      📱 Secouez votre téléphone pour lancer les dés !
                    </span>
                    {lastMagnitude > 0 && (
                      <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded text-black/70 font-mono">
                        Mouvement: {lastMagnitude}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </>
        ) : isRolling ? (
          <div className="w-full py-3 rounded-2xl bg-black/75 text-[#FFE543] text-center font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            Lancer de dés en cours...
          </div>
        ) : gameStatus === 'FINISHED' ? (
          <div className="w-full py-2.5 rounded-2xl bg-black/25 backdrop-blur-sm text-black/85 font-mono text-center text-xs font-extrabold">
            🏁 Partie terminée dans l'arène
          </div>
        ) : (
          <div className="w-full py-3 rounded-2xl bg-black/30 backdrop-blur-sm text-black/90 font-mono text-center text-xs font-bold">
            {diceOne > 0
              ? '✅ Vous avez déjà effectué votre lancer !'
              : '⏳ En attente de votre tour ou du second joueur...'}
          </div>
        )}
      </div>
    </div>
  );
}

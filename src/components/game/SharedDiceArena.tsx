'use client';

import { motion } from 'framer-motion';
import { Realistic3DDice } from './Realistic3DDice';
import { Sparkles, Dices, Play, Smartphone, CheckCircle } from 'lucide-react';
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
  const displayScore =
    diceOne > 0 && diceTwo > 0 ? diceOne + diceTwo : totalScore || 0;

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
        onRoll();
      }
    },
    enabled: canRoll && !isRolling,
    threshold: 11,
  });

  const handleRollClick = async () => {
    if (needsPermission && !permissionGranted) {
      await requestPermission();
    }
    onRoll();
  };

  const handleGrantPermissionClick = async () => {
    await requestPermission();
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-[#C88E00]/60 p-6 flex flex-col items-center justify-between gap-6 transition-all select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 30%, #FFE543 0%, #F5B800 60%, #D69700 100%)',
        boxShadow:
          'inset 0 0 30px rgba(120, 75, 0, 0.4), 0 20px 40px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Texture de surface & Vignette de l'arène */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30 pointer-events-none" />

      {/* Header Badge sur le tapis Jaune */}
      <div className="relative z-10 flex items-center justify-between w-full border-b border-black/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black/80 flex items-center justify-center text-[#FFE543] shadow-md">
            <Dices className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-black/80 tracking-wider">
              Arène de Lancer • Dés Partagés
            </h3>
            <p className="text-[10px] font-mono text-black/60 font-bold">
              {isRolling
                ? `🎲 Lancer en cours (${activeRollerName || 'Joueur'})...`
                : activeRollerName
                ? `Dernier lancer par : ${activeRollerName}`
                : 'Tous les joueurs utilisent cette même paire de dés'}
            </p>
          </div>
        </div>

        {displayScore > 0 && !isRolling && (
          <div className="bg-black/80 text-[#FFE543] px-3.5 py-1 rounded-xl text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg">
            <span>SCORE :</span>
            <span className="text-sm font-black text-white">{displayScore}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              ({diceOne} + {diceTwo})
            </span>
          </div>
        )}
      </div>

      {/* Zone centrale : Les 2 Dés 3D Partagés Réels sur la table Jaune */}
      <div className="relative z-10 py-10 my-2 w-full flex items-center justify-center gap-10 md:gap-16 min-h-[180px]">
        {/* Dé 1 (Déplacement depuis la gauche de l'arène) */}
        <div className="transform -rotate-6 transition-transform hover:scale-105">
          <Realistic3DDice
            value={diceOne || 1}
            isRolling={isRolling}
            size={76}
            rollSide="left"
          />
        </div>

        {/* Séparateur / Plus */}
        <div className="text-black/40 font-black text-2xl font-mono select-none flex flex-col items-center">
          <span>+</span>
        </div>

        {/* Dé 2 (Déplacement depuis la droite de l'arène) */}
        <div className="transform rotate-6 transition-transform hover:scale-105">
          <Realistic3DDice
            value={diceTwo || 1}
            isRolling={isRolling}
            size={76}
            rollSide="right"
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
              className="w-full py-4 rounded-2xl bg-black hover:bg-gray-900 text-[#FFE543] font-extrabold text-sm uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isRolling ? (
                <>
                  <Dices className="w-5 h-5 animate-spin text-[#FFE543]" />
                  Lancer de vos dés en cours...
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
                    className="w-full py-2 px-3 rounded-xl bg-black/80 hover:bg-black text-[#FFE543] text-xs font-mono font-extrabold flex items-center justify-center gap-2 border border-black/20 shadow-md transition-all"
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
                      📱 Secouez vivement votre téléphone pour lancer les dés !
                    </span>
                    {lastMagnitude > 0 && (
                      <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded text-black/70">
                        Intensité: {lastMagnitude}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </>
        ) : isRolling ? (
          <div className="w-full py-3 rounded-2xl bg-black/70 text-[#FFE543] text-center font-mono text-xs font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            Lancer de dés en cours...
          </div>
        ) : gameStatus === 'FINISHED' ? (
          <div className="w-full py-2.5 rounded-2xl bg-black/20 backdrop-blur-sm text-black/80 font-mono text-center text-xs font-extrabold">
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

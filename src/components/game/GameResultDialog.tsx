'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Sparkles,
  Frown,
  Scale,
  Ban,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';

interface GameResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameStatus: string;
  isUserWinner: boolean;
  isUserLoser: boolean;
  isGameTie: boolean;
  isCancelled: boolean;
  winnerUsername?: string;
  totalPot: number;
  bet: number;
  // Actions de revanche
  rematchRequesterId?: string | null;
  isMyRematchProposal?: boolean;
  isOpponentRematchProposal?: boolean;
  isRematchLoading?: boolean;
  canAffordRematch?: boolean;
  onProposeRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
}

export function GameResultDialog({
  isOpen,
  onClose,
  gameStatus,
  isUserWinner,
  isUserLoser,
  isGameTie,
  isCancelled,
  winnerUsername,
  totalPot,
  bet,
  isMyRematchProposal,
  isOpponentRematchProposal,
  isRematchLoading,
  canAffordRematch = true,
  onProposeRematch,
  onAcceptRematch,
  onDeclineRematch,
}: GameResultDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop sombre flouté */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Contenu du Dialog Modal */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-[#12151F] text-white p-6 space-y-5"
        >
          {/* Bouton de Fermeture X */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. CAS VICTOIRE */}
          {isUserWinner && (
            <div className="text-center space-y-3">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <Trophy className="w-10 h-10 text-[#F4B400] animate-bounce" />
                </div>
                <Sparkles className="w-6 h-6 text-[#F4B400] absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">🎉 VICTOIRE ÉCLATANTE !</h2>
                <p className="text-xs font-mono text-emerald-300 mt-1">
                  Félicitations ! Vous remportez la totalité de la cagnotte de{' '}
                  <strong className="text-[#F4B400] text-sm font-black">{totalPot} CR</strong> !
                </p>
              </div>
            </div>
          )}

          {/* 2. CAS DÉFAITE */}
          {isUserLoser && (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                <Frown className="w-10 h-10 text-rose-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">💔 DÉFAITE</h2>
                <p className="text-xs font-mono text-rose-300 mt-1">
                  Victoire de <strong className="text-white">{winnerUsername || 'votre adversaire'}</strong>.{' '}
                  Votre mise de {bet} CR a été engagée.
                </p>
              </div>
            </div>
          )}

          {/* 3. CAS ÉGALITÉ / MATCH NUL */}
          {isGameTie && (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                <Scale className="w-10 h-10 text-purple-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">🤝 MATCH NUL !</h2>
                <p className="text-xs font-mono text-purple-300 mt-1">
                  Les scores sont égaux. Vos crédits de mise (<strong className="text-white">{bet} CR</strong>) ont été automatiquement restitués.
                </p>
              </div>
            </div>
          )}

          {/* 4. CAS PARTIE ANNULÉE */}
          {isCancelled && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
                <Ban className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">🚫 PARTIE ANNULÉE</h2>
                <p className="text-xs font-mono text-gray-300 mt-1">
                  Les crédits engagés ({bet} CR) ont été remboursés aux participants.
                </p>
              </div>
            </div>
          )}

          {/* 5. PROPOSITION DE REVANCHE ACTIVE DE L'ADVERSAIRE */}
          {isOpponentRematchProposal && (
            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/40 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-[#F4B400] mx-auto animate-bounce" />
              <h3 className="text-sm font-extrabold text-white">
                ⚡ Votre adversaire demande une Revanche !
              </h3>
              <p className="text-[11px] font-mono text-yellow-200">
                Mise requise : <strong className="text-white">{bet} CR</strong>
              </p>
            </div>
          )}

          {/* BOUTONS D'ACTION DU DIALOG */}
          <div className="space-y-2 pt-2">
            {/* Cas proposition de revanche de l'adversaire */}
            {isOpponentRematchProposal ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onAcceptRematch}
                  disabled={isRematchLoading || !canAffordRematch}
                  className="py-3 px-4 rounded-xl gold-gradient text-[#0F1117] font-black text-xs uppercase shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accepter ({bet} CR)
                </button>
                <button
                  onClick={onDeclineRematch}
                  disabled={isRematchLoading}
                  className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <X className="w-4 h-4" />
                  Décliner
                </button>
              </div>
            ) : isMyRematchProposal ? (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-center text-xs font-mono text-purple-300">
                ⏳ Demande de revanche envoyée... En attente de votre adversaire.
              </div>
            ) : gameStatus === 'FINISHED' && !isCancelled ? (
              <button
                onClick={onProposeRematch}
                disabled={isRematchLoading || !canAffordRematch}
                className="w-full py-3.5 rounded-2xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase shadow-lg flex items-center justify-center gap-2 gold-glow disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isRematchLoading ? 'animate-spin' : ''}`} />
                {isRematchLoading ? 'Envoi...' : `⚡ Proposer une Revanche (${bet} CR)`}
              </button>
            ) : null}

            {/* Bouton Fermer */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Voir l'Arène de Jeu
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

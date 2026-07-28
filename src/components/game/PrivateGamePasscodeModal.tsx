'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, X, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface PrivateGamePasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  creatorUsername?: string;
  bet: number;
  onSuccess?: () => void;
}

export function PrivateGamePasscodeModal({
  isOpen,
  onClose,
  gameId,
  creatorUsername = 'Joueur',
  bet,
  onSuccess,
}: PrivateGamePasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUnlockAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode || passcode.length < 4) {
      toast.error('Veuillez saisir le code PIN à 4 chiffres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('🔓 Code PIN valide ! Bienvenue dans l’arène.');
        if (onSuccess) onSuccess();
        onClose();
        router.push(`/games/${gameId}`);
      } else {
        toast.error(data.error || 'Code PIN incorrect !');
      }
    } catch {
      toast.error('Erreur réseau lors de la vérification du code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-sm glass-card p-6 rounded-3xl border border-yellow-500/30 shadow-2xl bg-gradient-to-b from-[#1E1B10] to-[#12141D] text-center space-y-5"
          >
            {/* Close Icon */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Lock Header Icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F4B400] to-[#996D00] p-0.5 mx-auto shadow-lg flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#12141D] flex items-center justify-center">
                <Lock className="w-7 h-7 text-[#F4B400] animate-pulse" />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-extrabold flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Salon Privé Sécurisé
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Arène de {creatorUsername}
              </h3>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Mise requise : <span className="text-[#F4B400] font-bold">{bet} CR</span>
              </p>
            </div>

            <form onSubmit={handleUnlockAndJoin} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono text-gray-400 uppercase font-semibold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#F4B400]" /> Code PIN d'accès (4 chiffres)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                  className="w-full bg-[#0F1117] border border-yellow-500/40 rounded-2xl px-4 py-3.5 text-center font-mono text-xl font-black text-[#F4B400] tracking-widest focus:outline-none focus:border-[#F4B400] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || passcode.length < 4}
                className="w-full py-3.5 rounded-2xl gold-gradient text-[#0F1117] font-black text-xs uppercase tracking-wider shadow-xl gold-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  'Déverrouillage...'
                ) : (
                  <>
                    Rejoindre l'Arène <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

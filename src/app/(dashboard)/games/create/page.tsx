'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { GAME_CONFIG } from '@/config/game';
import toast from 'react-hot-toast';
import { Dices, Users, Wallet, ArrowLeft, Plus, Lock, Globe, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function CreateGamePage() {
  const [bet, setBet] = useState(50);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { balance } = useAuthStore();
  const router = useRouter();

  const presetBets = [50, 100, 250, 500, 1000, 2500];

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bet > balance) {
      toast.error('Solde insuffisant dans votre portefeuille !');
      return;
    }

    if (isPrivate && (!passcode || passcode.length < 4)) {
      toast.error('Veuillez saisir un code PIN à 4 chiffres pour votre salon privé.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bet,
          maxPlayers,
          isPrivate,
          passcode: isPrivate ? passcode : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          isPrivate
            ? '🔒 Salon privé créé avec succès ! Transmettez votre code PIN à vos amis.'
            : '🌐 Partie publique créée avec succès ! En attente de joueurs.'
        );
        router.push(`/games/${data.data._id}`);
      } else {
        toast.error(data.error || 'Erreur lors de la création de la partie.');
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-[#1A1D26] text-gray-400 hover:text-white border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white">Créer une Arène</h1>
          <p className="text-xs text-gray-400">Configurez la mise, la confidentialité et les joueurs</p>
        </div>
      </div>

      <form onSubmit={handleCreateGame} className="space-y-5">
        {/* Type de Salon : Public vs Privé */}
        <div className="glass-card p-5 rounded-3xl space-y-3">
          <label className="text-xs font-mono text-gray-400 uppercase font-semibold flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#F4B400]" />
            Confidentialité du salon
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                !isPrivate
                  ? 'bg-purple-950/40 border-[#6C3BFF] purple-glow'
                  : 'bg-[#1A1D26] border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <Globe className="w-5 h-5 text-purple-400" />
                {!isPrivate && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
              </div>
              <h4 className="font-bold text-white text-xs">Public 🌐</h4>
              <p className="text-[10px] text-gray-400">Accessible à tous les joueurs du casino</p>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                isPrivate
                  ? 'bg-yellow-950/40 border-[#F4B400] gold-glow'
                  : 'bg-[#1A1D26] border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <Lock className="w-5 h-5 text-[#F4B400]" />
                {isPrivate && <span className="w-2 h-2 rounded-full bg-[#F4B400]"></span>}
              </div>
              <h4 className="font-bold text-white text-xs">Salon Privé 🔒</h4>
              <p className="text-[10px] text-gray-400">Protégé par un code PIN secret</p>
            </button>
          </div>

          {/* Saisie du Code PIN si Salon Privé */}
          {isPrivate && (
            <div className="pt-2 space-y-2 animate-fadeIn">
              <label className="text-[11px] font-mono text-yellow-400 uppercase font-bold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Code PIN d'accès (4 chiffres)
              </label>
              <input
                type="password"
                maxLength={8}
                placeholder="Ex: 1234"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-[#0F1117] border border-yellow-500/40 rounded-2xl px-4 py-3 text-center font-mono text-lg font-black text-[#F4B400] tracking-widest focus:outline-none focus:border-[#F4B400]"
              />
            </div>
          )}
        </div>

        {/* Bet Selection Card */}
        <div className="glass-card p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-gray-400 uppercase font-semibold flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-[#F4B400]" />
              Montant de la mise (FCFA)
            </label>
            <span className="text-xs font-mono text-gray-400">
              Solde: <strong className="text-[#F4B400]">{balance.toLocaleString()} FCFA</strong>
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              min={GAME_CONFIG.MIN_BET}
              max={GAME_CONFIG.MAX_BET}
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              className="w-full bg-[#0F1117] border border-purple-500/30 rounded-2xl px-4 py-3.5 text-2xl font-mono font-extrabold text-[#F4B400] text-center focus:outline-none focus:border-[#6C3BFF] transition-all"
            />
          </div>

          {/* Presets Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {presetBets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBet(preset)}
                className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all border ${
                  bet === preset
                    ? 'bg-[#6C3BFF] text-white border-[#6C3BFF] purple-glow'
                    : 'bg-[#1A1D26] text-gray-300 border-white/10 hover:border-white/30'
                }`}
              >
                {preset} FCFA
              </button>
            ))}
          </div>
        </div>

        {/* Max Players Selection */}
        <div className="glass-card p-5 rounded-3xl space-y-4">
          <label className="text-xs font-mono text-gray-400 uppercase font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#6C3BFF]" />
            Format de jeu (Joueurs)
          </label>

          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setMaxPlayers(num)}
                className={`py-3 rounded-xl font-mono text-xs font-extrabold transition-all border ${
                  maxPlayers === num
                    ? 'gold-gradient text-[#0F1117] border-[#F4B400] gold-glow'
                    : 'bg-[#1A1D26] text-gray-300 border-white/10 hover:border-white/30'
                }`}
              >
                {num === 2 ? '1v1 (2)' : `${num} Joueurs`}
              </button>
            ))}
          </div>
        </div>

        {/* Pot Preview */}
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between border border-emerald-500/20 bg-emerald-950/20">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Cagnotte Potentielle</span>
            <p className="text-xl font-mono font-extrabold text-white mt-0.5">
              {(bet * maxPlayers).toLocaleString()} FCFA
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
            🏆
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || bet > balance || (isPrivate && passcode.length < 4)}
          className="w-full py-4 rounded-2xl gold-gradient text-[#0F1117] font-extrabold text-sm uppercase tracking-wider shadow-xl gold-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          {isLoading ? 'Création en cours...' : isPrivate ? 'Créer le Salon Privé 🔒' : 'Lancer l\'Arène Publique 🌐'}
        </button>
      </form>
    </div>
  );
}

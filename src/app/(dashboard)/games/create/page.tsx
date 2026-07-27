'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { GAME_CONFIG } from '@/config/game';
import toast from 'react-hot-toast';
import { Dices, Users, Wallet, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CreateGamePage() {
  const [bet, setBet] = useState(50);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const { balance } = useAuthStore();
  const router = useRouter();

  const presetBets = [10, 50, 100, 250, 500, 1000];

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bet > balance) {
      toast.error('Solde insuffisant dans votre portefeuille !');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, maxPlayers }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Partie créée avec succès ! En attente des joueurs.');
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
    <div className="space-y-6">
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
          <p className="text-xs text-gray-400">Configurez la mise et le nombre de joueurs</p>
        </div>
      </div>

      <form onSubmit={handleCreateGame} className="space-y-6">
        {/* Bet Selection Card Stitch */}
        <div className="glass-card p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-gray-400 uppercase font-semibold flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-[#F4B400]" />
              Montant de la mise (Crédits)
            </label>
            <span className="text-xs font-mono text-gray-400">
              Solde: <strong className="text-[#F4B400]">{balance}</strong>
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              min={GAME_CONFIG.MIN_BET}
              max={GAME_CONFIG.MAX_BET}
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              className="w-full bg-[#0F1117] border border-purple-500/30 rounded-2xl px-4 py-4 text-2xl font-mono font-extrabold text-[#F4B400] text-center focus:outline-none focus:border-[#6C3BFF] transition-all"
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
                {preset} CR
              </button>
            ))}
          </div>
        </div>

        {/* Max Players Selection */}
        <div className="glass-card p-5 rounded-3xl space-y-4">
          <label className="text-xs font-mono text-gray-400 uppercase font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#6C3BFF]" />
            Nombre de joueurs
          </label>

          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setMaxPlayers(num)}
                className={`py-3 rounded-xl font-mono text-sm font-extrabold transition-all border ${
                  maxPlayers === num
                    ? 'gold-gradient text-[#0F1117] border-[#F4B400] gold-glow'
                    : 'bg-[#1A1D26] text-gray-300 border-white/10 hover:border-white/30'
                }`}
              >
                {num} Joueurs
              </button>
            ))}
          </div>
        </div>

        {/* Pot Preview */}
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between border border-emerald-500/20 bg-emerald-950/20">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Cagnotte Totale Potentielle</span>
            <p className="text-xl font-mono font-extrabold text-white mt-0.5">
              {(bet * maxPlayers).toLocaleString()} Crédits
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
            🏆
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || bet > balance}
          className="w-full py-4 rounded-2xl gold-gradient text-[#0F1117] font-extrabold text-sm uppercase tracking-wider shadow-xl gold-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          {isLoading ? 'Création en cours...' : 'Lancer l\'Arène de Jeu'}
        </button>
      </form>
    </div>
  );
}

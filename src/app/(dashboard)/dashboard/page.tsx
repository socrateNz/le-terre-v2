'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Dices, Trophy, TrendingUp, Sparkles, ArrowUpRight, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, balance, setBalance } = useAuthStore();

  const { data: gamesData, isLoading: isGamesLoading, refetch: refetchGames } = useQuery({
    queryKey: ['activeGames'],
    queryFn: async () => {
      const res = await fetch('/api/games');
      const data = await res.json();
      return data.success ? data.data : [];
    },
    refetchInterval: 4000,
  });

  const handleAddTestCredit = async () => {
    try {
      const res = await fetch('/api/wallet/credit', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBalance(data.data.balance);
        toast.success('+100 Crédits de test ajoutés avec succès !');
      } else {
        toast.error(data.error || 'Erreur lors du crédit de test.');
      }
    } catch {
      toast.error('Erreur réseau.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Welcome Greeting Stitch */}
      <div className="glass-card p-5 rounded-3xl relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-[#1A1D26] via-[#1A1D26] to-[#261B4E]">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#6C3BFF]/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#F4B400] font-semibold uppercase tracking-wider">
                Elite Digital Casino
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              Salut, {user?.username} 👋
            </h2>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] p-0.5 shadow-lg flex items-center justify-center">
            <span className="font-extrabold text-white text-lg uppercase">
              {user?.username?.substring(0, 2) || 'LT'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <Link
            href="/games/create"
            className="py-3 px-4 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all uppercase tracking-wide"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Créer une Partie
          </Link>

          <button
            onClick={handleAddTestCredit}
            className="py-3 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#F4B400]" />
            +100 Crédits Démo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3.5 rounded-2xl text-center">
          <p className="text-[10px] font-mono text-gray-400 uppercase">Solde Actuel</p>
          <p className="text-lg font-extrabold font-mono text-[#F4B400] mt-1">
            {balance.toLocaleString()}
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <p className="text-[10px] font-mono text-gray-400 uppercase">Statut Wallet</p>
          <p className="text-sm font-extrabold text-emerald-400 mt-1 flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Actif
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <p className="text-[10px] font-mono text-gray-400 uppercase">Mode de jeu</p>
          <p className="text-xs font-extrabold text-purple-300 mt-1 uppercase">1v1 & Groupe</p>
        </div>
      </div>

      {/* Active Games Arena */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Dices className="w-5 h-5 text-[#6C3BFF]" />
            Arènes Ouvertes
          </h3>

          <Link
            href="/games/join"
            className="text-xs font-mono text-[#F4B400] hover:underline flex items-center gap-0.5"
          >
            Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isGamesLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card p-4 rounded-2xl h-24 animate-pulse bg-white/5"></div>
            ))}
          </div>
        ) : !gamesData || gamesData.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <Dices className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-40 animate-spin" />
            <p className="text-sm text-gray-300 font-bold">Aucune arène ouverte actuellement</p>
            <p className="text-xs text-gray-500 mt-1">Soyez le premier à lancer un défi !</p>
            <Link
              href="/games/create"
              className="mt-4 inline-flex items-center gap-2 py-2 px-4 rounded-xl gold-gradient text-[#0F1117] font-bold text-xs uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> Créer une partie
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {gamesData.slice(0, 4).map((game: any) => (
              <div
                key={game._id}
                className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-purple-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-sm">
                    {game.creator?.username?.substring(0, 2).toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      Partie de {game.creator?.username || 'Joueur'}
                    </h4>
                    <p className="text-xs font-mono text-gray-400">
                      Mise : <span className="text-[#F4B400] font-bold">{game.bet} crédits</span> • Joueurs : {game.players?.length}/{game.maxPlayers}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/games/${game._id}`}
                  className="py-2 px-3.5 rounded-xl bg-[#6C3BFF] hover:bg-[#5b2ee6] text-white font-bold text-xs shadow-md transition-all"
                >
                  Rejoindre
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

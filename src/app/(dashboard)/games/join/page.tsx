'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { ArrowLeft, Dices, Users, Plus, RefreshCw, AlertCircle } from 'lucide-react';

export default function JoinGamePage() {
  const { balance } = useAuthStore();
  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['joinGames'],
    queryFn: async () => {
      const res = await fetch('/api/games');
      const data = await res.json();
      return data.success ? data.data : [];
    },
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[#1A1D26] text-gray-400 hover:text-white border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white">Rejoindre une Arène</h1>
            <p className="text-xs text-gray-400">Sélectionnez une partie pour affronter des joueurs</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl bg-[#1A1D26] text-purple-400 hover:text-purple-300 border border-purple-500/20"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Games List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 rounded-2xl h-24 animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : !games || games.length === 0 ? (
        <div className="glass-card p-10 rounded-3xl text-center space-y-3">
          <Dices className="w-12 h-12 text-purple-400 mx-auto opacity-50 animate-bounce" />
          <h3 className="text-base font-extrabold text-white">Aucune partie disponible</h3>
          <p className="text-xs text-gray-400">
            Il n'y a pas d'arène en attente pour le moment.
          </p>
          <Link
            href="/games/create"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase shadow-lg gold-glow mt-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Créer une nouvelle partie
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game: any) => {
            const hasInsufficientBalance = balance < game.bet;

            return (
              <div
                key={game._id}
                className={`glass-card p-5 rounded-2xl border transition-all flex items-center justify-between ${
                  hasInsufficientBalance ? 'border-rose-500/20 bg-rose-950/10' : 'border-white/5 hover:border-purple-500/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400 font-bold">
                      ID #{game._id.substring(game._id.length - 6).toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      {game.status}
                    </span>
                    {hasInsufficientBalance && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Solde insuffisant
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-white text-base">
                    Hôte : {game.creator?.username || 'Joueur'}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                    <span>
                      Mise: <strong className="text-[#F4B400]">{game.bet} CR</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      {game.players?.length}/{game.maxPlayers}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/games/${game._id}`}
                  className={`py-2.5 px-5 rounded-xl font-extrabold text-xs shadow-lg transition-all uppercase tracking-wider ${
                    hasInsufficientBalance
                      ? 'bg-gray-800 text-gray-400 border border-white/10 hover:bg-gray-700'
                      : 'bg-gradient-to-r from-[#6C3BFF] to-[#4b00d4] hover:opacity-95 text-white purple-glow'
                  }`}
                >
                  Voir
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

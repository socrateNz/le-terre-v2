'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Dices,
  Trophy,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Shield,
  Search,
  Lock,
  Globe,
  Filter,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PrivateGamePasscodeModal } from '@/components/game/PrivateGamePasscodeModal';

export default function DashboardPage() {
  const { user, balance } = useAuthStore();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selectedBetRange, setSelectedBetRange] = useState<'ALL' | 'SMALL' | 'MEDIUM' | 'VIP'>('ALL');
  const [selectedPrivateFilter, setSelectedPrivateFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');

  // Modal de déverrouillage de salon privé
  const [selectedPrivateGame, setSelectedPrivateGame] = useState<any | null>(null);

  const { data: gamesData, isLoading: isGamesLoading } = useQuery({
    queryKey: ['activeGames', search, selectedBetRange, selectedPrivateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedPrivateFilter === 'PUBLIC') params.set('isPrivate', 'false');
      if (selectedPrivateFilter === 'PRIVATE') params.set('isPrivate', 'true');

      if (selectedBetRange === 'SMALL') {
        params.set('maxBet', '100');
      } else if (selectedBetRange === 'MEDIUM') {
        params.set('minBet', '100');
        params.set('maxBet', '500');
      } else if (selectedBetRange === 'VIP') {
        params.set('minBet', '500');
      }

      const res = await fetch(`/api/games?${params.toString()}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    refetchInterval: 3000,
  });

  const handleGameClick = (game: any) => {
    const isUserInGame = game.players?.some(
      (p: any) => (p.user?._id || p.user) === user?.id
    );

    if (game.isPrivate && !isUserInGame) {
      setSelectedPrivateGame(game);
    } else {
      router.push(`/games/${game._id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Banner / Welcome Greeting */}
      <div className="glass-card p-5 rounded-3xl relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-[#1A1D26] via-[#1A1D26] to-[#261B4E]">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#6C3BFF]/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#F4B400] font-semibold uppercase tracking-wider">
                Le Terre Digital Casino
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

          <Link
            href="/wallet"
            className="py-3 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wide"
          >
            <Wallet className="w-4 h-4 text-[#F4B400]" />
            Recharger Solde
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3.5 rounded-2xl text-center">
          <p className="text-[10px] font-mono text-gray-400 uppercase">Solde Actuel</p>
          <p className="text-lg font-extrabold font-mono text-[#F4B400] mt-1">
            {balance.toLocaleString()} FCFA
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <p className="text-[10px] font-mono text-gray-400 uppercase">Statut Wallet</p>
          <p className="text-xs font-extrabold text-emerald-400 mt-1 flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Vérifié
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <p className="text-[10px] font-mono text-gray-400 uppercase">Modes de jeu</p>
          <p className="text-xs font-extrabold text-purple-300 mt-1 uppercase">1v1 & Groupes</p>
        </div>
      </div>

      {/* Active Games Arena with Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Dices className="w-5 h-5 text-[#6C3BFF]" />
            Arènes en Direct
          </h3>

          <Link
            href="/games/join"
            className="text-xs font-mono text-[#F4B400] hover:underline flex items-center gap-0.5"
          >
            Recherche avancée <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Barre de Recherche et Filtres Rapides */}
        <div className="glass-card p-3 rounded-2xl space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par pseudo d'hôte ou ID d'arène..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0F1117] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#6C3BFF]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Filtre Confidentialité */}
            <div className="flex items-center gap-1 bg-[#0F1117] p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setSelectedPrivateFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  selectedPrivateFilter === 'ALL'
                    ? 'bg-[#6C3BFF] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setSelectedPrivateFilter('PUBLIC')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                  selectedPrivateFilter === 'PUBLIC'
                    ? 'bg-[#6C3BFF] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" /> Publics
              </button>
              <button
                onClick={() => setSelectedPrivateFilter('PRIVATE')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                  selectedPrivateFilter === 'PRIVATE'
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Lock className="w-3 h-3 text-[#F4B400]" /> Privés
              </button>
            </div>

            {/* Filtre Niveau de Mise */}
            <div className="flex items-center gap-1 bg-[#0F1117] p-1 rounded-xl border border-white/5">
              {[
                { id: 'ALL', label: 'Toutes Mises' },
                { id: 'SMALL', label: '< 100 FCFA' },
                { id: 'MEDIUM', label: '100-500 FCFA' },
                { id: 'VIP', label: '> 500 FCFA' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setSelectedBetRange(chip.id as any)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    selectedBetRange === chip.id
                      ? 'bg-amber-500/20 text-[#F4B400] border border-amber-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des Arènes Filtres */}
        {isGamesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 rounded-2xl h-20 animate-pulse bg-white/5"></div>
            ))}
          </div>
        ) : !gamesData || gamesData.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center space-y-3">
            <Dices className="w-10 h-10 text-gray-500 mx-auto opacity-40 animate-spin" />
            <p className="text-sm text-gray-300 font-bold">Aucune arène ne correspond à vos filtres</p>
            <p className="text-xs text-gray-500">Essayez de réinitialiser la recherche ou créez votre propre partie !</p>
            <Link
              href="/games/create"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl gold-gradient text-[#0F1117] font-bold text-xs uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> Créer une partie
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {gamesData.map((game: any) => {
              const isUserInGame = game.players?.some(
                (p: any) => (p.user?._id || p.user) === user?.id
              );

              return (
                <div
                  key={game._id}
                  onClick={() => handleGameClick(game)}
                  className={`glass-card p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                    game.isPrivate
                      ? 'border-yellow-500/30 bg-yellow-950/10 hover:border-yellow-500/60'
                      : 'border-white/5 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        game.isPrivate
                          ? 'bg-yellow-500/20 text-[#F4B400] border border-yellow-500/40'
                          : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {game.isPrivate ? (
                        <Lock className="w-4 h-4 text-[#F4B400]" />
                      ) : (
                        game.creator?.username?.substring(0, 2).toUpperCase() || 'LT'
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs">
                          {game.creator?.username || 'Joueur'}
                        </h4>
                        {game.isPrivate && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[9px] font-mono font-extrabold border border-yellow-500/40">
                            Privé 🔒
                          </span>
                        )}
                        {isUserInGame && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold">
                            Inscrit
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                        Mise: <span className="text-[#F4B400] font-bold">{game.bet} FCFA</span> • Pot: {game.totalPot} FCFA • {game.players?.length}/{game.maxPlayers} Joueurs
                      </p>
                    </div>
                  </div>

                  <button
                    className={`py-1.5 px-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 ${
                      game.isPrivate && !isUserInGame
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30'
                        : isUserInGame
                        ? 'bg-[#6C3BFF] hover:bg-[#5b2ee6] text-white'
                        : 'bg-[#6C3BFF] hover:bg-[#5b2ee6] text-white'
                    }`}
                  >
                    {game.isPrivate && !isUserInGame ? (
                      <>
                        <Lock className="w-3 h-3 text-[#F4B400]" /> Déverrouiller
                      </>
                    ) : isUserInGame ? (
                      'Entrer'
                    ) : (
                      'Rejoindre'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Déverrouillage Code PIN Salon Privé */}
      {selectedPrivateGame && (
        <PrivateGamePasscodeModal
          isOpen={Boolean(selectedPrivateGame)}
          onClose={() => setSelectedPrivateGame(null)}
          gameId={selectedPrivateGame._id}
          creatorUsername={selectedPrivateGame.creator?.username}
          bet={selectedPrivateGame.bet}
        />
      )}
    </div>
  );
}

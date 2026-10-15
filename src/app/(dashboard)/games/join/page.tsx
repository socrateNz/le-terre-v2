'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Dices,
  Users,
  Plus,
  RefreshCw,
  AlertCircle,
  Search,
  Lock,
  Globe,
} from 'lucide-react';
import { PrivateGamePasscodeModal } from '@/components/game/PrivateGamePasscodeModal';
import type { ApiGame, ApiGamePlayer } from '@/types';
import { refId, refUser } from '@/lib/refs';

export default function JoinGamePage() {
  const { user, balance } = useAuthStore();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING_FOR_PLAYERS' | 'FINISHED'>('WAITING_FOR_PLAYERS');
  const [betFilter, setBetFilter] = useState<'ALL' | 'SMALL' | 'MEDIUM' | 'VIP'>('ALL');
  const [privateFilter, setPrivateFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [selectedPrivateGame, setSelectedPrivateGame] = useState<ApiGame | null>(null);

  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['joinGames', search, statusFilter, betFilter, privateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (privateFilter === 'PUBLIC') params.set('isPrivate', 'false');
      if (privateFilter === 'PRIVATE') params.set('isPrivate', 'true');

      if (betFilter === 'SMALL') {
        params.set('maxBet', '100');
      } else if (betFilter === 'MEDIUM') {
        params.set('minBet', '100');
        params.set('maxBet', '500');
      } else if (betFilter === 'VIP') {
        params.set('minBet', '500');
      }

      const res = await fetch(`/api/games?${params.toString()}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    refetchInterval: 3000,
  });

  const handleGameClick = (game: ApiGame) => {
    const isUserInGame = game.players?.some(
      (p: ApiGamePlayer) => refId(p.user) === user?.id
    );

    if (game.isPrivate && !isUserInGame) {
      setSelectedPrivateGame(game);
    } else {
      router.push(`/games/${game._id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
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
            <h1 className="text-xl font-extrabold text-white">Recherche & Liste des Arènes</h1>
            <p className="text-xs text-gray-400">Trouvez une partie publique ou entrez le code PIN d&apos;un salon privé</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl bg-[#1A1D26] text-purple-400 hover:text-purple-300 border border-purple-500/20 shadow"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Barre de Recherche et Filtres Globaux */}
      <div className="glass-card p-4 rounded-3xl space-y-4">
        {/* Input de Recherche */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par pseudo d'hôte, ID d'arène..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0F1117] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#6C3BFF]"
          />
        </div>

        {/* Onglets de Statut */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          {[
            { id: 'WAITING_FOR_PLAYERS', label: 'En Attente ⏳' },
            { id: 'FINISHED', label: 'Terminées 🏆' },
            { id: 'ALL', label: 'Toutes les arènes 🌐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#6C3BFF] text-white shadow-md'
                  : 'bg-[#1A1D26] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sous-Filtres : Confidentialité & Tranche de Mise */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Confidentialité */}
          <div className="flex items-center gap-1 bg-[#0F1117] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setPrivateFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                privateFilter === 'ALL' ? 'bg-purple-900/60 text-purple-200' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setPrivateFilter('PUBLIC')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                privateFilter === 'PUBLIC' ? 'bg-purple-900/60 text-purple-200' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3 text-purple-400" /> Publics
            </button>
            <button
              onClick={() => setPrivateFilter('PRIVATE')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                privateFilter === 'PRIVATE' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3 text-[#F4B400]" /> Salons Privés 🔒
            </button>
          </div>

          {/* Niveau de Mise */}
          <div className="flex items-center gap-1 bg-[#0F1117] p-1 rounded-xl border border-white/5">
            {[
              { id: 'ALL', label: 'Toutes Mises' },
              { id: 'SMALL', label: '< 100 FCFA' },
              { id: 'MEDIUM', label: '100-500 FCFA' },
              { id: 'VIP', label: '> 500 FCFA' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setBetFilter(chip.id as typeof betFilter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  betFilter === chip.id
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
          <h3 className="text-base font-extrabold text-white">Aucune arène ne correspond à vos filtres</h3>
          <p className="text-xs text-gray-400">
            Modifiez vos filtres de recherche ou créez votre propre arène de jeu !
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
          {games.map((game: ApiGame) => {
            const hasInsufficientBalance = balance < game.bet;
            const isUserInGame = game.players?.some(
              (p: ApiGamePlayer) => refId(p.user) === user?.id
            );

            return (
              <div
                key={game._id}
                onClick={() => handleGameClick(game)}
                className={`glass-card p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  game.isPrivate
                    ? 'border-yellow-500/30 bg-yellow-950/10 hover:border-yellow-500/60'
                    : hasInsufficientBalance
                    ? 'border-rose-500/20 bg-rose-950/10'
                    : 'border-white/5 hover:border-purple-500/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400 font-bold">
                      ID #{game._id.substring(game._id.length - 6).toUpperCase()}
                    </span>

                    {game.isPrivate && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-mono text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#F4B400]" /> Privé 🔒
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      {game.status === 'WAITING_FOR_PLAYERS'
                        ? 'En attente'
                        : game.status === 'FINISHED'
                        ? 'Terminée'
                        : game.status}
                    </span>

                    {hasInsufficientBalance && !isUserInGame && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Solde insuffisant
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-white text-base">
                    Hôte : {refUser(game.creator)?.username || 'Joueur'}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                    <span>
                      Mise: <strong className="text-[#F4B400]">{game.bet} FCFA</strong>
                    </span>
                    <span>
                      Cagnotte: <strong className="text-emerald-400">{game.totalPot} FCFA</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      {game.players?.length}/{game.maxPlayers}
                    </span>
                  </div>
                </div>

                <button
                  className={`py-2.5 px-5 rounded-xl font-extrabold text-xs shadow-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                    game.isPrivate && !isUserInGame
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30'
                      : hasInsufficientBalance && !isUserInGame
                      ? 'bg-gray-800 text-gray-400 border border-white/10 hover:bg-gray-700'
                      : 'bg-gradient-to-r from-[#6C3BFF] to-[#4b00d4] hover:opacity-95 text-white purple-glow'
                  }`}
                >
                  {game.isPrivate && !isUserInGame ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-[#F4B400]" /> PIN
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

      {/* Modal Déverrouillage Code PIN Salon Privé */}
      {selectedPrivateGame && (
        <PrivateGamePasscodeModal
          isOpen={Boolean(selectedPrivateGame)}
          onClose={() => setSelectedPrivateGame(null)}
          gameId={selectedPrivateGame._id}
          creatorUsername={refUser(selectedPrivateGame.creator)?.username}
          bet={selectedPrivateGame.bet}
        />
      )}
    </div>
  );
}

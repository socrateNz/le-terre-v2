'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe,
  Trophy,
  LogOut,
  Edit3,
  ShieldCheck,
  Dices,
  TrendingUp,
  Frown,
  Scale,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ApiGame, ApiGamePlayer } from '@/types';
import { refId, refUser } from '@/lib/refs';

export default function ProfilePage() {
  const { user, balance, logout, fetchCurrentUser } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [country, setCountry] = useState(user?.country || 'CM');
  const [isUpdating, setIsUpdating] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'WINS' | 'LOSSES' | 'ACTIVE'>('ALL');
  const router = useRouter();

  // Chargement de l'historique et statistiques via /api/profile
  const { data: profileData, isLoading: isProfileLoading, refetch } = useQuery({
    queryKey: ['profileDetails', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/profile');
      const data = await res.json();
      return data.success ? data.data : null;
    },
    enabled: !!user?.id,
  });

  const stats = profileData?.stats || {
    totalGames: 0,
    finishedGamesCount: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    winRate: 0,
    netProfit: 0,
  };

  const history = profileData?.history || [];

  // Filtrage local de l'historique des parties
  const filteredHistory = history.filter((game: ApiGame) => {
    const isWinner = refId(game.winner) === user?.id;
    const isLoser = game.status === 'FINISHED' && game.winner && !isWinner;

    if (historyFilter === 'WINS') return isWinner;
    if (historyFilter === 'LOSSES') return isLoser;
    if (historyFilter === 'ACTIVE') return game.status !== 'FINISHED' && game.status !== 'CANCELLED';
    return true;
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, country }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Profil mis à jour avec succès !');
        await fetchCurrentUser();
        refetch();
        setShowEditModal(false);
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnecté avec succès.');
    router.push('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Profile Header Stitch Card */}
      <div className="glass-card p-6 rounded-3xl border border-purple-500/30 text-center relative overflow-hidden bg-gradient-to-br from-[#1A1D26] via-[#1A1D26] to-[#261B4E]">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#6C3BFF]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] p-1 shadow-xl purple-glow mx-auto flex items-center justify-center">
            <span className="font-extrabold text-white text-3xl uppercase">
              {user?.username?.substring(0, 2) || 'LT'}
            </span>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute bottom-0 right-0 p-1.5 rounded-xl gold-gradient text-[#0F1117] shadow-md hover:scale-105 transition-all"
            title="Modifier le profil"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        <h2 className="text-xl font-extrabold text-white">{user?.username}</h2>
        <p className="text-xs font-mono text-gray-400 mt-0.5">{user?.email}</p>

        <div className="flex items-center justify-center gap-3 mt-3 text-xs font-mono text-purple-300">
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-[#F4B400]" />
            {user?.country === 'CM' ? '🇨🇲 Cameroun' : user?.country || 'International'}
          </span>
          <span>•</span>
          <span className="text-[#F4B400] font-bold">Solde: {balance.toLocaleString()} FCFA</span>
        </div>
      </div>

      {/* Advanced Statistics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl text-center">
          <Dices className="w-5 h-5 text-[#6C3BFF] mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Parties Jouées</p>
          <p className="text-lg font-extrabold font-mono text-white mt-0.5">
            {stats.totalGames}
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <Trophy className="w-5 h-5 text-[#F4B400] mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Victoires</p>
          <p className="text-lg font-extrabold font-mono text-[#F4B400] mt-0.5">
            {stats.wins}
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Taux de Victoire</p>
          <p className="text-lg font-extrabold font-mono text-emerald-400 mt-0.5">
            {stats.winRate}%
          </p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Gain Net</p>
          <p
            className={`text-lg font-extrabold font-mono mt-0.5 ${
              stats.netProfit > 0
                ? 'text-emerald-400'
                : stats.netProfit < 0
                ? 'text-rose-400'
                : 'text-gray-300'
            }`}
          >
            {stats.netProfit > 0 ? `+${stats.netProfit}` : stats.netProfit} FCFA
          </p>
        </div>
      </div>

      {/* Historique Détaillé des Parties */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#6C3BFF]" />
            Historique des Parties
          </h3>

          {/* Onglets de filtrage */}
          <div className="flex items-center gap-1 bg-[#0F1117] p-1 rounded-xl border border-white/5">
            {[
              { id: 'ALL', label: 'Toutes' },
              { id: 'WINS', label: 'Victoires 🏆' },
              { id: 'LOSSES', label: 'Défaites 💔' },
              { id: 'ACTIVE', label: 'En cours 🎲' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHistoryFilter(tab.id as typeof historyFilter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  historyFilter === tab.id
                    ? 'bg-[#6C3BFF] text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isProfileLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 rounded-2xl h-20 animate-pulse bg-white/5"></div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center space-y-2">
            <Dices className="w-10 h-10 text-gray-500 mx-auto opacity-40 animate-spin" />
            <p className="text-sm font-bold text-gray-300">Aucune partie dans cet historique</p>
            <p className="text-xs text-gray-500">Jouez dans l&apos;arène pour enregistrer vos statistiques !</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHistory.map((game: ApiGame) => {
              const myPlayerDoc = game.players?.find(
                (p: ApiGamePlayer) => refId(p.user) === user?.id
              );

              const opponentDoc = game.players?.find(
                (p: ApiGamePlayer) => refId(p.user) !== user?.id
              );

              const isWinner = refId(game.winner) === user?.id;
              const isFinished = game.status === 'FINISHED';
              const isTie = isFinished && !game.winner;

              return (
                <div
                  key={game._id}
                  className={`glass-card p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isWinner
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : isTie
                      ? 'border-purple-500/30 bg-purple-950/20'
                      : isFinished
                      ? 'border-rose-500/30 bg-rose-950/20'
                      : 'border-white/10 bg-[#12141D]'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Icon Status Badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        isWinner
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isTie
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : isFinished
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      }`}
                    >
                      {isWinner ? (
                        <Trophy className="w-5 h-5 text-emerald-400" />
                      ) : isTie ? (
                        <Scale className="w-5 h-5 text-purple-300" />
                      ) : isFinished ? (
                        <Frown className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Dices className="w-5 h-5 text-yellow-300 animate-pulse" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs truncate">
                          vs {refUser(opponentDoc?.user)?.username || 'Adversaire'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                            isWinner
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isTie
                              ? 'bg-purple-500/20 text-purple-300'
                              : isFinished
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {isWinner
                            ? `Gagné (+${game.totalPot - game.bet} FCFA)`
                            : isTie
                            ? 'Match Nul'
                            : isFinished
                            ? `Perdu (-${game.bet} FCFA)`
                            : 'En cours'}
                        </span>
                      </div>

                      <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                        Score :{' '}
                        <strong className="text-white">
                          {myPlayerDoc && myPlayerDoc.total > 0 ? `${myPlayerDoc.total} pt(s)` : '?'}
                        </strong>{' '}
                        • Mise : <span className="text-[#F4B400] font-bold">{game.bet} FCFA</span> •{' '}
                        {new Date(game.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/games/${game._id}`}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 flex-shrink-0"
                    title="Voir l'arène"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all uppercase tracking-wider"
      >
        <LogOut className="w-4 h-4" />
        Se déconnecter de la session
      </button>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-purple-500/30 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#F4B400]" /> Modifier mon profil
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400">Pseudo d&apos;affichage</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1 focus:border-[#6C3BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1 focus:border-[#6C3BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400">Pays de résidence</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1 focus:border-[#6C3BFF] focus:outline-none"
                >
                  <option value="CM">🇨🇲 Cameroun</option>
                  <option value="CI">🇨🇮 Côte d&apos;Ivoire</option>
                  <option value="SN">🇸🇳 Sénégal</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="OTHER">🌍 Autre / International</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-[#1A1D26] text-gray-400 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-1/2 py-3 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase shadow-md"
                >
                  {isUpdating ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

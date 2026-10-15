'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Users,
  Wallet,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Search,
  Dices,
  RefreshCw,
  Clock,
  Ban,
  Plus,
  Minus,
  DollarSign,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { refUser } from '@/lib/refs';
import type { ApiGame, ApiWithdrawRequest, ApiAdminUser } from '@/types';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'WITHDRAWALS' | 'USERS' | 'GAMES'>('OVERVIEW');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<ApiAdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Statistiques globales admin
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      return data.success ? data.data : null;
    },
  });

  // 2. Liste des demandes de retrait
  const { data: withdrawalsData, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['adminWithdrawals'],
    queryFn: async () => {
      const res = await fetch('/api/admin/withdrawals');
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  // 3. Liste des utilisateurs
  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', userSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set('search', userSearch.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  // 4. Liste des arènes actives
  const { data: gamesData, refetch: refetchGames } = useQuery({
    queryKey: ['adminGames'],
    queryFn: async () => {
      const res = await fetch('/api/games');
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const handleSyncPayments = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/sync-payments', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        refetchStats();
      } else {
        toast.error(data.error || 'Erreur de synchronisation.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawalAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    // Codees ne propose pas de virement sortant : l'admin envoie l'argent lui-même puis saisit la référence
    let payoutReference: string | undefined;
    if (action === 'APPROVE') {
      const input = window.prompt(
        'Effectuez d\'abord le virement Mobile Money au joueur, puis saisissez sa référence (ID de transaction opérateur) :'
      );
      if (!input?.trim()) return;
      payoutReference = input.trim();
    } else if (!window.confirm('Rejeter cette demande et restituer les fonds au joueur ?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, payoutReference }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Traitement réussi !');
        refetchWithdrawals();
        refetchStats();
      } else {
        toast.error(data.error || 'Erreur lors du traitement.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserRole = async (targetUser: ApiAdminUser) => {
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Voulez-vous vraiment passer ${targetUser.username} au rôle ${newRole} ?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser._id,
          action: 'CHANGE_ROLE',
          newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        refetchUsers();
      } else {
        toast.error(data.error || 'Erreur rôle.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustUserBalance = async (isCredit: boolean) => {
    if (!selectedUserForBalance) return;
    const finalAmount = isCredit ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUserForBalance._id,
          action: 'ADJUST_BALANCE',
          amount: finalAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        refetchUsers();
        refetchStats();
        setSelectedUserForBalance(null);
      } else {
        toast.error(data.error || 'Erreur solde.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelGameByAdmin = async (gameId: string) => {
    if (!confirm('Voulez-vous vraiment forcer l’annulation et le remboursement de cette partie ?')) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Partie annulée et joueurs remboursés !');
        refetchGames();
        refetchStats();
      } else {
        toast.error(data.error || 'Erreur annulation.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gardien d'accès réservé aux administrateurs
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="glass-card p-10 rounded-3xl text-center max-w-md mx-auto my-12 space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-extrabold text-white">Accès Réservé</h2>
        <p className="text-xs text-gray-400">
          Vous devez disposer du rôle Administrateur pour accéder à ce panneau.
        </p>
        <Link
          href="/dashboard"
          className="inline-block py-2.5 px-5 rounded-xl gold-gradient text-[#0F1117] font-bold text-xs uppercase"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#e2e2eb] p-3 md:p-6 max-w-5xl mx-auto space-y-6 pb-24 select-none">
      {/* Header Bar */}
      <div className="glass-card p-4 rounded-3xl border border-purple-500/30 flex items-center justify-between gap-3 bg-gradient-to-r from-[#1A1D26] to-[#261B4E]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[#1A1D26] text-gray-400 hover:text-white border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#F4B400]" />
              Panneau Administrateur
            </h1>
            <p className="text-xs text-purple-300">Gestion globale et modération de Le Terre</p>
          </div>
        </div>

        <button
          onClick={() => {
            refetchStats();
            refetchWithdrawals();
            refetchUsers();
            refetchGames();
          }}
          className="p-2 rounded-xl bg-[#1A1D26] text-purple-400 hover:text-purple-300 border border-purple-500/30 shadow"
          title="Actualiser les données"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Onglets de Navigation Admin */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
        {[
          { id: 'OVERVIEW', label: 'Vue d\'Ensemble 📊' },
          { id: 'WITHDRAWALS', label: `Retraits 💳 (${statsData?.pendingWithdrawalsCount || 0})` },
          { id: 'USERS', label: `Joueurs 👥 (${statsData?.totalUsers || 0})` },
          { id: 'GAMES', label: `Modération Arènes 🎲` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2.5 rounded-2xl font-mono text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#6C3BFF] text-white shadow-lg purple-glow'
                : 'bg-[#1A1D26] text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: VUE D'ENSEMBLE & KPIS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-4 rounded-2xl border border-purple-500/30">
              <Users className="w-5 h-5 text-purple-400 mb-1" />
              <p className="text-[10px] font-mono text-gray-400 uppercase">Total Joueurs</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">
                {statsData?.totalUsers || 0}
              </p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-yellow-500/30">
              <Wallet className="w-5 h-5 text-[#F4B400] mb-1" />
              <p className="text-[10px] font-mono text-gray-400 uppercase">Solde en Circulation</p>
              <p className="text-xl font-mono font-extrabold text-[#F4B400] mt-1">
                {statsData?.totalCirculatingBalance?.toLocaleString() || 0} FCFA
              </p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-emerald-500/30">
              <Dices className="w-5 h-5 text-emerald-400 mb-1" />
              <p className="text-[10px] font-mono text-gray-400 uppercase">Arènes Actives</p>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">
                {statsData?.activeGamesCount || 0}
              </p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-rose-500/30">
              <Clock className="w-5 h-5 text-rose-400 mb-1" />
              <p className="text-[10px] font-mono text-gray-400 uppercase">Retraits en Attente</p>
              <p className="text-2xl font-mono font-extrabold text-rose-400 mt-1">
                {statsData?.pendingWithdrawalsCount || 0}
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Statut du Système Le Terre
              </span>
              <h3 className="text-base font-black text-white">Tous les services sont opérationnels</h3>
              <p className="text-xs text-gray-400">MongoDB Transactional Engine • Codees Mobile Money • Stripe</p>
            </div>
            <button
              onClick={handleSyncPayments}
              disabled={isSubmitting}
              className="py-2 px-3.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Synchroniser les dépôts
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: DEMANDES DE RETRAIT */}
      {activeTab === 'WITHDRAWALS' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-white text-base">Demandes de Retrait des Joueurs</h3>

          {!withdrawalsData || withdrawalsData.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto opacity-40" />
              <p className="text-sm font-bold text-gray-300">Aucune demande de retrait</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawalsData.map((req: ApiWithdrawRequest) => (
                <div
                  key={req._id}
                  className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">
                        {refUser(req.user)?.username || 'Joueur'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                        {req.provider}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {req.status === 'pending'
                          ? 'En Attente'
                          : req.status === 'approved'
                          ? 'Approuvé'
                          : 'Rejeté'}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-gray-300">
                      Montant demandé : <strong className="text-[#F4B400]">{req.amount} FCFA</strong> • Net à verser : <strong className="text-emerald-400">{req.netAmount} FCFA</strong>
                    </p>

                    {req.accountDetails?.phone && (
                      <p className="text-xs font-mono text-purple-300">
                        N° Téléphone Mobile Money : <strong>{req.accountDetails.phone}</strong>
                      </p>
                    )}

                    {req.payoutReference && (
                      <p className="text-xs font-mono text-emerald-300">
                        Réf. virement : <strong>{req.payoutReference}</strong>
                      </p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleWithdrawalAction(req._id, 'APPROVE')}
                        disabled={isSubmitting}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approuver
                      </button>
                      <button
                        onClick={() => handleWithdrawalAction(req._id, 'REJECT')}
                        disabled={isSubmitting}
                        className="py-2 px-3.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GESTION DES JOUEURS */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-extrabold text-white text-base">Gestion des Utilisateurs</h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher pseudo ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#0F1117] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#6C3BFF]"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {usersData?.map((u: ApiAdminUser) => (
              <div
                key={u._id}
                className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] flex items-center justify-center font-extrabold text-white text-xs flex-shrink-0">
                    {u.username?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{u.username}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-[#F4B400] border border-amber-500/40'
                            : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-400">
                      {u.email} • Solde : <strong className="text-[#F4B400]">{u.balance} FCFA</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedUserForBalance(u)}
                    className="py-1.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 font-bold text-xs flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#F4B400]" /> Ajuster Solde
                  </button>
                  <button
                    onClick={() => handleToggleUserRole(u)}
                    className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs"
                  >
                    Rôle ({u.role === 'ADMIN' ? 'Retirer' : 'Admin'})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MODÉRATION DES ARÈNES */}
      {activeTab === 'GAMES' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-white text-base">Modération des Arènes Actives</h3>

          <div className="space-y-3">
            {gamesData?.map((game: ApiGame) => (
              <div
                key={game._id}
                className="glass-card p-4 rounded-2xl flex items-center justify-between border border-white/10"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Partie de {refUser(game.creator)?.username || 'Joueur'}
                  </h4>
                  <p className="text-xs font-mono text-gray-400">
                    Mise : <strong className="text-[#F4B400]">{game.bet} FCFA</strong> • Statut: {game.status} • Joueurs: {game.players?.length}/{game.maxPlayers}
                  </p>
                </div>

                {game.status !== 'FINISHED' && game.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleCancelGameByAdmin(game._id)}
                    className="py-2 px-3.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" /> Forcer l&apos;Annulation
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Ajustement Manuel de Solde */}
      {selectedUserForBalance && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-sm border border-purple-500/30 space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#F4B400]" /> Ajustement de Solde
            </h3>
            <p className="text-xs font-mono text-gray-400">
              Joueur : <strong className="text-white">{selectedUserForBalance.username}</strong> (Solde actuel : {selectedUserForBalance.balance} FCFA)
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-400">Montant (FCFA)</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 font-mono text-lg font-black text-[#F4B400] text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleAdjustUserBalance(true)}
                disabled={isSubmitting}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase flex items-center justify-center gap-1 shadow"
              >
                <Plus className="w-4 h-4" /> Créditer (+{adjustAmount})
              </button>
              <button
                onClick={() => handleAdjustUserBalance(false)}
                disabled={isSubmitting}
                className="py-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-extrabold text-xs uppercase flex items-center justify-center gap-1"
              >
                <Minus className="w-4 h-4" /> Débiter (-{adjustAmount})
              </button>
            </div>

            <button
              onClick={() => setSelectedUserForBalance(null)}
              className="w-full py-2 text-center font-mono text-xs text-gray-400 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User as UserIcon, Mail, Globe, Trophy, LogOut, Edit3, ShieldCheck, Dices } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, balance, logout, fetchCurrentUser } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [country, setCountry] = useState(user?.country || 'CM');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const { data: userGames } = useQuery({
    queryKey: ['userGamesHistory', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (!data.success) return [];
      return data.data.filter((g: any) =>
        g.players?.some((p: any) => p.user?._id === user?.id || p.user === user?.id)
      );
    },
    enabled: !!user?.id,
  });

  const totalGames = userGames?.length || 0;
  const wins = userGames?.filter((g: any) => g.winner?._id === user?.id || g.winner === user?.id).length || 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, avatar, country }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Profil mis à jour !');
        await fetchCurrentUser();
        setShowEditModal(false);
      } else {
        toast.error(data.error || 'Erreur mise à jour.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnecté.');
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Stitch */}
      <div className="glass-card p-6 rounded-3xl border border-purple-500/30 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#6C3BFF]/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] p-1 shadow-xl purple-glow mx-auto flex items-center justify-center">
            <span className="font-extrabold text-white text-3xl uppercase">
              {user?.username?.substring(0, 2) || 'LT'}
            </span>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute bottom-0 right-0 p-1.5 rounded-xl gold-gradient text-[#0F1117] shadow-md hover:scale-105 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        <h2 className="text-xl font-extrabold text-white">{user?.username}</h2>
        <p className="text-xs font-mono text-gray-400 mt-0.5">{user?.email}</p>

        <div className="flex items-center justify-center gap-2 mt-3 text-xs font-mono text-purple-300">
          <Globe className="w-3.5 h-3.5 text-[#F4B400]" />
          <span>Pays: {user?.country === 'CM' ? '🇨🇲 Cameroun' : user?.country || 'International'}</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3.5 rounded-2xl text-center">
          <Dices className="w-5 h-5 text-[#6C3BFF] mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Parties Jouées</p>
          <p className="text-base font-extrabold font-mono text-white mt-0.5">{totalGames}</p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <Trophy className="w-5 h-5 text-[#F4B400] mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Victoires</p>
          <p className="text-base font-extrabold font-mono text-[#F4B400] mt-0.5">{wins}</p>
        </div>

        <div className="glass-card p-3.5 rounded-2xl text-center">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-[10px] font-mono text-gray-400 uppercase">Taux de Victoire</p>
          <p className="text-base font-extrabold font-mono text-emerald-400 mt-0.5">{winRate}%</p>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all uppercase tracking-wider"
      >
        <LogOut className="w-4 h-4" />
        Se déconnecter
      </button>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-purple-500/30 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#F4B400]" /> Modifier le profil
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400">Pseudo</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1"
                />
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
                  className="w-1/2 py-3 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase"
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

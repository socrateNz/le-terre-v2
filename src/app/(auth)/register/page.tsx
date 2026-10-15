'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { User as UserIcon, Mail, Lock, Globe, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('CM');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { fetchCurrentUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, country }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Bienvenue sur Le Terre ! Compte créé avec succès !');
        await fetchCurrentUser();
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Erreur lors de l\'inscription.');
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col justify-center p-6 max-w-md mx-auto relative">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#6C3BFF]/20 to-[#330098]/30 p-2 border border-purple-500/40 shadow-xl purple-glow flex items-center justify-center mb-4 relative overflow-hidden">
          <Image
            src="/favicon.png"
            alt="Le Terre Logo"
            width={52}
            height={52}
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Inscription</h1>
        <p className="text-xs text-gray-400 mt-1">Rejoignez l&apos;arène de jeu Le Terre</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-mono text-gray-400">Nom d&apos;utilisateur</label>
          <div className="relative">
            <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pseudo"
              className="w-full bg-[#1A1D26] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6C3BFF] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono text-gray-400">Adresse Email</label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full bg-[#1A1D26] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6C3BFF] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono text-gray-400">Mot de passe</label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1A1D26] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6C3BFF] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono text-gray-400">Pays</label>
          <div className="relative">
            <Globe className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-[#1A1D26] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C3BFF] transition-all"
            >
              <option value="CM">Cameroun 🇨🇲</option>
              <option value="CI">Côte d&apos;Ivoire 🇨🇮</option>
              <option value="SN">Sénégal 🇸🇳</option>
              <option value="FR">France 🇫🇷</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg gold-glow uppercase tracking-wider hover:opacity-95 transition-all mt-2"
        >
          {isLoading ? (
            'Création du compte...'
          ) : (
            <>
              Créer mon Compte <ArrowRight className="w-4 h-4 stroke-[3]" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-purple-400 font-bold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

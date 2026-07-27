'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { fetchCurrentUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Connexion réussie !');
        await fetchCurrentUser();
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Identifiants invalides.');
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col justify-center p-6 max-w-md mx-auto relative">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] p-0.5 shadow-xl purple-glow flex items-center justify-center mb-4">
          <span className="font-extrabold text-white text-2xl">LT</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Connexion</h1>
        <p className="text-xs text-gray-400 mt-1">Accédez à votre arène de jeu Le Terre</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl gold-gradient text-[#0F1117] font-bold text-sm shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        Vous n'avez pas encore de compte ?{' '}
        <Link href="/register" className="text-[#F4B400] font-bold hover:underline">
          S'inscrire
        </Link>
      </p>
    </div>
  );
}

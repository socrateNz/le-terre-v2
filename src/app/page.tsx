'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dices, ShieldCheck, Zap } from 'lucide-react';

export default function SplashPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#6C3BFF]/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header / Brand */}
      <div className="pt-12 text-center z-10">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#6C3BFF] via-[#330098] to-[#1F0060] p-1 shadow-2xl purple-glow flex items-center justify-center mb-6">
          <span className="font-black text-white text-3xl tracking-tighter">LT</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          LE TERRE
        </h1>
        <p className="text-xs font-mono text-purple-400 tracking-widest uppercase font-semibold">
          Elite Digital Casino & Dice Arena
        </p>
      </div>

      {/* Features Cards */}
      <div className="space-y-4 my-8 z-10">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Parties de Dés Instantanées</h3>
            <p className="text-xs text-gray-400">Défiez d'autres joueurs en 1v1 ou en groupe</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#F4B400]/20 text-[#F4B400] flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Recharges NotchPay & Stripe</h3>
            <p className="text-xs text-gray-400">Mobile Money (OM, MTN, Wave) & Cartes</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Comptabilité Transparent</h3>
            <p className="text-xs text-gray-400">Journal comptable inaltérable et tirages certifiés</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3 pb-8 z-10">
        <Link
          href="/register"
          className="w-full py-4 rounded-2xl gold-gradient text-[#0F1117] font-extrabold text-center block shadow-lg gold-glow hover:opacity-95 transition-all text-sm uppercase tracking-wider"
        >
          Créer un compte (+100 Crédits)
        </Link>
        <Link
          href="/login"
          className="w-full py-4 rounded-2xl bg-[#1A1D26] border border-white/10 text-white font-bold text-center block hover:bg-[#252936] transition-all text-sm"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}

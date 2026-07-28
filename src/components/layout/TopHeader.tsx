'use client';

import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Wallet as WalletIcon, ShieldAlert } from 'lucide-react';

import { AnimatedBalanceCounter } from '@/components/ui/AnimatedBalanceCounter';

export function TopHeader() {
  const { user, balance } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-[#0F1117]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo Stitch Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C3BFF]/20 to-[#330098]/30 p-1 border border-purple-500/30 shadow-lg shadow-purple-950/50 flex items-center justify-center relative overflow-hidden group">
            <Image
              src="/favicon.png"
              alt="Le Terre Logo"
              width={36}
              height={36}
              className="object-contain transform group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
              LE TERRE
            </h1>
            <span className="text-[9px] font-mono text-purple-400 tracking-wider uppercase font-semibold">
              Digital Arena
            </span>
          </div>
        </Link>

        {/* User Balance & Admin Link */}
        <div className="flex items-center gap-2">
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}

          <Link
            href="/wallet"
            className="flex items-center gap-2 bg-[#1A1D26] hover:bg-[#252936] border border-white/10 px-3 py-1.5 rounded-full transition-all group"
          >
            <div className="w-5 h-5 rounded-full bg-[#F4B400]/20 flex items-center justify-center text-[#F4B400]">
              <WalletIcon className="w-3 h-3" />
            </div>
            <AnimatedBalanceCounter
              value={balance}
              className="text-xs font-bold text-white group-hover:text-[#F4B400] transition-colors"
            />
            <div className="w-4 h-4 rounded-full bg-[#6C3BFF] text-white flex items-center justify-center">
              <Plus className="w-2.5 h-2.5" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

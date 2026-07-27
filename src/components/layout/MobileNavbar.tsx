'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Dices, User } from 'lucide-react';

export function MobileNavbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Parties', href: '/games/join', icon: Dices },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Profil', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141721]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-[#F4B400] font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(244,180,0,0.6)]' : ''}`} />
              <span className="text-[10px] tracking-wide font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

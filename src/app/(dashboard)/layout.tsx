'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileNavbar } from '@/components/layout/MobileNavbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fetchCurrentUser, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] p-1 flex items-center justify-center animate-bounce mb-4 shadow-xl shadow-purple-900/50">
          <span className="font-extrabold text-white text-xl">LT</span>
        </div>
        <div className="w-48 h-1.5 bg-[#1A1D26] rounded-full overflow-hidden">
          <div className="w-full h-full bg-[#6C3BFF] animate-pulse"></div>
        </div>
        <p className="text-xs font-mono text-gray-400 mt-3">Chargement de l'arène...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <TopHeader />
      <main className="max-w-md mx-auto px-4 py-4">{children}</main>
      <MobileNavbar />
    </div>
  );
}

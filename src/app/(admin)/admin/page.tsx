'use client';

import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Users, Wallet, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { data: adminData, isLoading, refetch } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      return data.success ? data.data : null;
    },
  });

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#e2e2eb] p-6 max-w-2xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[#1A1D26] text-gray-400 hover:text-white border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
              Panneau d'Administration
            </h1>
            <p className="text-xs text-gray-400">Gestion de la plateforme Le Terre</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
          ADMIN MODE
        </span>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-mono font-bold uppercase">Solde Administrateur</span>
          </div>
          <p className="text-2xl font-mono font-extrabold text-white">
            {adminData?.balance?.toLocaleString() || 0} CR
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-xs font-mono font-bold uppercase">Système Status</span>
          </div>
          <p className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> 100% Opérationnel
          </p>
        </div>
      </div>

      {/* Withdrawals Approval Section */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-white text-base">Demandes de Retrait à Approuver</h3>

        {!adminData?.withdrawals || adminData.withdrawals.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center">
            <p className="text-xs text-gray-400">Aucune demande de retrait en attente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adminData.withdrawals.map((req: any) => (
              <div key={req._id} className="glass-card p-4 rounded-2xl flex items-center justify-between border border-white/10">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Retrait de {req.amount} CR
                  </h4>
                  <p className="text-xs font-mono text-gray-400">
                    Net: <strong className="text-[#F4B400]">{req.netAmount} CR</strong> • Statut: {req.status}
                  </p>
                  {req.accountDetails?.phone && (
                    <p className="text-[10px] font-mono text-purple-300">
                      Tél: {req.accountDetails.phone}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast.success('Retrait approuvé !')}
                    className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-bold flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" /> Valider
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

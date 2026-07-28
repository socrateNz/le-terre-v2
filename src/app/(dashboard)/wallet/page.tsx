'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Sparkles, CreditCard, Smartphone, ShieldCheck, History } from 'lucide-react';

export default function WalletPage() {
  const { user, balance, setBalance } = useAuthStore();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [depositAmount, setDepositAmount] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState<'MOBILE_MONEY' | 'CARD' | 'TEST_CREDIT'>('MOBILE_MONEY');
  const [phone, setPhone] = useState('');
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);

  const { data: walletData, isLoading, refetch } = useQuery({
    queryKey: ['walletDetails'],
    queryFn: async () => {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      return data.success ? data.data : null;
    },
  });

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDepositLoading(true);

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: depositAmount,
          paymentMethod,
          phone,
          country: user?.country || 'CM',
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (paymentMethod === 'TEST_CREDIT') {
          toast.success('+500 FCFA de démonstration ajoutés !');
          setBalance(balance + 500);
          refetch();
          setShowDepositModal(false);
        } else if (data.data.redirectUrl) {
          toast.loading('Redirection vers la passerelle de paiement...');
          window.location.href = data.data.redirectUrl;
        }
      } else {
        toast.error(data.error || 'Erreur lors du dépôt.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsDepositLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount > balance) {
      toast.error('Solde insuffisant pour ce retrait.');
      return;
    }

    setIsWithdrawLoading(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmount,
          phone: withdrawPhone,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Demande de retrait transmise ! En cours de traitement.');
        setBalance(balance - withdrawAmount);
        refetch();
        setShowWithdrawModal(false);
      } else {
        toast.error(data.error || 'Erreur lors du retrait.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Wallet Balance Card Stitch */}
      <div className="glass-card p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#1A1D26] via-[#1F1938] to-[#1A1D26] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#6C3BFF]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-purple-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#F4B400]" /> Portefeuille Numérique
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
            Compte Vérifié
          </span>
        </div>

        <h2 className="text-4xl font-mono font-black text-white my-2">
          {balance.toLocaleString()} <span className="text-base font-normal text-gray-400">FCFA</span>
        </h2>

        <p className="text-xs text-gray-400 font-mono mb-6">
          Taux de conversion : 1 FCFA = 1 FCFA (Direct local)
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowDepositModal(true)}
            className="py-3 px-4 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg gold-glow uppercase tracking-wider hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Recharger
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="py-3 px-4 rounded-xl bg-[#1A1D26] border border-white/10 hover:border-white/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
          >
            <ArrowUpRight className="w-4 h-4 text-[#F4B400]" /> Retirer
          </button>
        </div>
      </div>

      {/* Transaction History & Ledger Logs */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-white text-base flex items-center gap-2">
          <History className="w-5 h-5 text-[#6C3BFF]" />
          Historique des Mouvements
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 rounded-2xl h-16 animate-pulse bg-white/5"></div>
            ))}
          </div>
        ) : !walletData?.ledger || walletData.ledger.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center">
            <p className="text-xs text-gray-400">Aucune transaction enregistrée.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {walletData.ledger.map((item: any) => {
              const isCredit = item.type === 'CREDIT';

              return (
                <div
                  key={item._id}
                  className="glass-card p-4 rounded-2xl flex items-center justify-between border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isCredit
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        {item.reason === 'TEST_CREDIT'
                          ? 'Crédit Démo'
                          : item.reason === 'GAME_WIN'
                          ? 'Gain de Partie 🏆'
                          : item.reason === 'GAME_BET'
                          ? 'Mise de Jeu'
                          : item.reason === 'DEPOSIT'
                          ? 'Dépôt Wallet'
                          : 'Retrait Wallet'}
                      </h4>
                      <p className="text-[10px] font-mono text-gray-400">
                        Ref: {item.reference} • {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`text-sm font-extrabold ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isCredit ? '+' : '-'}{item.amount} FCFA
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Solde : {item.balanceAfter} FCFA
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal Stitch */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-purple-500/30 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#F4B400]" /> Recharger en FCFA
            </h3>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400">Montant (FCFA)</label>
                <input
                  type="number"
                  min={50}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold text-[#F4B400] text-center mt-1 focus:outline-none focus:border-[#6C3BFF]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400 mb-2 block">Moyen de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOBILE_MONEY')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'MOBILE_MONEY'
                        ? 'border-[#F4B400] bg-[#F4B400]/10 text-[#F4B400]'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    Mobile Money
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'CARD'
                        ? 'border-[#6C3BFF] bg-[#6C3BFF]/10 text-purple-300'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Carte Bancaire
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TEST_CREDIT')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'TEST_CREDIT'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Mode Démo
                  </button>
                </div>
              </div>

              {paymentMethod === 'MOBILE_MONEY' && (
                <div>
                  <label className="text-xs font-mono text-gray-400">Numéro Mobile Money (OM / MTN / Wave)</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-[#1A1D26] text-gray-400 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isDepositLoading}
                  className="w-1/2 py-3 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase"
                >
                  {isDepositLoading ? 'Traitement...' : 'Payer maintenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-purple-500/30 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[#F4B400]" /> Demande de Retrait (FCFA)
            </h3>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400">Montant à retirer (FCFA)</label>
                <input
                  type="number"
                  min={50}
                  max={balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white text-center mt-1 focus:outline-none focus:border-[#6C3BFF]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400">Numéro de téléphone de réception (Mobile Money)</label>
                <input
                  type="text"
                  required
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-[#1A1D26] text-gray-400 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawLoading || withdrawAmount > balance}
                  className="w-1/2 py-3 rounded-xl bg-[#6C3BFF] text-white font-extrabold text-xs uppercase"
                >
                  {isWithdrawLoading ? 'Envoi...' : 'Confirmer Retrait'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

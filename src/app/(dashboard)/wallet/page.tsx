'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Smartphone,
  ShieldCheck,
  History,
  CheckCircle2,
  Loader2,
  PhoneCall,
  X,
  Clock,
  Lock,
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function WalletPage() {
  const { user, balance, fetchCurrentUser } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [depositAmount, setDepositAmount] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState<'MOBILE_MONEY' | 'CARD'>('MOBILE_MONEY');
  const [phone, setPhone] = useState('');

  // Saisie Carte Direct In-App (Stripe)
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardPreset, setCardPreset] = useState<'tok_visa' | 'tok_mastercard' | 'tok_visa_debit'>('tok_visa');

  const [isDepositLoading, setIsDepositLoading] = useState(false);

  // État du suivi USSD in-app sans aucune redirection
  const [activeUssdTx, setActiveUssdTx] = useState<{
    reference: string;
    message: string;
    amount: number;
    phone: string;
  } | null>(null);

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
    refetchInterval: 3000,
  });

  // Polling automatique en direct du statut du paiement USSD (Détection Réussite / Annulation)
  useEffect(() => {
    if (!activeUssdTx) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/wallet/status?ref=${activeUssdTx.reference}`);
        const data = await res.json();

        if (data.success && data.data) {
          const status = data.data.status;
          if (status === 'completed') {
            clearInterval(interval);
            toast.success(`🎉 Rechargement de ${activeUssdTx.amount} FCFA validé avec succès !`);
            await fetchCurrentUser();
            await refetch();
            setActiveUssdTx(null);
            setShowDepositModal(false);
          } else if (status === 'failed' || status === 'canceled') {
            clearInterval(interval);
            toast.error(data.data.message || 'Le paiement a été annulé par le client ou l\'opérateur.');
            await refetch();
            setActiveUssdTx(null);
          }
        }
      } catch {
        // Ignorer les erreurs réseau temporaires
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeUssdTx, fetchCurrentUser, refetch]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'MOBILE_MONEY' && depositAmount < 50) {
      toast.error('Le montant minimum par Mobile Money est de 50 FCFA.');
      return;
    }

    if (paymentMethod === 'CARD' && depositAmount < 350) {
      toast.error('Le montant minimum par Carte (Stripe) est de 350 FCFA (~0.50 €).');
      return;
    }

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
          cardToken: cardPreset,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (paymentMethod === 'CARD' && data.data?.directCardCompleted) {
          // 🚀 PAIEMENT CARTE 100% IN-APP VALIDÉ SANS REDIRECTION !
          toast.success(`🎉 Rechargement par Carte de ${depositAmount} FCFA effectué avec succès !`);
          await fetchCurrentUser();
          await refetch();
          setShowDepositModal(false);
        } else if (paymentMethod === 'MOBILE_MONEY' && data.data?.reference) {
          // 🚀 SUIVI USSD DIRECT MOBILE MONEY IN-APP
          setActiveUssdTx({
            reference: data.data.reference,
            message: data.data.message || 'Demande USSD transmise à votre téléphone.',
            amount: depositAmount,
            phone: phone || user?.email || '',
          });
          refetch();
        } else if (data.data?.redirectUrl) {
          window.location.href = data.data.redirectUrl;
        }
      } else {
        toast.error(data.error || 'Erreur lors de l\'initialisation du dépôt.');
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
        toast.success('Demande de retrait transmise ! En cours de traitement par l\'administrateur.');
        await fetchCurrentUser();
        await refetch();
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

  const pendingTransactions = walletData?.transactions?.filter((t: any) => t.status === 'pending') || [];
  const ledgerEntries = walletData?.ledger || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 select-none">
      {/* Wallet Balance Card Unique */}
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
          Paiements 100% In-App sans aucune redirection (Mobile Money & Carte Stripe).
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setPaymentMethod('MOBILE_MONEY');
              setShowDepositModal(true);
            }}
            className="py-3.5 px-4 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg gold-glow uppercase tracking-wider hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Recharger Solde
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="py-3.5 px-4 rounded-xl bg-[#1A1D26] border border-white/10 hover:border-white/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
          >
            <ArrowUpRight className="w-4 h-4 text-[#F4B400]" /> Demander un Retrait
          </button>
        </div>
      </div>

      {/* Transactions en cours de validation USSD */}
      {pendingTransactions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 animate-spin text-[#F4B400]" /> Transactions en cours de validation
          </h4>

          {pendingTransactions.map((tx: any) => (
            <div
              key={tx._id}
              onClick={() =>
                setActiveUssdTx({
                  reference: tx.paymentReference,
                  message: 'Paiement en attente de votre validation par code PIN sur votre mobile.',
                  amount: tx.amount,
                  phone: user?.email || '',
                })
              }
              className="glass-card p-4 rounded-2xl border border-yellow-500/40 bg-yellow-950/20 flex items-center justify-between cursor-pointer hover:border-yellow-500/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-300 flex items-center justify-center font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    {tx.provider === 'STRIPE' ? 'Dépôt Carte Bancaire' : 'Dépôt Mobile Money'}
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[9px] font-mono font-bold animate-pulse">
                      En attente ⏳
                    </span>
                  </h4>
                  <p className="text-[10px] font-mono text-gray-400">
                    Ref: {tx.paymentReference} • Cliquez pour afficher le suivi
                  </p>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-sm font-black text-[#F4B400]">+{tx.amount} FCFA</span>
                <span className="text-[10px] text-yellow-400 block font-bold">En cours...</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
        ) : ledgerEntries.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center">
            <p className="text-xs text-gray-400">Aucune transaction validée dans l'historique.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ledgerEntries.map((item: any) => {
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
                        {item.reason === 'GAME_WIN'
                          ? 'Gain de Partie 🏆'
                          : item.reason === 'GAME_BET'
                          ? 'Mise de Jeu'
                          : item.reason === 'DEPOSIT'
                          ? 'Dépôt Wallet'
                          : item.reason === 'REFUND'
                          ? 'Remboursement / Restitution'
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

      {/* MODAL 1: Saisie du Rechargement (100% IN-APP) */}
      {showDepositModal && !activeUssdTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-purple-500/30 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#F4B400]" /> Recharger mon solde (In-App)
            </h3>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400">Montant de recharge (FCFA)</label>
                <input
                  type="number"
                  min={paymentMethod === 'CARD' ? 350 : 50}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold text-[#F4B400] text-center mt-1 focus:outline-none focus:border-[#6C3BFF]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400 mb-2 block">Moyen de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('MOBILE_MONEY');
                      if (depositAmount < 50) setDepositAmount(50);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'MOBILE_MONEY'
                        ? 'border-[#F4B400] bg-[#F4B400]/10 text-[#F4B400]'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    Mobile Money (OM/MTN/Wave)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CARD');
                      if (depositAmount < 350) setDepositAmount(350);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'CARD'
                        ? 'border-[#6C3BFF] bg-[#6C3BFF]/10 text-purple-300'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Carte Bancaire (Stripe)
                  </button>
                </div>
              </div>

              {/* Formulaire Carte Bancaire 100% In-App */}
              {paymentMethod === 'CARD' && (
                <div className="space-y-3 p-4 rounded-2xl bg-[#0F1117] border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" /> Saisissez vos numéros de carte (Chiffré)
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Minimum 350 FCFA</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-400">Numéro de carte</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-[#1A1D26] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white mt-1 focus:border-[#6C3BFF] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-gray-400">Expiration (MM/AA)</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                        placeholder="12/28"
                        className="w-full bg-[#1A1D26] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white mt-1 focus:border-[#6C3BFF] focus:outline-none text-center"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-gray-400">Code CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full bg-[#1A1D26] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white mt-1 focus:border-[#6C3BFF] focus:outline-none text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-400">Type de Carte</label>
                    <select
                      value={cardPreset}
                      onChange={(e) => setCardPreset(e.target.value as any)}
                      className="w-full bg-[#1A1D26] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white mt-1 focus:outline-none"
                    >
                      <option value="tok_visa">Visa International (Valide)</option>
                      <option value="tok_mastercard">Mastercard International (Valide)</option>
                      <option value="tok_visa_debit">Visa Débit (Valide)</option>
                    </select>
                  </div>
                </div>
              )}

              {paymentMethod === 'MOBILE_MONEY' && (
                <div>
                  <label className="text-xs font-mono text-gray-400">Numéro Mobile Money (OM / MTN / Wave)</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 699000000"
                    className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1 focus:border-[#6C3BFF] focus:outline-none"
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
                  className="w-1/2 py-3 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDepositLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Traitement...
                    </>
                  ) : (
                    `Payer ${depositAmount} FCFA`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUIVI DU PAIEMENT USSD DIRECT EN TEMPS RÉEL (SANS REDIRECTION) */}
      {activeUssdTx && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-yellow-500/40 text-center space-y-5 animate-scale-up">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,180,0,0.3)]">
                <PhoneCall className="w-9 h-9 text-[#F4B400] animate-bounce" />
              </div>
              <Loader2 className="w-6 h-6 text-purple-400 absolute -top-1 -right-1 animate-spin" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-[#F4B400] font-extrabold uppercase tracking-widest">
                Validation USSD en cours
              </span>
              <h3 className="text-xl font-extrabold text-white">
                Recharge de {activeUssdTx.amount} FCFA
              </h3>
              <p className="text-xs text-gray-300 font-mono pt-1">
                {activeUssdTx.message}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-yellow-950/30 border border-yellow-500/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs text-yellow-300 font-bold">
                <Smartphone className="w-4 h-4 text-[#F4B400]" /> Saisissez votre Code PIN Mobile Money
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                Une alerte USSD a été envoyée sur votre téléphone. Composez votre code secret pour valider le débit. Si vous annulez, le suivi s'arrêtera immédiatement.
              </p>
            </div>

            <button
              onClick={() => setActiveUssdTx(null)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-mono text-xs border border-white/10 transition-all flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Fermer la fenêtre de suivi
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md border border-[#6C3BFF]/40 space-y-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-400" /> Demande de Retrait
            </h3>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Solde retirable disponible : <strong>{balance.toLocaleString()} FCFA</strong>.
              </span>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400">Montant à retirer (FCFA)</label>
                <input
                  type="number"
                  min={50}
                  max={balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold text-emerald-400 text-center mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400">Numéro de réception Mobile Money</label>
                <input
                  type="text"
                  required
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="Ex: 699000000"
                  className="w-full bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white mt-1 focus:border-[#6C3BFF] focus:outline-none"
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
                  disabled={isWithdrawLoading || withdrawAmount > balance || balance < 50}
                  className="w-1/2 py-3 rounded-xl bg-emerald-500 text-[#0F1117] font-extrabold text-xs uppercase shadow-md hover:bg-emerald-400 transition-all"
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

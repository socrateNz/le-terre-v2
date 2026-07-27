'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Dices,
  Trophy,
  Users,
  Play,
  CheckCircle2,
  Sparkles,
  Frown,
  Scale,
  AlertCircle,
  RotateCcw,
  X,
  Trash2,
  Ban,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DiceRoller } from '@/components/game/DiceRoller';
import { AnimatedBalanceCounter } from '@/components/ui/AnimatedBalanceCounter';

export default function GameDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gameId } = use(params);
  const router = useRouter();
  const { user, balance, fetchCurrentUser } = useAuthStore();
  const [isJoining, setIsJoining] = useState(false);
  const [isRollingMyDice, setIsRollingMyDice] = useState(false);
  const [isRematchLoading, setIsRematchLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);

  const { data: game, isLoading, refetch } = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();
      return data.success ? data.data : null;
    },
    refetchInterval: (query) => {
      const gameData = query.state.data;
      if (isRollingMyDice) return false;
      // Continue de rafraîchir en arrière-plan pour détecter les demandes de revanche
      return 2000;
    },
  });

  // Redirection automatique des 2 joueurs vers la nouvelle partie dès qu'elle est acceptée
  useEffect(() => {
    if (game?.nextGameId) {
      toast.success('⚡ Revanche confirmée ! Redirection vers la nouvelle arène...');
      fetchCurrentUser();
      const nextId = game.nextGameId._id || game.nextGameId;
      router.push(`/games/${nextId}`);
    }
  }, [game?.nextGameId, router, fetchCurrentUser]);

  const isPlayerInGame = game?.players?.some(
    (p: any) => (p.user?._id || p.user) === user?.id
  );

  const userPlayerDoc = game?.players?.find(
    (p: any) => (p.user?._id || p.user) === user?.id
  );

  const hasUserRolled = Boolean(
    userPlayerDoc && (userPlayerDoc.total > 0 || userPlayerDoc.diceOne > 0)
  );

  const winnerId = game?.winner?._id || game?.winner;
  const isUserWinner = Boolean(game?.status === 'FINISHED' && winnerId && winnerId === user?.id);
  const isUserLoser = Boolean(
    game?.status === 'FINISHED' && winnerId && winnerId !== user?.id && isPlayerInGame
  );
  const isGameTie = Boolean(game?.status === 'FINISHED' && !winnerId);

  const rematchRequesterId = game?.rematchRequestedBy?._id || game?.rematchRequestedBy;
  const isMyRematchProposal = Boolean(
    game?.status === 'FINISHED' && rematchRequesterId && rematchRequesterId === user?.id
  );
  const isOpponentRematchProposal = Boolean(
    game?.status === 'FINISHED' &&
      rematchRequesterId &&
      rematchRequesterId !== user?.id &&
      isPlayerInGame
  );

  const isCreator = Boolean(
    user && ((game?.creator?._id || game?.creator) === user.id || user.role === 'ADMIN')
  );

  const handleCancelGame = async () => {
    if (
      !confirm(
        'Voulez-vous vraiment annuler et supprimer cette partie ? Les mises engagées seront remboursées à tous les participants.'
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Partie annulée avec succès. Vos crédits ont été remboursés !');
        await fetchCurrentUser();
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Impossible d’annuler cette partie.');
      }
    } catch {
      toast.error('Erreur réseau lors de l’annulation.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJoin = async () => {
    if (balance < game.bet) {
      toast.error(`Solde insuffisant (${game.bet} CR requis, votre solde : ${balance} CR).`);
      return;
    }

    setIsJoining(true);
    try {
      const res = await fetch(`/api/games/${gameId}/join`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success("Vous avez rejoint l'arène !");
        setBalanceDelta(-game.bet);
        await fetchCurrentUser();
        refetch();
        setTimeout(() => setBalanceDelta(null), 2500);
      } else {
        toast.error(data.error || 'Impossible de rejoindre la partie.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRollMyDice = async () => {
    setIsRollingMyDice(true);
    try {
      const res = await fetch(`/api/games/${gameId}/roll`, { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || 'Erreur lors du lancer de dés.');
        setIsRollingMyDice(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1800));

      const updatedGame = data.data;
      await refetch();
      await fetchCurrentUser();

      toast.success('Vos dés ont été lancés !');

      if (updatedGame.status === 'FINISHED') {
        const finWinnerId = updatedGame.winner?._id || updatedGame.winner;
        if (finWinnerId === user?.id) {
          setBalanceDelta(updatedGame.totalPot);
          toast.success(`🎉 Victoire ! Vous remportez ${updatedGame.totalPot} Crédits !`);
        } else if (!finWinnerId) {
          toast('🤝 Match nul ! Les mises vous ont été restituées.', { icon: '🤝' });
        } else {
          setBalanceDelta(-updatedGame.bet);
          toast.error(`Partie terminée. Victoire de ${updatedGame.winner?.username || 'votre adversaire'}.`);
        }
        setTimeout(() => setBalanceDelta(null), 3000);
      }
    } catch {
      toast.error('Erreur réseau lors du lancer de dés.');
    } finally {
      setIsRollingMyDice(false);
    }
  };

  // Actions de Revanche
  const handleProposeRematch = async () => {
    if (balance < game.bet) {
      toast.error(`Solde insuffisant (${game.bet} CR requis).`);
      return;
    }

    setIsRematchLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('⚡ Demande de revanche envoyée à votre adversaire !');
        refetch();
      } else {
        toast.error(data.error || 'Impossible de proposer la revanche.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsRematchLoading(false);
    }
  };

  const handleAcceptRematch = async () => {
    if (balance < game.bet) {
      toast.error(`Solde insuffisant pour accepter (${game.bet} CR requis).`);
      return;
    }

    setIsRematchLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('🎉 Revanche acceptée ! Lancement de la nouvelle partie...');
        await fetchCurrentUser();
        const nextId = data.data._id;
        router.push(`/games/${nextId}`);
      } else {
        toast.error(data.error || 'Erreur lors de l’acceptation de la revanche.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsRematchLoading(false);
    }
  };

  const handleDeclineRematch = async () => {
    setIsRematchLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });

      const data = await res.json();
      if (data.success) {
        toast('Demande de revanche déclinée.', { icon: 'ℹ️' });
        refetch();
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsRematchLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center space-y-4 animate-pulse">
        <Dices className="w-12 h-12 text-[#6C3BFF] mx-auto animate-spin" />
        <p className="text-sm font-mono text-gray-400">Chargement de l'arène de jeu...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="glass-card p-10 rounded-3xl text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Partie introuvable</h3>
        <Link href="/dashboard" className="text-xs font-mono text-[#F4B400] underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[#1A1D26] text-gray-400 hover:text-white border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white">Arène de Dés</h1>
            <p className="text-xs font-mono text-purple-400">
              Hôte: {game.creator?.username || 'Inconnu'} • Statut: {game.status}
            </p>
          </div>
        </div>

        {/* Live Balance Counter in Arena Header */}
        <div className="bg-[#1A1D26] border border-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Mon Solde</span>
          <AnimatedBalanceCounter
            value={balance}
            delta={balanceDelta}
            suffix="CR"
            className="text-xs font-extrabold text-[#F4B400]"
          />
        </div>
      </div>

      {/* Pot Banner */}
      <div className="glass-card p-5 rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-[#1A1D26] via-[#2A2312] to-[#1A1D26] text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F4B400]/10 rounded-full blur-2xl pointer-events-none"></div>

        <span className="text-xs font-mono text-[#F4B400] font-extrabold uppercase tracking-widest">
          Cagnotte Totale en Jeu
        </span>
        <div className="text-3xl font-mono font-black text-white mt-1 flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-[#F4B400] drop-shadow-[0_0_10px_rgba(244,180,0,0.5)]" />
          {game.totalPot.toLocaleString()} <span className="text-sm font-normal text-gray-400">Crédits</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 font-mono">
          Mise par joueur : <strong className="text-white">{game.bet} CR</strong>
        </p>
      </div>

      {/* Bannières de Fin de Partie Personnalisées */}

      {/* BANNIÈRE 1 : VICTOIRE (Affichée uniquement au vainqueur) */}
      {isUserWinner && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-6 rounded-3xl border border-emerald-500/60 bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-emerald-950/60 text-center space-y-2 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-emerald-500/10 blur-xl pointer-events-none"></div>
          <Sparkles className="w-12 h-12 text-[#F4B400] mx-auto animate-bounce" />
          <h2 className="text-2xl font-black text-white">🎉 VICTOIRE ÉCLATANTE !</h2>
          <p className="text-xs text-emerald-300 font-mono">
            Vous avez obtenu le meilleur score et vous remportez la totalité de la cagnotte de{' '}
            <strong className="text-[#F4B400] font-extrabold">{game.totalPot} Crédits</strong> !
          </p>
        </motion.div>
      )}

      {/* BANNIÈRE 2 : DÉFAITE (Affichée uniquement aux perdants) */}
      {isUserLoser && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-6 rounded-3xl border border-rose-500/50 bg-gradient-to-r from-rose-950/50 via-rose-900/20 to-rose-950/50 text-center space-y-2 shadow-2xl relative overflow-hidden"
        >
          <Frown className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">💔 DÉFAITE</h2>
          <p className="text-xs text-rose-300 font-mono">
            Victoire de <strong className="text-white font-extrabold">{game.winner?.username || 'votre adversaire'}</strong> avec son score supérieur. Votre mise de {game.bet} CR a été engagée.
          </p>
        </motion.div>
      )}

      {/* BANNIÈRE 3 : ÉGALITÉ / MATCH NUL */}
      {isGameTie && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-6 rounded-3xl border border-purple-500/50 bg-gradient-to-r from-purple-950/50 via-indigo-900/30 to-purple-950/50 text-center space-y-2 shadow-2xl relative overflow-hidden"
        >
          <Scale className="w-10 h-10 text-purple-300 mx-auto" />
          <h2 className="text-xl font-extrabold text-white">🤝 MATCH NUL / ÉGALITÉ !</h2>
          <p className="text-xs text-purple-300 font-mono">
            Les joueurs ont obtenu un score strictement égal. Vos crédits de mise (<strong className="text-white">{game.bet} CR</strong>) vous ont été automatiquement restitués !
          </p>
        </motion.div>
      )}

      {/* BANNIÈRE 4 : PARTIE ANNULÉE / SUPPRIMÉE */}
      {game.status === 'CANCELLED' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-6 rounded-3xl border border-rose-500/50 bg-gradient-to-r from-rose-950/50 via-rose-900/20 to-rose-950/50 text-center space-y-2 shadow-2xl relative overflow-hidden"
        >
          <Ban className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">🚫 PARTIE ANNULÉE</h2>
          <p className="text-xs text-rose-300 font-mono">
            Cette partie a été annulée par son créateur. Les crédits engagés (<strong className="text-white">{game.bet} CR</strong>) ont été automatiquement restitués aux participants.
          </p>
        </motion.div>
      )}

      {/* Players Arena Cards with Live 3D Dice Roller */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-white text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6C3BFF]" />
            Joueurs engagés ({game.players?.length}/{game.maxPlayers})
          </span>
          <span className="text-xs font-mono text-gray-400">
            {game.status === 'FINISHED' ? 'Partie Terminée' : 'Lancers en cours'}
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {game.players?.map((playerDoc: any, idx: number) => {
            const playerUser = playerDoc.user;
            const isThisPlayerUser = (playerUser?._id || playerUser) === user?.id;
            const isWinner =
              game.winner?._id === playerUser?._id || game.winner === playerUser?._id;
            const hasPlayerRolled = playerDoc.total > 0 || playerDoc.diceOne > 0;
            const isCurrentlyRolling = isRollingMyDice && isThisPlayerUser;

            return (
              <motion.div
                key={idx}
                layout
                className={`glass-card p-5 rounded-3xl border transition-all space-y-4 ${
                  isWinner
                    ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : isCurrentlyRolling
                    ? 'border-[#F4B400] bg-purple-950/30 shadow-[0_0_20px_rgba(244,180,0,0.3)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] border border-purple-500/40 flex items-center justify-center font-extrabold text-white text-base shadow-md">
                      {playerUser?.username?.substring(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                        {playerUser?.username || 'Joueur'}
                        {isThisPlayerUser && (
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                            Moi
                          </span>
                        )}
                        {isWinner && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-[#F4B400]" /> Vainqueur
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] font-mono text-gray-400">
                        {hasPlayerRolled
                          ? `Dés lancés • Score : ${playerDoc.total}`
                          : 'En attente du lancer de dés...'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-gray-400 block uppercase">
                      Total Dé
                    </span>
                    <span className="text-xl font-mono font-black text-white">
                      {hasPlayerRolled ? playerDoc.total : '?'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0B0D13] border border-white/5 flex items-center justify-around">
                  <DiceRoller
                    label="Dé #1"
                    size="md"
                    isRolling={isCurrentlyRolling}
                    value={playerDoc.diceOne}
                  />
                  <div className="text-gray-600 font-mono text-xl font-black">+</div>
                  <DiceRoller
                    label="Dé #2"
                    size="md"
                    isRolling={isCurrentlyRolling}
                    value={playerDoc.diceTwo}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons & Rematch Controls */}
      <div className="pt-4 space-y-3">
        {/* BOUTON : Rejoindre la partie */}
        {!isPlayerInGame && game.status !== 'FINISHED' && (
          <div className="space-y-2">
            {balance < game.bet && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center space-y-1">
                <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Solde insuffisant pour rejoindre cette partie
                </p>
                <p className="text-[11px] font-mono text-gray-400">
                  Mise requise : <strong className="text-white">{game.bet} CR</strong> • Votre solde : <strong className="text-[#F4B400]">{balance} CR</strong>
                </p>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={isJoining || game.players?.length >= game.maxPlayers || balance < game.bet}
              className={`w-full py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 ${
                balance < game.bet
                  ? 'bg-[#1A1D26] text-gray-500 border border-white/5 cursor-not-allowed'
                  : 'gold-gradient text-[#0F1117] gold-glow hover:opacity-95'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {isJoining
                ? 'Rejointement...'
                : balance < game.bet
                ? `Solde Insuffisant (${game.bet} CR)`
                : `Rejoindre l'arène (${game.bet} CR)`}
            </button>
          </div>
        )}

        {/* BOUTON : Lancer MES dés */}
        {isPlayerInGame && !hasUserRolled && game.status !== 'FINISHED' && (
          <button
            onClick={handleRollMyDice}
            disabled={isRollingMyDice || game.players?.length < 2}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C3BFF] via-[#5b2ee6] to-[#4b00d4] text-white font-extrabold text-sm uppercase tracking-wider shadow-xl purple-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-current" />
            {isRollingMyDice
              ? '🎲 Lancer de mes dés en cours...'
              : game.players?.length < 2
              ? 'En attente du second joueur...'
              : '🎲 Lancer MES Dés !'}
          </button>
        )}

        {/* INDICATEUR : Attente du lancer des autres joueurs */}
        {isPlayerInGame && hasUserRolled && game.status !== 'FINISHED' && (
          <div className="glass-card p-4 rounded-2xl text-center space-y-1 border border-purple-500/30">
            <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
              <Dices className="w-4 h-4 text-[#F4B400] animate-spin" />
              Vos dés sont lancés (Score : {userPlayerDoc?.total})
            </p>
            <p className="text-xs text-purple-300 font-mono">
              En attente du lancer de dés des autres joueurs pour révéler le gagnant...
            </p>
          </div>
        )}

        {/* GESTION DE LA REVANCHE INTERACTIVE À LA FIN DU JEU */}
        {game.status === 'FINISHED' && isPlayerInGame && (
          <div className="pt-2">
            {/* CAS 1 : Aucune demande de revanche formulée */}
            {!rematchRequesterId && (
              <div className="space-y-2">
                {balance < game.bet && (
                  <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center space-y-1">
                    <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      Solde insuffisant pour proposer une revanche
                    </p>
                  </div>
                )}
                <button
                  onClick={handleProposeRematch}
                  disabled={isRematchLoading || balance < game.bet}
                  className={`w-full py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 ${
                    balance < game.bet
                      ? 'bg-[#1A1D26] text-gray-500 border border-white/5 cursor-not-allowed'
                      : 'gold-gradient text-[#0F1117] gold-glow hover:opacity-95'
                  }`}
                >
                  <RotateCcw className={`w-5 h-5 ${isRematchLoading ? 'animate-spin' : ''}`} />
                  {isRematchLoading ? 'Envoi...' : `⚡ Proposer une Revanche (${game.bet} CR)`}
                </button>
              </div>
            )}

            {/* CAS 2 : J'ai proposé la revanche -> En attente de l'adversaire */}
            {isMyRematchProposal && (
              <div className="glass-card p-5 rounded-3xl border border-purple-500/40 text-center space-y-2 bg-purple-950/20">
                <Dices className="w-8 h-8 text-[#F4B400] mx-auto animate-spin" />
                <h4 className="font-extrabold text-white text-sm">
                  Demande de Revanche envoyée !
                </h4>
                <p className="text-xs text-purple-300 font-mono">
                  En attente que votre adversaire accepte la revanche...
                </p>
              </div>
            )}

            {/* CAS 3 : Mon adversaire m'a proposé une revanche -> Bannière de réponse */}
            {isOpponentRematchProposal && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card p-6 rounded-3xl border border-yellow-500/50 bg-gradient-to-r from-yellow-950/40 via-amber-900/20 to-yellow-950/40 text-center space-y-3 shadow-2xl"
              >
                <Sparkles className="w-8 h-8 text-[#F4B400] mx-auto animate-bounce" />
                <h3 className="text-base font-extrabold text-white">
                  ⚡ Votre adversaire vous propose une Revanche !
                </h3>
                <p className="text-xs text-yellow-200 font-mono">
                  Mise requise : <strong className="text-white">{game.bet} CR</strong>
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleAcceptRematch}
                    disabled={isRematchLoading || balance < game.bet}
                    className="py-3 px-4 rounded-xl gold-gradient text-[#0F1117] font-extrabold text-xs uppercase shadow-lg gold-glow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accepter ({game.bet} CR)
                  </button>

                  <button
                    onClick={handleDeclineRematch}
                    disabled={isRematchLoading}
                    className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10"
                  >
                    <X className="w-4 h-4" />
                    Décliner
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* BOUTON CRÉATEUR : Annuler / Supprimer la partie */}
        {isCreator && game.status !== 'FINISHED' && game.status !== 'CANCELLED' && (
          <button
            onClick={handleCancelGame}
            disabled={isDeleting}
            className="w-full py-3.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            {isDeleting ? 'Suppression en cours...' : 'Annuler & Supprimer cette Partie'}
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Dices,
  Trophy,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { SharedDiceArena } from '@/components/game/SharedDiceArena';
import { GameResultDialog } from '@/components/game/GameResultDialog';
import { AnimatedBalanceCounter } from '@/components/ui/AnimatedBalanceCounter';
import type { ApiGamePlayer } from '@/types';
import { refId, refUser } from '@/lib/refs';

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
  const [isOpponentRolling, setIsOpponentRolling] = useState(false);
  const [isRematchLoading, setIsRematchLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const prevRollSignatureRef = useRef<string | null>(null);
  const opponentRollTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Nettoyage des minuteries d'animation au démontage
  useEffect(() => {
    const timers = opponentRollTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // Polling rapide à 1000ms pendant les parties en cours pour réactivité instantanée
  const { data: game, isLoading, refetch } = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();
      return data.success ? data.data : null;
    },
    refetchInterval: (query) => {
      const gameData = query.state.data;
      if (gameData?.status === 'FINISHED' || gameData?.status === 'CANCELLED') {
        return 3000;
      }
      return 1000; // Fast 1-second polling
    },
  });

  // Redirection automatique des 2 joueurs vers la nouvelle partie dès qu'elle est acceptée
  useEffect(() => {
    if (game?.nextGameId) {
      toast.success('⚡ Revanche confirmée ! Redirection vers la nouvelle arène...');
      fetchCurrentUser();
      const nextId = refId(game.nextGameId);
      router.push(`/games/${nextId}`);
    }
  }, [game?.nextGameId, router, fetchCurrentUser]);

  // Détection en temps réel des lancers des adversaires pour déclencher l'animation 3D simultanée
  const currentRollSignature =
    game?.players
      ?.map((p: ApiGamePlayer) => `${refId(p.user)}:${p.diceOne}:${p.diceTwo}:${p.total}`)
      .join('|') || '';

  useEffect(() => {
    if (!game) return;

    if (prevRollSignatureRef.current === null) {
      prevRollSignatureRef.current = currentRollSignature;
      return;
    }

    if (prevRollSignatureRef.current !== currentRollSignature) {
      prevRollSignatureRef.current = currentRollSignature;

      // Si le lancer provient de l'adversaire (et qu'on ne lançait pas soi-même)
      const playerWhoJustRolled = game.players?.find((p: ApiGamePlayer) => {
        const pId = refId(p.user);
        return pId !== user?.id && (p.diceOne > 0 || p.diceTwo > 0);
      });

      if (playerWhoJustRolled && !isRollingMyDice) {
        toast.success(`🎲 ${playerWhoJustRolled.user?.username || 'L’adversaire'} lance les dés !`, {
          icon: '🎲',
        });

        // Durée exacte de l'animation 3D synchronisée
        opponentRollTimers.current.push(
          setTimeout(() => setIsOpponentRolling(true), 0),
          setTimeout(() => setIsOpponentRolling(false), 1800)
        );
      }
    }
  }, [currentRollSignature, game, user?.id, isRollingMyDice]);

  const isPlayerInGame = game?.players?.some(
    (p: ApiGamePlayer) => refId(p.user) === user?.id
  );

  const userPlayerDoc = game?.players?.find(
    (p: ApiGamePlayer) => refId(p.user) === user?.id
  );

  const hasUserRolled = Boolean(
    userPlayerDoc && (userPlayerDoc.total > 0 || userPlayerDoc.diceOne > 0)
  );

  const winnerId = refId(game?.winner);
  const isUserWinner = Boolean(game?.status === 'FINISHED' && winnerId && winnerId === user?.id);
  const isUserLoser = Boolean(
    game?.status === 'FINISHED' && winnerId && winnerId !== user?.id && isPlayerInGame
  );
  const isGameTie = Boolean(game?.status === 'FINISHED' && !winnerId);

  const rematchRequesterId = refId(game?.rematchRequestedBy);
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
    user && (refId(game?.creator) === user.id || user.role === 'ADMIN')
  );

  // Ouverture automatique du Dialog Modal après la fin des lancers
  useEffect(() => {
    if (
      !isOpponentRolling &&
      !isRollingMyDice &&
      (game?.status === 'FINISHED' || game?.status === 'CANCELLED' || isOpponentRematchProposal)
    ) {
      const timer = setTimeout(() => {
        setIsResultDialogOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [game?.status, isOpponentRematchProposal, isOpponentRolling, isRollingMyDice]);

  const handleCancelGame = async () => {
    if (
      !confirm(
        'Voulez-vous vraiment annuler et supprimer cette partie ? Les mises engagées seront remboursées.'
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Partie annulée avec succès. Crédits remboursés !');
        await fetchCurrentUser();
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Impossible d’annuler cette partie.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJoin = async () => {
    if (balance < game.bet) {
      toast.error(`Solde insuffisant (${game.bet} CR requis).`);
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
        setIsResultDialogOpen(true);
        const finWinnerId = refId(updatedGame.winner);
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
        toast.success('⚡ Demande de revanche envoyée !');
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
      toast.error(`Solde insuffisant (${game.bet} CR requis).`);
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
        toast.success('🎉 Revanche acceptée ! Lancement...');
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
        <p className="text-sm font-mono text-gray-400">Chargement de l&apos;arène...</p>
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

  const isArenaRolling = isRollingMyDice || isOpponentRolling;

  return (
    <div className="w-full max-w-xl mx-auto space-y-3 py-2 px-2 pb-24 select-none">
      {/* 1. Header Compact et Cagnotte intégrée (Format Horizontal Ultra-Propre) */}
      <div className="glass-card p-2 px-3 rounded-2xl border border-white/10 flex items-center justify-between gap-2 shadow-lg flex-shrink-0">
        {/* Titre & Hôte */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-xl bg-[#1A1D26] text-gray-400 hover:text-white border border-white/10 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 truncate">
            <h1 className="text-xs font-black text-white leading-none truncate">Arène de Dés</h1>
            <p className="text-[9px] font-mono text-purple-400 truncate leading-tight mt-0.5">
              Hôte: {game.creator?.username || 'Inconnu'}
            </p>
          </div>
        </div>

        {/* Cagnotte Badge Compact (Ligne unique) */}
        <div className="bg-[#1A1D26] border border-yellow-500/40 px-2.5 py-1 rounded-xl flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 shadow">
          <Trophy className="w-3.5 h-3.5 text-[#F4B400] flex-shrink-0" />
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-xs font-black text-[#F4B400]">{game.totalPot} FCFA</span>
            <span className="text-[9px] text-gray-400 font-normal">({game.bet}/j)</span>
          </div>
        </div>

        {/* Bouton avec icône seule pour ré-ouvrir le Dialog / Revanche */}
        {(game.status === 'FINISHED' || game.status === 'CANCELLED' || isOpponentRematchProposal) && (
          <button
            onClick={() => setIsResultDialogOpen(true)}
            title="Résultat / Revanche"
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 p-1.5 rounded-xl flex items-center justify-center shadow flex-shrink-0 transition-all hover:scale-105"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#F4B400]" />
          </button>
        )}

        {/* Live Balance Counter */}
        <div className="bg-[#1A1D26] border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1 whitespace-nowrap flex-shrink-0">
          <AnimatedBalanceCounter
            value={balance}
            delta={balanceDelta}
            suffix="FCFA"
            className="text-xs font-extrabold text-[#F4B400]"
          />
        </div>
      </div>

      {/* 2. ARÈNE JAUNE CENTRALE (Dés Partagés & Animation 3D Simultanée) */}
      {(() => {
        const playerWhoRolled = game?.players?.find(
          (p: ApiGamePlayer) => p.diceOne > 0 || p.diceTwo > 0
        );

        const sharedDiceOne = isArenaRolling
          ? 0
          : userPlayerDoc?.diceOne > 0
          ? userPlayerDoc.diceOne
          : playerWhoRolled?.diceOne || 6;

        const sharedDiceTwo = isArenaRolling
          ? 0
          : userPlayerDoc?.diceTwo > 0
          ? userPlayerDoc.diceTwo
          : playerWhoRolled?.diceTwo || 4;

        const activeRollerName = isArenaRolling
          ? isRollingMyDice
            ? user?.username
            : playerWhoRolled?.user?.username || 'Adversaire'
          : userPlayerDoc?.diceOne > 0
          ? user?.username
          : playerWhoRolled?.user?.username || null;

        const canRollInArena = isPlayerInGame && !hasUserRolled && game.status !== 'FINISHED' && game.players?.length >= 2;

        return (
          <SharedDiceArena
            diceOne={sharedDiceOne}
            diceTwo={sharedDiceTwo}
            isRolling={isArenaRolling}
            activeRollerName={activeRollerName}
            canRoll={canRollInArena}
            onRoll={handleRollMyDice}
            gameStatus={game.status}
            totalScore={userPlayerDoc?.total}
          />
        );
      })()}

      {/* 3. Tableau d'Affichage des Joueurs & Actions */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {game.players?.map((playerDoc: ApiGamePlayer, idx: number) => {
            const playerUser = refUser(playerDoc.user);
            const isThisPlayerUser = refId(playerDoc.user) === user?.id;
            const isWinner = Boolean(game.winner) && refId(game.winner) === refId(playerDoc.user);
            const hasPlayerRolled = playerDoc.total > 0 || playerDoc.diceOne > 0;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 overflow-hidden ${
                  isWinner
                    ? 'border-emerald-500/60 bg-emerald-950/40 shadow'
                    : isThisPlayerUser
                    ? 'border-purple-500/40 bg-purple-950/20'
                    : 'border-white/10 bg-[#12141D]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C3BFF] to-[#330098] flex items-center justify-center font-black text-white text-xs flex-shrink-0">
                    {playerUser?.username?.substring(0, 2).toUpperCase() || 'P'}
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <h4 className="font-bold text-white text-xs truncate">
                      {playerUser?.username || 'Joueur'}
                    </h4>
                    <p className="text-[9px] font-mono text-gray-400 truncate flex items-center gap-1">
                      {isThisPlayerUser && <span className="text-purple-400 font-bold">(Moi)</span>}
                      {hasPlayerRolled ? `${playerDoc.diceOne} + ${playerDoc.diceTwo}` : 'En attente...'}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 min-w-[36px]">
                  <span className="text-[9px] font-mono text-gray-400 block uppercase leading-none">Score</span>
                  <span className="text-sm font-mono font-black text-[#F4B400] leading-tight">
                    {hasPlayerRolled ? playerDoc.total : '?'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions Secondaires : Rejoindre / Annuler */}
        <div className="flex items-center gap-2">
          {!isPlayerInGame && game.status !== 'FINISHED' && (
            <button
              onClick={handleJoin}
              disabled={isJoining || game.players?.length >= game.maxPlayers || balance < game.bet}
              className="w-full py-2.5 rounded-xl gold-gradient text-[#0F1117] font-black text-xs uppercase shadow hover:opacity-95 disabled:opacity-50"
            >
              {isJoining ? 'Rejointement...' : `Rejoindre (${game.bet} CR)`}
            </button>
          )}

          {isCreator && game.status !== 'FINISHED' && game.status !== 'CANCELLED' && (
            <button
              onClick={handleCancelGame}
              disabled={isDeleting}
              className="py-2 px-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-[10px] uppercase flex items-center gap-1 flex-shrink-0"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* 4. MODAL DIALOG : Victoire, Défaite, Égalité & Proposition de Revanche */}
      <GameResultDialog
        isOpen={isResultDialogOpen}
        onClose={() => setIsResultDialogOpen(false)}
        gameStatus={game.status}
        isUserWinner={isUserWinner}
        isUserLoser={isUserLoser}
        isGameTie={isGameTie}
        isCancelled={game.status === 'CANCELLED'}
        winnerUsername={game.winner?.username}
        totalPot={game.totalPot}
        bet={game.bet}
        rematchRequesterId={rematchRequesterId}
        isMyRematchProposal={isMyRematchProposal}
        isOpponentRematchProposal={isOpponentRematchProposal}
        isRematchLoading={isRematchLoading}
        canAffordRematch={balance >= game.bet}
        onProposeRematch={handleProposeRematch}
        onAcceptRematch={handleAcceptRematch}
        onDeclineRematch={handleDeclineRematch}
      />
    </div>
  );
}

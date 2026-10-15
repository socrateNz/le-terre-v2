import { GameRepository } from '@/repositories/GameRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { GameEngine } from '@/lib/gameEngine/GameEngine';
import { runTransaction, toObjectId } from '@/lib/db';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { GAME_CONFIG } from '@/config/game';
import type { IGameDocument } from '@/models/Game';
import type { IGamePlayerDocument } from '@/models/GamePlayer';

/** Vrai si l'utilisateur est l'un des joueurs de la partie (champ `user` peuplé ou non). */
function isParticipant(game: IGameDocument, userId: string): boolean {
  return game.players.some((p) => {
    const user = p.user as unknown as { _id?: unknown } | null;
    return String(user?._id ?? user) === userId;
  });
}

export interface CreateGameInput {
  userId: string;
  bet: number;
  maxPlayers?: number;
  isPrivate?: boolean;
  passcode?: string;
}

export class GameService {
  public static async createGame(input: CreateGameInput) {
    const { userId, bet, maxPlayers = 2, isPrivate = false, passcode } = input;

    if (bet < GAME_CONFIG.MIN_BET || bet > GAME_CONFIG.MAX_BET) {
      throw new ValidationError(`La mise doit être comprise entre ${GAME_CONFIG.MIN_BET} et ${GAME_CONFIG.MAX_BET} FCFA.`);
    }

    if (maxPlayers < GAME_CONFIG.MIN_PLAYERS || maxPlayers > GAME_CONFIG.MAX_PLAYERS) {
      throw new ValidationError(`Le nombre de joueurs doit être entre ${GAME_CONFIG.MIN_PLAYERS} et ${GAME_CONFIG.MAX_PLAYERS}.`);
    }

    if (isPrivate && (!passcode || passcode.length < 4)) {
      throw new ValidationError('Un code PIN d\'au moins 4 chiffres est requis pour une partie privée.');
    }

    return runTransaction(async (session) => {
      // 1. Vérification et déduction atomique de la mise du créateur (Solde Réel FCFA)
      const wallet = await WalletRepository.findByUserId(userId, session);
      if (!wallet || wallet.balance < bet) {
        throw new ValidationError('Solde réel insuffisant pour créer cette partie. Veuillez recharger votre portefeuille.');
      }

      const balanceBefore = wallet.balance;
      const updatedWallet = await WalletRepository.updateBalance(userId, -bet, session);
      if (!updatedWallet) {
        throw new ValidationError('Impossible de déduire la mise.');
      }

      // 2. Création de la partie
      const game = await GameRepository.createGame(
        {
          creator: toObjectId(userId),
          maxPlayers,
          bet,
          isPrivate,
          passcode: isPrivate && passcode ? passcode.trim() : undefined,
          status: maxPlayers === 1 ? 'READY' : 'WAITING_FOR_PLAYERS',
          players: [
            {
              user: toObjectId(userId),
              diceOne: 0,
              diceTwo: 0,
              total: 0,
              joinedAt: new Date(),
            } as unknown as IGamePlayerDocument,
          ],
          totalPot: bet,
        },
        session
      );

      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: toObjectId(userId),
          type: 'DEBIT',
          amount: bet,
          balanceBefore,
          balanceAfter: updatedWallet.balance,
          reference: `BET-${game._id}`,
          reason: 'GAME_BET',
          game: game._id,
        },
        session
      );

      return game;
    });
  }

  public static async joinGame(gameId: string, userId: string, passcode?: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session, true);
      if (!game) {
        throw new NotFoundError('Partie non trouvée.');
      }

      if (game.isPrivate) {
        if (!passcode || passcode.trim() !== game.passcode) {
          throw new ValidationError('Code PIN du salon privé incorrect !');
        }
      }

      if (game.status !== 'WAITING_FOR_PLAYERS' && game.status !== 'CREATED') {
        throw new ValidationError('Cette partie ne peut plus être rejointe.');
      }

      const alreadyJoined = game.players.some(
        (p) => p.user._id.toString() === userId || p.user.toString() === userId
      );

      if (alreadyJoined) {
        throw new ValidationError('Vous avez déjà rejoint cette partie.');
      }

      if (game.players.length >= game.maxPlayers) {
        throw new ValidationError('Cette partie est déjà complète.');
      }

      // Déduction atomique de la mise du joueur qui rejoint
      const wallet = await WalletRepository.findByUserId(userId, session);
      if (!wallet || wallet.balance < game.bet) {
        throw new ValidationError('Solde réel insuffisant pour rejoindre cette partie.');
      }

      const balanceBefore = wallet.balance;
      const updatedWallet = await WalletRepository.updateBalance(userId, -game.bet, session);
      if (!updatedWallet) {
        throw new ValidationError('Impossible de déduire la mise.');
      }

      game.players.push({
        user: toObjectId(userId),
        diceOne: 0,
        diceTwo: 0,
        total: 0,
        joinedAt: new Date(),
      } as unknown as IGamePlayerDocument);

      game.totalPot += game.bet;

      if (game.players.length === game.maxPlayers) {
        game.status = 'READY';
      }

      await game.save({ session });

      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: toObjectId(userId),
          type: 'DEBIT',
          amount: game.bet,
          balanceBefore,
          balanceAfter: updatedWallet.balance,
          reference: `BET-${game._id}`,
          reason: 'GAME_BET',
          game: game._id,
        },
        session
      );

      return game;
    });
  }

  public static async startGame(gameId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) {
        throw new NotFoundError('Partie non trouvée.');
      }

      if (game.status === 'FINISHED') {
        throw new ValidationError('Cette partie est déjà terminée.');
      }

      game.status = 'ROLLING_DICE';
      await game.save({ session });

      const executionPlayers = game.players.map((p) => ({
        userId: (p.user._id || p.user).toString(),
      }));

      const result = GameEngine.playDiceGame(game.bet, executionPlayers);

      for (const playerDoc of game.players) {
        const pId = (playerDoc.user._id || playerDoc.user).toString();
        const score = result.playerScores.find((s) => s.userId === pId);
        if (score) {
          playerDoc.diceOne = score.diceOne;
          playerDoc.diceTwo = score.diceTwo;
          playerDoc.total = score.total;
        }
      }

      if (result.winnerUserId) {
        game.winner = toObjectId(result.winnerUserId);
        game.status = 'PAYOUT';

        const winnerWallet = await WalletRepository.findByUserId(result.winnerUserId, session);
        if (winnerWallet) {
          const balanceBefore = winnerWallet.balance;
          const updatedWinnerWallet = await WalletRepository.updateBalance(
            result.winnerUserId,
            result.payout.winnerPayout,
            session
          );

          if (updatedWinnerWallet) {
            await LedgerRepository.createEntry(
              {
                wallet: updatedWinnerWallet._id,
                user: toObjectId(result.winnerUserId),
                type: 'CREDIT',
                amount: result.payout.winnerPayout,
                balanceBefore,
                balanceAfter: updatedWinnerWallet.balance,
                reference: `WIN-${game._id}`,
                reason: 'GAME_WIN',
                game: game._id,
              },
              session
            );
          }
        }
      } else {
        // Restitution en cas d'Égalité
        game.winner = undefined;
        for (const p of game.players) {
          const pId = (p.user._id || p.user).toString();
          const w = await WalletRepository.findByUserId(pId, session);
          if (w) {
            const balanceBefore = w.balance;
            const updatedW = await WalletRepository.updateBalance(pId, game.bet, session);

            if (updatedW) {
              await LedgerRepository.createEntry(
                {
                  wallet: updatedW._id,
                  user: toObjectId(pId),
                  type: 'CREDIT',
                  amount: game.bet,
                  balanceBefore,
                  balanceAfter: updatedW.balance,
                  reference: `REFUND-${game._id}`,
                  reason: 'REFUND',
                  game: game._id,
                },
                session
              );
            }
          }
        }
      }

      game.status = 'FINISHED';
      await game.save({ session });

      return game;
    });
  }

  public static async rollPlayerDice(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) {
        throw new NotFoundError('Partie non trouvée.');
      }

      if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
        throw new ValidationError('Cette partie est déjà terminée.');
      }

      const playerIndex = game.players.findIndex(
        (p) => (p.user._id || p.user).toString() === userId
      );

      if (playerIndex === -1) {
        throw new ValidationError('Vous ne participez pas à cette partie.');
      }

      const playerDoc = game.players[playerIndex];

      if (playerDoc.total > 0 || playerDoc.diceOne > 0) {
        throw new ValidationError('Vous avez déjà lancé vos dés pour cette partie.');
      }

      const diceOne = Math.floor(Math.random() * 6) + 1;
      const diceTwo = Math.floor(Math.random() * 6) + 1;
      const total = diceOne + diceTwo;

      playerDoc.diceOne = diceOne;
      playerDoc.diceTwo = diceTwo;
      playerDoc.total = total;
      game.status = 'ROLLING_DICE';

      const allPlayersRolled = game.players.every((p) => p.total > 0 || p.diceOne > 0);

      if (allPlayersRolled) {
        let maxScore = -1;
        let winners: string[] = [];

        for (const p of game.players) {
          const pId = (p.user._id || p.user).toString();
          if (p.total > maxScore) {
            maxScore = p.total;
            winners = [pId];
          } else if (p.total === maxScore) {
            winners.push(pId);
          }
        }

        if (winners.length > 1) {
          game.winner = undefined;
          game.status = 'FINISHED';

          for (const p of game.players) {
            const pId = (p.user._id || p.user).toString();
            const w = await WalletRepository.findByUserId(pId, session);
            if (w) {
              const balanceBefore = w.balance;
              const updatedW = await WalletRepository.updateBalance(pId, game.bet, session);

              if (updatedW) {
                await LedgerRepository.createEntry(
                  {
                    wallet: updatedW._id,
                    user: toObjectId(pId),
                    type: 'CREDIT',
                    amount: game.bet,
                    balanceBefore,
                    balanceAfter: updatedW.balance,
                    reference: `REFUND-${game._id}`,
                    reason: 'REFUND',
                    game: game._id,
                  },
                  session
                );
              }
            }
          }
        } else {
          const winnerUserId = winners[0];
          game.winner = toObjectId(winnerUserId);
          game.status = 'FINISHED';

          const winnerWallet = await WalletRepository.findByUserId(winnerUserId, session);
          if (winnerWallet) {
            const balanceBefore = winnerWallet.balance;
            const updatedWinnerWallet = await WalletRepository.updateBalance(winnerUserId, game.totalPot, session);

            if (updatedWinnerWallet) {
              await LedgerRepository.createEntry(
                {
                  wallet: updatedWinnerWallet._id,
                  user: toObjectId(winnerUserId),
                  type: 'CREDIT',
                  amount: game.totalPot,
                  balanceBefore,
                  balanceAfter: updatedWinnerWallet.balance,
                  reference: `WIN-${game._id}`,
                  reason: 'GAME_WIN',
                  game: game._id,
                },
                session
              );
            }
          }
        }
      }

      await game.save({ session });
      return game;
    });
  }

  public static async cancelGame(gameId: string, userId: string, isAdmin: boolean = false) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) {
        throw new NotFoundError('Partie non trouvée.');
      }

      if (!isAdmin && game.creator.toString() !== userId) {
        throw new UnauthorizedError('Seul le créateur ou un administrateur peut annuler la partie.');
      }

      if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
        throw new ValidationError('Cette partie ne peut plus être annulée.');
      }

      game.status = 'CANCELLED';
      await game.save({ session });

      // Remboursement de tous les joueurs inscrits
      for (const p of game.players) {
        const pId = (p.user._id || p.user).toString();
        const w = await WalletRepository.findByUserId(pId, session);
        if (w) {
          const balanceBefore = w.balance;
          const updatedW = await WalletRepository.updateBalance(pId, game.bet, session);

          if (updatedW) {
            await LedgerRepository.createEntry(
              {
                wallet: updatedW._id,
                user: toObjectId(pId),
                type: 'CREDIT',
                amount: game.bet,
                balanceBefore,
                balanceAfter: updatedW.balance,
                reference: `CANCEL-${game._id}`,
                reason: 'REFUND',
                game: game._id,
              },
              session
            );
          }
        }
      }

      return game;
    });
  }

  public static async proposeRematch(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) {
        throw new NotFoundError('Partie introuvable.');
      }
      if (!isParticipant(game, userId)) {
        throw new ForbiddenError('Vous ne faites pas partie de cette partie.');
      }
      game.rematchRequestedBy = toObjectId(userId);
      await game.save({ session });
      return game;
    });
  }

  public static async acceptRematch(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const oldGame = await GameRepository.findById(gameId, session);
      if (!oldGame) {
        throw new NotFoundError('Partie introuvable.');
      }
      if (!isParticipant(oldGame, userId)) {
        throw new ForbiddenError('Vous ne faites pas partie de cette partie.');
      }

      const newGame = await this.createGame({
        userId,
        bet: oldGame.bet,
        maxPlayers: oldGame.maxPlayers,
        isPrivate: oldGame.isPrivate,
      });

      oldGame.nextGameId = newGame._id;
      await oldGame.save({ session });
      return newGame;
    });
  }

  public static async getGameDetails(gameId: string) {
    return GameRepository.findById(gameId);
  }

  public static async declineRematch(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) {
        throw new NotFoundError('Partie introuvable.');
      }
      if (!isParticipant(game, userId)) {
        throw new ForbiddenError('Vous ne faites pas partie de cette partie.');
      }
      game.rematchRequestedBy = undefined;
      await game.save({ session });
      return game;
    });
  }
}

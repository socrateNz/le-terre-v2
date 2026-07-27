import { GameRepository } from '@/repositories/GameRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { GameEngine } from '@/lib/gameEngine/GameEngine';
import { runTransaction } from '@/lib/db';
import { ValidationError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { GAME_CONFIG } from '@/config/game';

export interface CreateGameInput {
  userId: string;
  bet: number;
  maxPlayers?: number;
}

export class GameService {
  public static async createGame(input: CreateGameInput) {
    const { userId, bet, maxPlayers = 2 } = input;

    if (bet < GAME_CONFIG.MIN_BET || bet > GAME_CONFIG.MAX_BET) {
      throw new ValidationError(`La mise doit être comprise entre ${GAME_CONFIG.MIN_BET} et ${GAME_CONFIG.MAX_BET} crédits.`);
    }

    if (maxPlayers < GAME_CONFIG.MIN_PLAYERS || maxPlayers > GAME_CONFIG.MAX_PLAYERS) {
      throw new ValidationError(`Le nombre de joueurs doit être entre ${GAME_CONFIG.MIN_PLAYERS} et ${GAME_CONFIG.MAX_PLAYERS}.`);
    }

    return runTransaction(async (session) => {
      // 1. Vérification et déduction atomique de la mise du créateur
      const wallet = await WalletRepository.findByUserId(userId, session);
      if (!wallet || wallet.balance < bet) {
        throw new ValidationError('Solde insuffisant pour créer cette partie.');
      }

      const balanceBefore = wallet.balance;
      const updatedWallet = await WalletRepository.updateBalance(userId, -bet, session);
      if (!updatedWallet) {
        throw new ValidationError('Impossible de déduire la mise.');
      }

      // 2. Création du document Game avec le premier joueur
      const game = await GameRepository.createGame(
        {
          creator: userId as any,
          maxPlayers,
          bet,
          status: maxPlayers === 1 ? 'READY' : 'WAITING_FOR_PLAYERS',
          players: [
            {
              user: userId as any,
              diceOne: 0,
              diceTwo: 0,
              total: 0,
              joinedAt: new Date(),
            } as any,
          ],
          totalPot: bet,
        },
        session
      );

      // 3. Enregistrement dans le journal comptable Ledger
      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: userId as any,
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

  public static async joinGame(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) {
        throw new NotFoundError('Partie non trouvée.');
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
        throw new ValidationError('Solde insuffisant pour rejoindre cette partie.');
      }

      const balanceBefore = wallet.balance;
      const updatedWallet = await WalletRepository.updateBalance(userId, -game.bet, session);
      if (!updatedWallet) {
        throw new ValidationError('Impossible de déduire la mise.');
      }

      game.players.push({
        user: userId as any,
        diceOne: 0,
        diceTwo: 0,
        total: 0,
        joinedAt: new Date(),
      } as any);

      game.totalPot += game.bet;

      if (game.players.length === game.maxPlayers) {
        game.status = 'READY';
      }

      await game.save({ session });

      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: userId as any,
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

      // Exécution du moteur de jeu GameEngine
      const executionPlayers = game.players.map((p) => ({
        userId: (p.user._id || p.user).toString(),
      }));

      const result = GameEngine.playDiceGame(game.bet, executionPlayers);

      // Mise à jour des scores des dés sur les joueurs
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
        game.winner = result.winnerUserId as any;
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
                user: result.winnerUserId as any,
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
        // En cas d'Égalité (Match Nul) : Restitution des mises à chaque participant
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
                  user: pId as any,
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

      // Lancer de 2 dés certifiés (1 à 6)
      const diceOne = Math.floor(Math.random() * 6) + 1;
      const diceTwo = Math.floor(Math.random() * 6) + 1;
      const total = diceOne + diceTwo;

      playerDoc.diceOne = diceOne;
      playerDoc.diceTwo = diceTwo;
      playerDoc.total = total;
      game.status = 'ROLLING_DICE';

      // Vérifier si tous les joueurs ont lancé leurs dés
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

        // Gestion de l'Égalité (Match Nul)
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
                    user: pId as any,
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
          // Un seul vainqueur
          const winnerUserId = winners[0];
          game.winner = winnerUserId as any;
          game.status = 'FINISHED';

          const winnerWallet = await WalletRepository.findByUserId(winnerUserId, session);
          if (winnerWallet) {
            const balanceBefore = winnerWallet.balance;
            const updatedWinnerWallet = await WalletRepository.updateBalance(
              winnerUserId,
              game.totalPot,
              session
            );

            if (updatedWinnerWallet) {
              await LedgerRepository.createEntry(
                {
                  wallet: updatedWinnerWallet._id,
                  user: winnerUserId as any,
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

  public static async proposeRematch(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) throw new NotFoundError('Partie non trouvée.');

      if (game.status !== 'FINISHED') {
        throw new ValidationError('La partie doit être terminée pour proposer une revanche.');
      }

      const isPlayerInGame = game.players.some(
        (p) => (p.user._id || p.user).toString() === userId
      );
      if (!isPlayerInGame) {
        throw new ValidationError('Vous ne participez pas à cette partie.');
      }

      const wallet = await WalletRepository.findByUserId(userId, session);
      if (!wallet || wallet.balance < game.bet) {
        throw new ValidationError('Solde insuffisant pour proposer une revanche.');
      }

      game.rematchRequestedBy = userId as any;
      await game.save({ session });
      return game;
    });
  }

  public static async acceptRematch(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) throw new NotFoundError('Partie non trouvée.');

      if (!game.rematchRequestedBy) {
        throw new ValidationError('Aucune demande de revanche active.');
      }

      const requesterId = game.rematchRequestedBy.toString();
      if (requesterId === userId) {
        throw new ValidationError('Vous ne pouvez pas accepter votre propre demande.');
      }

      const isPlayerInGame = game.players.some(
        (p) => (p.user._id || p.user).toString() === userId
      );
      if (!isPlayerInGame) {
        throw new ValidationError('Vous ne participez pas à cette partie.');
      }

      const requesterWallet = await WalletRepository.findByUserId(requesterId, session);
      const acceptorWallet = await WalletRepository.findByUserId(userId, session);

      if (!requesterWallet || requesterWallet.balance < game.bet) {
        throw new ValidationError('Le solde du joueur demandeur est insuffisant.');
      }

      if (!acceptorWallet || acceptorWallet.balance < game.bet) {
        throw new ValidationError('Solde insuffisant pour accepter la revanche.');
      }

      const reqBalanceBefore = requesterWallet.balance;
      const updatedReqWallet = await WalletRepository.updateBalance(requesterId, -game.bet, session);

      const accBalanceBefore = acceptorWallet.balance;
      const updatedAccWallet = await WalletRepository.updateBalance(userId, -game.bet, session);

      if (!updatedReqWallet || !updatedAccWallet) {
        throw new ValidationError('Erreur lors du débit des mises.');
      }

      const newGame = await GameRepository.createGame(
        {
          creator: requesterId as any,
          maxPlayers: game.maxPlayers,
          bet: game.bet,
          status: 'WAITING_FOR_PLAYERS',
          players: [
            {
              user: requesterId as any,
              diceOne: 0,
              diceTwo: 0,
              total: 0,
              joinedAt: new Date(),
            } as any,
            {
              user: userId as any,
              diceOne: 0,
              diceTwo: 0,
              total: 0,
              joinedAt: new Date(),
            } as any,
          ],
          totalPot: game.bet * 2,
        },
        session
      );

      await LedgerRepository.createEntry(
        {
          wallet: updatedReqWallet._id,
          user: requesterId as any,
          type: 'DEBIT',
          amount: game.bet,
          balanceBefore: reqBalanceBefore,
          balanceAfter: updatedReqWallet.balance,
          reference: `BET-${newGame._id}`,
          reason: 'GAME_BET',
          game: newGame._id,
        },
        session
      );

      await LedgerRepository.createEntry(
        {
          wallet: updatedAccWallet._id,
          user: userId as any,
          type: 'DEBIT',
          amount: game.bet,
          balanceBefore: accBalanceBefore,
          balanceAfter: updatedAccWallet.balance,
          reference: `BET-${newGame._id}`,
          reason: 'GAME_BET',
          game: newGame._id,
        },
        session
      );

      game.nextGameId = newGame._id;
      await game.save({ session });

      return newGame;
    });
  }

  public static async declineRematch(gameId: string, userId: string) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) throw new NotFoundError('Partie non trouvée.');

      game.rematchRequestedBy = undefined;
      await game.save({ session });
      return game;
    });
  }

  public static async cancelGame(gameId: string, userId: string, isAdmin = false) {
    return runTransaction(async (session) => {
      const game = await GameRepository.findById(gameId, session);
      if (!game) throw new NotFoundError('Partie non trouvée.');

      if (game.status === 'FINISHED') {
        throw new ValidationError('Impossible d’annuler une partie déjà terminée.');
      }

      if (game.status === 'CANCELLED') {
        throw new ValidationError('Cette partie a déjà été annulée.');
      }

      const creatorId = (game.creator._id || game.creator).toString();
      if (creatorId !== userId && !isAdmin) {
        throw new UnauthorizedError('Seul le créateur de la partie (ou un administrateur) peut l’annuler.');
      }

      // Restitution automatique des mises à tous les joueurs inscrits
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
                user: pId as any,
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

      game.status = 'CANCELLED';
      await game.save({ session });
      return game;
    });
  }

  public static async listGames() {
    return GameRepository.findAllActive();
  }

  public static async getGameDetails(gameId: string) {
    return GameRepository.findById(gameId);
  }

  public static async getUserGames(userId: string) {
    return GameRepository.findUserGames(userId);
  }
}

import { DiceEngine } from './DiceEngine';
import { TieBreaker } from './TieBreaker';
import { PayoutEngine, PayoutCalculation } from './PayoutEngine';

export interface GameExecutionPlayer {
  userId: string;
}

export interface GameExecutionResult {
  playerScores: Array<{
    userId: string;
    diceOne: number;
    diceTwo: number;
    total: number;
  }>;
  winnerUserId: string | null;
  payout: PayoutCalculation;
}

export class GameEngine {
  /**
   * Exécute une partie complète de dés :
   * 1. Lancer des dés pour tous les participants.
   * 2. Résolution des égalités si nécessaire.
   * 3. Calcul de la cagnotte et de la récompense du vainqueur.
   */
  public static playDiceGame(
    bet: number,
    players: GameExecutionPlayer[]
  ): GameExecutionResult {
    if (!players || players.length < 2) {
      throw new Error('Une partie nécessite au moins 2 joueurs.');
    }

    // 1. Tirage initial des dés pour chaque joueur
    const initialRolls = players.map((player) => {
      const roll = DiceEngine.rollDicePair();
      return {
        userId: player.userId,
        diceOne: roll.diceOne,
        diceTwo: roll.diceTwo,
        total: roll.total,
      };
    });

    // 2. Détermination du vainqueur et gestion des égalités
    const tieBreakResult = TieBreaker.resolveWinner(initialRolls);

    // 3. Calcul de la cagnotte
    const payout = PayoutEngine.calculatePayout(bet, players.length);

    return {
      playerScores: tieBreakResult.finalScores,
      winnerUserId: tieBreakResult.winnerUserId,
      payout,
    };
  }
}

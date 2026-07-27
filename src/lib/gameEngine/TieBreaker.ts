import { DiceEngine, DiceRollResult } from './DiceEngine';

export interface PlayerScoreInput {
  userId: string;
  total: number;
  diceOne?: number;
  diceTwo?: number;
}

export interface TieBreakerResult {
  finalScores: Array<{
    userId: string;
    diceOne: number;
    diceTwo: number;
    total: number;
  }>;
  winnerUserId: string | null;
}

export class TieBreaker {
  /**
   * Détermine le vainqueur unique ou signale un match nul en cas d'égalité des scores.
   */
  public static resolveWinner(players: PlayerScoreInput[]): TieBreakerResult {
    if (!players || players.length === 0) {
      throw new Error('Aucun joueur fourni pour la détermination du vainqueur.');
    }

    const currentScores = players.map((p) => ({
      userId: p.userId,
      diceOne: p.diceOne || 0,
      diceTwo: p.diceTwo || 0,
      total: p.total,
    }));

    const highestScore = Math.max(...currentScores.map((p) => p.total));
    const leaders = currentScores.filter((p) => p.total === highestScore);

    // En cas d'égalité (leaders.length > 1), return winnerUserId = null (Match Nul)
    const winnerUserId = leaders.length === 1 ? leaders[0].userId : null;

    return {
      finalScores: currentScores,
      winnerUserId,
    };
  }
}

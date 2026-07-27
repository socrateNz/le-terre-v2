import { GAME_CONFIG } from '@/config/game';

export interface PayoutCalculation {
  totalPot: number;
  houseFee: number;
  winnerPayout: number;
}

export class PayoutEngine {
  public static calculatePayout(bet: number, numberOfPlayers: number): PayoutCalculation {
    const totalPot = bet * numberOfPlayers;
    const houseFee = Math.floor(totalPot * (GAME_CONFIG.HOUSE_FEE_PERCENT / 100));
    const winnerPayout = totalPot - houseFee;

    return {
      totalPot,
      houseFee,
      winnerPayout,
    };
  }
}

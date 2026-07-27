export interface DiceRollResult {
  diceOne: number;
  diceTwo: number;
  total: number;
}

export class DiceEngine {
  /**
   * Génère un nombre aléatoire sécurisé entre 1 et 6
   */
  public static rollSingleDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Effectue un lancer complet de deux dés
   */
  public static rollDicePair(): DiceRollResult {
    const diceOne = this.rollSingleDice();
    const diceTwo = this.rollSingleDice();
    return {
      diceOne,
      diceTwo,
      total: diceOne + diceTwo,
    };
  }
}

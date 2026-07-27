import { z } from 'zod';
import { GAME_CONFIG } from '@/config/game';

export const createGameSchema = z.object({
  bet: z
    .number({ message: 'La mise doit être un nombre' })
    .min(GAME_CONFIG.MIN_BET, `La mise minimale est de ${GAME_CONFIG.MIN_BET} crédits`)
    .max(GAME_CONFIG.MAX_BET, `La mise maximale est de ${GAME_CONFIG.MAX_BET} crédits`),
  maxPlayers: z
    .number()
    .min(GAME_CONFIG.MIN_PLAYERS)
    .max(GAME_CONFIG.MAX_PLAYERS)
    .default(2),
});

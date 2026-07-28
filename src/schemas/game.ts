import { z } from 'zod';
import { GAME_CONFIG } from '@/config/game';

export const createGameSchema = z.object({
  bet: z
    .number({ message: 'La mise doit être un nombre' })
    .min(GAME_CONFIG.MIN_BET, `La mise minimale est de ${GAME_CONFIG.MIN_BET} FCFA`)
    .max(GAME_CONFIG.MAX_BET, `La mise maximale est de ${GAME_CONFIG.MAX_BET} FCFA`),
  maxPlayers: z
    .number()
    .min(GAME_CONFIG.MIN_PLAYERS)
    .max(GAME_CONFIG.MAX_PLAYERS)
    .default(2),
  isPrivate: z.boolean().optional().default(false),
  passcode: z
    .string()
    .min(4, 'Le code PIN doit comporter 4 chiffres')
    .max(8, 'Le code PIN doit comporter 8 chiffres max')
    .optional()
    .or(z.literal('')),
});

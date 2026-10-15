import { z } from 'zod';
import { WALLET_CONFIG } from '@/config/wallet';

export const depositSchema = z.object({
  amount: z.number().int('Le montant doit être un nombre entier de FCFA').min(100, 'Le montant minimum est de 100 FCFA').max(500000),
  paymentMethod: z.enum(['MOBILE_MONEY', 'CARD']),
  phone: z.string().max(20).optional(),
  operator: z.enum(['MTN', 'ORANGE']).optional(),
  country: z.string().optional(),
  cardToken: z.string().max(255).optional(),
});

export const withdrawSchema = z.object({
  amount: z
    .number()
    .int('Le montant doit être un nombre entier de FCFA')
    .min(WALLET_CONFIG.MIN_WITHDRAW, `Montant minimum de retrait : ${WALLET_CONFIG.MIN_WITHDRAW} FCFA`)
    .max(WALLET_CONFIG.MAX_WITHDRAW, `Montant maximum de retrait : ${WALLET_CONFIG.MAX_WITHDRAW} FCFA`),
  phone: z.string().min(1, 'Numéro Mobile Money requis').max(20),
  accountNumber: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
});

export const adminWithdrawalActionSchema = z.object({
  requestId: z.string().regex(/^[a-f0-9]{24}$/i, 'requestId invalide'),
  action: z.enum(['APPROVE', 'REJECT']),
  adminComment: z.string().max(500).optional(),
  payoutReference: z.string().max(100).optional(),
});

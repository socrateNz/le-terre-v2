import { z } from 'zod';
import { WALLET_CONFIG } from '@/config/wallet';

export const depositSchema = z.object({
  amount: z.number().min(10, 'Le montant minimum est de 10 crédits'),
  paymentMethod: z.enum(['MOBILE_MONEY', 'CARD', 'TEST_CREDIT']),
  phone: z.string().optional(),
  country: z.string().optional(),
});

export const withdrawSchema = z.object({
  amount: z.number().min(WALLET_CONFIG.MIN_WITHDRAW, `Montant minimum de retrait : ${WALLET_CONFIG.MIN_WITHDRAW}`),
  phone: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  name: z.string().optional(),
});

import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z.string().min(3, 'Le pseudo doit contenir au moins 3 caractères').optional(),
  email: z.string().email('Email invalide').optional(),
  avatar: z.string().url('URL d\'avatar invalide').optional(),
  country: z.string().optional(),
});

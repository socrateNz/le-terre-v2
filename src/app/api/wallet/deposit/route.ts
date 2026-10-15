import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { WalletService } from '@/services/WalletService';
import { depositSchema } from '@/schemas/wallet';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const validated = depositSchema.parse(await req.json());

    const result = await WalletService.deposit({
      userId: auth.userId,
      amount: validated.amount,
      paymentMethod: validated.paymentMethod,
      phone: validated.phone,
      operator: validated.operator,
      cardToken: validated.cardToken,
      email: auth.email,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || 'Données invalides.' }, { status: 400 });
    }
    logger.error('[DEPOSIT] Erreur inattendue', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Erreur lors du dépôt.' }, { status: 500 });
  }
}

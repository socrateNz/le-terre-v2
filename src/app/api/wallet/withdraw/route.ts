import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { WalletService } from '@/services/WalletService';
import { withdrawSchema } from '@/schemas/wallet';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const validated = withdrawSchema.parse(await req.json());

    const result = await WalletService.withdraw(auth.userId, validated.amount, {
      phone: validated.phone,
      accountNumber: validated.accountNumber,
      bankName: validated.bankName,
      name: validated.name,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Demande de retrait enregistrée. En attente de validation administrative.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || 'Données invalides.' }, { status: 400 });
    }
    logger.error('[WITHDRAW] Erreur inattendue', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Erreur lors du retrait.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WalletService } from '@/services/WalletService';
import { withdrawSchema } from '@/schemas/wallet';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const body = await req.json();
    const validated = withdrawSchema.parse(body);

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
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur retrait.' }, { status: 400 });
  }
}

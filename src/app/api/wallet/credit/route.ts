import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WalletService } from '@/services/WalletService';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const result = await WalletService.addTestCredit(auth.userId);

    return NextResponse.json({
      success: true,
      data: result,
      message: '+500 FCFA de test ajoutés avec succès !',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur crédit test.' }, { status: 400 });
  }
}

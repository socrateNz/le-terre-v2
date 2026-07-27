import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WalletService } from '@/services/WalletService';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const walletData = await WalletService.getWallet(auth.userId);

    return NextResponse.json({
      success: true,
      data: walletData,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur wallet.' }, { status: 400 });
  }
}

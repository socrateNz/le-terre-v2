import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletService } from '@/services/WalletService';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const ref = req.nextUrl.searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ success: false, error: 'Référence de transaction requise.' }, { status: 400 });
    }

    const tx = await TransactionRepository.findByReference(ref);

    // Une transaction d'un autre joueur est traitée comme introuvable
    if (!tx || tx.user.toString() !== auth.userId || tx.type !== 'DEPOSIT') {
      return NextResponse.json({ success: false, error: 'Transaction introuvable.' }, { status: 404 });
    }

    const status = await WalletService.verifyAndSettleDeposit(tx);

    return NextResponse.json({
      success: true,
      data: {
        reference: tx.paymentReference,
        status, // 'pending' | 'completed' | 'failed'
        amount: tx.amount,
        message: status === 'failed' ? 'Le paiement a été annulé, refusé ou a expiré.' : undefined,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur lors du suivi du statut.' }, { status: 500 });
  }
}

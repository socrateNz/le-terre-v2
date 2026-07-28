import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { runTransaction } from '@/lib/db';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs.' }, { status: 403 });
    }

    await connectDB();
    const requests = await WithdrawRequest.find()
      .populate('user', 'username email avatar country')
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur liste demandes de retrait.' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs.' }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action, adminComment } = body;

    if (!requestId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides (requestId, action=APPROVE|REJECT).' }, { status: 400 });
    }

    await connectDB();

    const updatedRequest = await runTransaction(async (session) => {
      const withdrawReq = await WithdrawRequest.findById(requestId).session(session);
      if (!withdrawReq) {
        throw new AppError('Demande de retrait introuvable.', 404);
      }

      if (withdrawReq.status !== 'pending') {
        throw new AppError('Cette demande a déjà été traitée.', 400);
      }

      const userId = withdrawReq.user.toString();

      if (action === 'APPROVE') {
        withdrawReq.status = 'approved';
        withdrawReq.adminComment = adminComment || 'Retrait approuvé et exécuté par l\'administrateur';
        withdrawReq.processedAt = new Date();
        await withdrawReq.save({ session });
      } else if (action === 'REJECT') {
        // En cas de rejet, on remet les crédits sur le solde du joueur
        const wallet = await WalletRepository.findByUserId(userId, session);
        if (wallet) {
          const balanceBefore = wallet.balance;
          const updatedWallet = await WalletRepository.updateBalance(userId, withdrawReq.amount, session);
          if (updatedWallet) {
            await LedgerRepository.createEntry(
              {
                wallet: updatedWallet._id,
                user: userId as any,
                type: 'CREDIT',
                amount: withdrawReq.amount,
                balanceBefore,
                balanceAfter: updatedWallet.balance,
                reference: `REFUND_WITHDRAW_${requestId}`,
                reason: 'REFUND',
              },
              session
            );
          }
        }

        withdrawReq.status = 'rejected';
        withdrawReq.adminComment = adminComment || 'Demande de retrait rejetée par l\'administrateur';
        withdrawReq.processedAt = new Date();
        await withdrawReq.save({ session });
      }

      return withdrawReq;
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: action === 'APPROVE' ? 'Demande de retrait approuvée !' : 'Demande de retrait rejetée et crédits restitués.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur traitement retrait.' }, { status: 400 });
  }
}

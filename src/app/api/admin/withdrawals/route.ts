import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { NotchPayClient } from '@/lib/notchpay';
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

    console.log(`[ADMIN_WITHDRAWAL_LOG] 📩 Action reçue: ${action} pour la demande ID: ${requestId}`);

    if (!requestId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides (requestId, action=APPROVE|REJECT).' }, { status: 400 });
    }

    await connectDB();

    let transferMessage = '';

    const updatedRequest = await runTransaction(async (session) => {
      const withdrawReq = await WithdrawRequest.findById(requestId).populate('user').session(session);
      if (!withdrawReq) {
        throw new AppError('Demande de retrait introuvable.', 404);
      }

      if (withdrawReq.status !== 'pending') {
        throw new AppError('Cette demande a déjà été traitée.', 400);
      }

      const userId = (withdrawReq.user._id || withdrawReq.user).toString();

      if (action === 'APPROVE') {
        console.log(`[ADMIN_WITHDRAWAL_LOG] Approbation du retrait de ${withdrawReq.amount} FCFA vers ${withdrawReq.accountDetails?.phone}...`);

        // 1. Déclenchement impératif du virement NotchPay AVANT toute validation
        if (withdrawReq.provider === 'NOTCHPAY' && withdrawReq.accountDetails?.phone) {
          const transferRes = await NotchPayClient.sendTransfer({
            amount: withdrawReq.amount,
            phone: withdrawReq.accountDetails.phone,
            reference: `WITH-${withdrawReq._id}`,
            recipientName: (withdrawReq.user as any)?.username,
          });

          console.log(`[ADMIN_WITHDRAWAL_LOG] Résultat Virement NotchPay: success=${transferRes.success}, message="${transferRes.message}"`);

          // Si le virement NotchPay échoue (ex: "This merchant could not transfer funds"), ON ANNULE L'ACTION
          if (!transferRes.success) {
            throw new AppError(`Échec du virement NotchPay : ${transferRes.message}`, 400);
          }

          transferMessage = transferRes.message;
        }

        // 2. Si et SEULEMENT SI le virement est validé par NotchPay, on marque la demande comme approuvée
        withdrawReq.status = 'approved';
        withdrawReq.adminComment = adminComment || transferMessage || 'Retrait approuvé et virement Mobile Money exécuté avec succès.';
        withdrawReq.processedAt = new Date();
        await withdrawReq.save({ session });
      } else if (action === 'REJECT') {
        console.log(`[ADMIN_WITHDRAWAL_LOG] Rejet du retrait de ${withdrawReq.amount} FCFA. Restitution des fonds à l'utilisateur ${userId}...`);

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
      message: action === 'APPROVE'
        ? `Retrait approuvé et virement Mobile Money exécuté avec succès !`
        : 'Demande de retrait rejetée et crédits restitués au joueur.',
    });
  } catch (error: any) {
    console.error(`[ADMIN_WITHDRAWAL_LOG] ❌ Erreur / Annulation retrait:`, error);
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur traitement retrait.' }, { status: 400 });
  }
}

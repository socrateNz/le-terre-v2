import { NextRequest, NextResponse } from 'next/server';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { runTransaction } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (payload.type === 'checkout.session.completed') {
      const sessionData = payload.data.object;
      const reference = sessionData.client_reference_id;
      const amount = sessionData.amount_total / 100;

      if (reference) {
        await runTransaction(async (session) => {
          const tx = await TransactionRepository.findByReference(reference, session);
          if (!tx || tx.status === 'completed') {
            return;
          }

          const walletBefore = await WalletRepository.findByUserId(tx.user.toString(), session);
          const balanceBefore = walletBefore?.balance || 0;

          const updatedWallet = await WalletRepository.updateBalance(tx.user.toString(), amount, session);
          if (updatedWallet) {
            await TransactionRepository.updateStatus(reference, 'completed', session);

            await LedgerRepository.createEntry(
              {
                wallet: updatedWallet._id,
                user: tx.user,
                type: 'CREDIT',
                amount,
                balanceBefore,
                balanceAfter: updatedWallet.balance,
                reference,
                reason: 'DEPOSIT',
                transaction: tx._id,
              },
              session
            );
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook Stripe Exception', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

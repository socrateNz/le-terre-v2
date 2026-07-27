import { NextRequest, NextResponse } from 'next/server';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { NotchPayClient } from '@/lib/notchpay';
import { runTransaction } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-notchpay-signature') || '';

    const isValid = NotchPayClient.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    if (event === 'payment.complete' || event === 'charge.complete') {
      const reference = data.reference;
      const amount = data.amount;

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

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook NotchPay Exception', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

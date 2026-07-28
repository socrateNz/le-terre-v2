import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { Wallet } from '@/models/Wallet';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { PAYMENT_CONFIG } from '@/config/payment';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs.' }, { status: 403 });
    }

    await connectDB();

    const pendingTxs = await Transaction.find({
      status: 'pending',
      provider: 'NOTCHPAY',
    });

    if (pendingTxs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Toutes les transactions NotchPay sont déjà à jour.',
        data: { syncedCount: 0 },
      });
    }

    const { PUBLIC_KEY, BASE_URL } = PAYMENT_CONFIG.NOTCHPAY;
    if (!PUBLIC_KEY) {
      return NextResponse.json({ success: false, error: 'Clé API NotchPay non configurée.' }, { status: 400 });
    }

    // Récupération des paiements NotchPay
    const listRes = await fetch(`${BASE_URL}/payments?per_page=100`, {
      headers: { Authorization: PUBLIC_KEY, Accept: 'application/json' },
    });

    const notchMap = new Map();

    if (listRes.ok) {
      const listData = await listRes.json();
      const items = listData.items || [];

      for (const item of items) {
        if (item.reference) {
          try {
            const detailRes = await fetch(`${BASE_URL}/payments/${item.reference}`, {
              headers: { Authorization: PUBLIC_KEY, Accept: 'application/json' },
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const trx = detailData.transaction;
              if (trx) {
                if (trx.merchant_reference) notchMap.set(trx.merchant_reference, trx);
                if (trx.reference) notchMap.set(trx.reference, trx);
                if (trx.trxref) notchMap.set(trx.trxref, trx);
              }
            }
          } catch {}
        }
      }
    }

    let updatedCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const tx of pendingTxs) {
      const notchTrx = notchMap.get(tx.paymentReference) || notchMap.get(tx.providerReference);

      if (!notchTrx) {
        tx.status = 'failed';
        await tx.save();
        updatedCount++;
        failedCount++;
        continue;
      }

      const notchStatus = notchTrx.status;

      if (notchStatus === 'complete' || notchStatus === 'successful') {
        tx.status = 'completed';
        tx.providerReference = notchTrx.reference;
        await tx.save();

        const wallet = await Wallet.findOne({ user: tx.user });
        if (wallet) {
          const balanceBefore = wallet.balance;
          wallet.balance += tx.amount;
          await wallet.save();

          await LedgerRepository.createEntry({
            wallet: wallet._id,
            user: tx.user,
            type: 'CREDIT',
            amount: tx.amount,
            balanceBefore,
            balanceAfter: wallet.balance,
            reference: tx.paymentReference,
            reason: 'DEPOSIT',
            transaction: tx._id,
          });
        }
        updatedCount++;
        completedCount++;
      } else if (
        notchStatus === 'canceled' ||
        notchStatus === 'failed' ||
        notchStatus === 'expired' ||
        notchStatus === 'abandoned'
      ) {
        tx.status = 'failed';
        tx.providerReference = notchTrx.reference;
        await tx.save();
        updatedCount++;
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée. ${updatedCount} transaction(s) mise(s) à jour (${completedCount} validées, ${failedCount} échouées).`,
      data: {
        analyzed: pendingTxs.length,
        updatedCount,
        completedCount,
        failedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Erreur lors de la synchronisation.' }, { status: 500 });
  }
}

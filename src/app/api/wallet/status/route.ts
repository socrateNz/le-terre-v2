import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { NotchPayClient } from '@/lib/notchpay';
import { StripeClient } from '@/lib/stripe';
import { runTransaction } from '@/lib/db';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ success: false, error: 'Référence de transaction requise.' }, { status: 400 });
    }

    const tx = await TransactionRepository.findByReference(ref);

    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction introuvable.' }, { status: 404 });
    }

    // Si la transaction est toujours en attente localement
    if (tx.status === 'pending') {
      // A. Si Prestataire Stripe
      if (tx.provider === 'STRIPE' && tx.providerReference) {
        const stripeStatus = await StripeClient.checkSessionStatus(tx.providerReference);

        if (stripeStatus === 'paid') {
          await runTransaction(async (session) => {
            const walletBefore = await WalletRepository.findByUserId(tx.user.toString(), session);
            const balanceBefore = walletBefore?.balance || 0;

            const updatedWallet = await WalletRepository.updateBalance(tx.user.toString(), tx.amount, session);
            if (updatedWallet) {
              await TransactionRepository.updateStatus(ref, 'completed', session);

              await LedgerRepository.createEntry(
                {
                  wallet: updatedWallet._id,
                  user: tx.user,
                  type: 'CREDIT',
                  amount: tx.amount,
                  balanceBefore,
                  balanceAfter: updatedWallet.balance,
                  reference: ref,
                  reason: 'DEPOSIT',
                  transaction: tx._id,
                },
                session
              );
            }
          });

          return NextResponse.json({
            success: true,
            data: {
              reference: ref,
              status: 'completed',
              amount: tx.amount,
            },
          });
        }
      }

      // B. Si Prestataire NotchPay
      const searchRef = tx.providerReference || tx.paymentReference;

      if (searchRef && tx.provider === 'NOTCHPAY') {
        const notchResult = await NotchPayClient.checkTransactionStatus(searchRef);

        if (notchResult) {
          const notchStatus = notchResult.status;

          // Sauvegarde de l'identifiant de transaction NotchPay découvert (trx.XXX)
          if (notchResult.providerReference && tx.providerReference !== notchResult.providerReference) {
            tx.providerReference = notchResult.providerReference;
            await tx.save();
          }

          if (
            notchStatus === 'canceled' ||
            notchStatus === 'failed' ||
            notchStatus === 'expired' ||
            notchStatus === 'abandoned'
          ) {
            // Mise à jour immédiate du statut en 'failed' dans MongoDB pour arrêter le spinner
            await TransactionRepository.updateStatus(ref, 'failed');
            return NextResponse.json({
              success: true,
              data: {
                reference: ref,
                status: 'failed',
                amount: tx.amount,
                message: 'Le paiement a été annulé par le client ou l\'opérateur.',
              },
            });
          }

          if (notchStatus === 'complete' || notchStatus === 'completed' || notchStatus === 'successful') {
            await runTransaction(async (session) => {
              const walletBefore = await WalletRepository.findByUserId(tx.user.toString(), session);
              const balanceBefore = walletBefore?.balance || 0;

              const updatedWallet = await WalletRepository.updateBalance(tx.user.toString(), tx.amount, session);
              if (updatedWallet) {
                await TransactionRepository.updateStatus(ref, 'completed', session);

                await LedgerRepository.createEntry(
                  {
                    wallet: updatedWallet._id,
                    user: tx.user,
                    type: 'CREDIT',
                    amount: tx.amount,
                    balanceBefore,
                    balanceAfter: updatedWallet.balance,
                    reference: ref,
                    reason: 'DEPOSIT',
                    transaction: tx._id,
                  },
                  session
                );
              }
            });

            return NextResponse.json({
              success: true,
              data: {
                reference: ref,
                status: 'completed',
                amount: tx.amount,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: tx.paymentReference,
        status: tx.status, // 'pending' | 'completed' | 'failed'
        amount: tx.amount,
        message: tx.status === 'failed' ? 'Transaction annulée ou expirée.' : undefined,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur lors du suivi du statut.' }, { status: 400 });
  }
}

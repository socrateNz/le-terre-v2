import { PaymentRouter, DepositRequestParams } from '@/lib/paymentRouter';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { runTransaction } from '@/lib/db';
import { WALLET_CONFIG } from '@/config/wallet';
import { AppError } from '@/lib/errors';
import { convexCache } from '@/lib/convexCache';

export class WalletService {
  public static async getWallet(userId: string) {
    return convexCache.fetchWithCache(
      `wallet:${userId}`,
      async () => {
        const wallet = await WalletRepository.findByUserId(userId);
        const transactions = await TransactionRepository.findByUserId(userId, 20);
        const ledger = await LedgerRepository.findByUserId(userId, 20);

        return {
          balance: wallet ? wallet.balance : 0, // Solde Réel Retirable (FCFA)
          walletId: wallet ? wallet._id : null,
          transactions,
          ledger,
        };
      },
      15, // Cache pendant 15 secondes
      [`user:${userId}`, 'wallet']
    );
  }

  public static async deposit(params: Omit<DepositRequestParams, 'reference'> & { userId: string }) {
    const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const response = await PaymentRouter.processDeposit({
      ...params,
      reference,
    });

    // 1. Si Carte Direct In-App validée (Solde Réel FCFA)
    if (response.directCardCompleted) {
      await runTransaction(async (session) => {
        const walletBefore = await WalletRepository.findByUserId(params.userId, session);
        const balanceBefore = walletBefore?.balance || 0;

        const updatedWallet = await WalletRepository.updateBalance(params.userId, params.amount, session);
        if (updatedWallet) {
          const tx = await TransactionRepository.create(
            {
              user: params.userId as any,
              amount: params.amount,
              type: 'DEPOSIT',
              provider: response.provider,
              paymentMethod: params.paymentMethod,
              paymentReference: reference,
              providerReference: response.providerReference,
              status: 'completed',
              reason: `Dépôt Carte Bancaire Direct`,
            },
            session
          );

          await LedgerRepository.createEntry(
            {
              wallet: updatedWallet._id,
              user: params.userId as any,
              type: 'CREDIT',
              amount: params.amount,
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

      // Invalidation instantanée du cache portefeuille pour cet utilisateur
      convexCache.invalidateTag(`user:${params.userId}`);
    }
    // 2. Si Mobile Money USSD en attente (Solde Réel FCFA)
    else {
      await TransactionRepository.create({
        user: params.userId as any,
        amount: params.amount,
        type: 'DEPOSIT',
        provider: response.provider,
        paymentMethod: params.paymentMethod,
        paymentReference: reference,
        providerReference: response.providerReference,
        status: 'pending',
        reason: `Dépôt Réel via ${params.paymentMethod}`,
      });
    }

    return response;
  }

  public static async withdraw(userId: string, amount: number, accountDetails: any) {
    if (amount < WALLET_CONFIG.MIN_WITHDRAW) {
      throw new AppError(`Le montant minimum de retrait est de ${WALLET_CONFIG.MIN_WITHDRAW} FCFA.`, 400);
    }

    return await runTransaction(async (session) => {
      const wallet = await WalletRepository.findByUserId(userId, session);

      if (!wallet || wallet.balance < amount) {
        throw new AppError('Solde réel insuffisant pour effectuer un retrait.', 400);
      }

      const balanceBefore = wallet.balance;
      const updatedWallet = await WalletRepository.updateBalance(userId, -amount, session);

      if (!updatedWallet) {
        throw new AppError('Erreur lors du débit pour le retrait.', 500);
      }

      const reference = `WITH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 1. Enregistrement de la demande dans la collection WithdrawRequest pour l'admin
      const withdrawRequest = new WithdrawRequest({
        user: userId as any,
        amount,
        fee: 0,
        netAmount: amount,
        provider: 'NOTCHPAY',
        accountDetails: {
          phone: accountDetails.phone,
          accountNumber: accountDetails.accountNumber,
          bankName: accountDetails.bankName,
          name: accountDetails.name,
        },
        status: 'pending',
      });
      await withdrawRequest.save({ session });

      // 2. Enregistrement dans la collection Transaction
      const tx = await TransactionRepository.create(
        {
          user: userId as any,
          amount,
          type: 'WITHDRAWAL',
          provider: 'NOTCHPAY',
          paymentMethod: 'MOBILE_MONEY',
          paymentReference: reference,
          status: 'pending',
          reason: `Demande de retrait vers ${accountDetails.phone || 'Mobile Money'}`,
        },
        session
      );

      // 3. Journalisation dans le Ledger comptable
      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: userId as any,
          type: 'DEBIT',
          amount,
          balanceBefore,
          balanceAfter: updatedWallet.balance,
          reference,
          reason: 'WITHDRAWAL',
          transaction: tx._id,
        },
        session
      );

      // Invalidation du cache portefeuille utilisateur
      convexCache.invalidateTag(`user:${userId}`);

      return {
        success: true,
        reference,
        newBalance: updatedWallet.balance,
      };
    });
  }
}

import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WithdrawRepository } from '@/repositories/WithdrawRepository';
import { PaymentRouter, DepositRequestParams } from '@/lib/paymentRouter';
import { runTransaction } from '@/lib/db';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { WALLET_CONFIG } from '@/config/wallet';

export class WalletService {
  public static async getWallet(userId: string) {
    const wallet = await WalletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundError('Portefeuille non trouvé.');
    }
    const transactions = await TransactionRepository.findByUserId(userId, 20);
    const ledger = await LedgerRepository.findByUserId(userId, 20);
    const withdrawals = await WithdrawRepository.findByUserId(userId);

    return {
      balance: wallet.balance,
      transactions,
      ledger,
      withdrawals,
    };
  }

  public static async addTestCredit(userId: string) {
    const amount = WALLET_CONFIG.TEST_CREDIT_AMOUNT;
    const reference = `TEST-${Date.now()}`;

    return runTransaction(async (session) => {
      const walletBefore = await WalletRepository.findByUserId(userId, session);
      const balanceBefore = walletBefore?.balance || 0;

      const updatedWallet = await WalletRepository.updateBalance(userId, amount, session);
      if (!updatedWallet) {
        throw new ValidationError('Impossible de créditer le compte.');
      }

      const tx = await TransactionRepository.create(
        {
          user: userId as any,
          amount,
          type: 'CREDIT_TEST',
          provider: 'TEST_CREDIT',
          paymentMethod: 'TEST_CREDIT',
          paymentReference: reference,
          status: 'completed',
          reason: 'Crédit de démonstration +100',
        },
        session
      );

      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: userId as any,
          type: 'CREDIT',
          amount,
          balanceBefore,
          balanceAfter: updatedWallet.balance,
          reference,
          reason: 'TEST_CREDIT',
          transaction: tx._id,
        },
        session
      );

      return {
        balance: updatedWallet.balance,
        transaction: tx,
      };
    });
  }

  public static async deposit(params: Omit<DepositRequestParams, 'reference'> & { userId: string }) {
    const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const response = await PaymentRouter.processDeposit({
      ...params,
      reference,
    });

    // Si Mode Test immédiat
    if (params.paymentMethod === 'TEST_CREDIT') {
      await this.addTestCredit(params.userId);
    } else {
      await TransactionRepository.create({
        user: params.userId as any,
        amount: params.amount,
        type: 'DEPOSIT',
        provider: response.provider,
        paymentMethod: params.paymentMethod,
        paymentReference: reference,
        status: 'pending',
        reason: `Dépôt via ${params.paymentMethod}`,
      });
    }

    return response;
  }

  public static async withdraw(userId: string, amount: number, accountDetails: any) {
    if (amount < WALLET_CONFIG.MIN_WITHDRAW) {
      throw new ValidationError(`Le montant minimum de retrait est de ${WALLET_CONFIG.MIN_WITHDRAW} crédits.`);
    }

    return runTransaction(async (session) => {
      const wallet = await WalletRepository.findByUserId(userId, session);
      if (!wallet || wallet.balance < amount) {
        throw new ValidationError('Solde insuffisant pour effectuer ce retrait.');
      }

      const fee = Math.floor(amount * (WALLET_CONFIG.WITHDRAW_FEE_PERCENT / 100));
      const netAmount = amount - fee;
      const balanceBefore = wallet.balance;

      // Déduire immédiatement du solde pour éviter les dépenses en double
      const updatedWallet = await WalletRepository.updateBalance(userId, -amount, session);
      if (!updatedWallet) {
        throw new ValidationError('Erreur lors de la déduction du solde.');
      }

      const withdrawReq = await WithdrawRepository.create(
        {
          user: userId as any,
          amount,
          fee,
          netAmount,
          provider: 'NOTCHPAY',
          accountDetails,
          status: 'pending',
        },
        session
      );

      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: userId as any,
          type: 'DEBIT',
          amount,
          balanceBefore,
          balanceAfter: updatedWallet.balance,
          reference: `WITHDRAW-${withdrawReq._id}`,
          reason: 'WITHDRAWAL',
        },
        session
      );

      return withdrawReq;
    });
  }
}

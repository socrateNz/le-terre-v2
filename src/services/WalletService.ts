import crypto from 'crypto';
import { PaymentRouter, DepositRequestParams } from '@/lib/paymentRouter';
import { CodeesClient, normalizeCameroonPhone, NormalizedPaymentStatus } from '@/lib/codees';
import { StripeClient } from '@/lib/stripe';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { ITransactionDocument } from '@/models/Transaction';
import { runTransaction, toObjectId } from '@/lib/db';
import { WALLET_CONFIG } from '@/config/wallet';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { convexCache } from '@/lib/convexCache';

export interface WithdrawAccountDetails {
  phone: string;
  accountNumber?: string;
  bankName?: string;
  name?: string;
}

const newReference = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

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

  /**
   * Initie un dépôt. La transaction 'pending' est enregistrée AVANT l'appel au prestataire,
   * pour qu'aucun paiement ne puisse aboutir sans trace en base.
   */
  public static async deposit(params: Omit<DepositRequestParams, 'reference'> & { userId: string }) {
    PaymentRouter.validateDeposit(params);

    const reference = newReference('DEP');
    const provider = params.paymentMethod === 'CARD' ? 'STRIPE' : 'CODEES';

    await TransactionRepository.create({
      user: toObjectId(params.userId),
      amount: params.amount,
      type: 'DEPOSIT',
      provider,
      paymentMethod: params.paymentMethod,
      paymentReference: reference,
      status: 'pending',
      reason: params.paymentMethod === 'CARD' ? 'Dépôt Carte Bancaire' : 'Dépôt Mobile Money',
    });

    let response;
    try {
      response = await PaymentRouter.processDeposit({ ...params, reference });
    } catch (error) {
      // Refus explicite du prestataire : le dépôt est échoué.
      if (error instanceof AppError) {
        await TransactionRepository.claimPending(reference, 'DEPOSIT', 'failed');
        throw error;
      }
      // Erreur réseau : la demande a pu partir quand même, on la laisse en attente
      // pour que la vérification de statut la règle plus tard.
      logger.error(`[WALLET] Initiation incertaine du dépôt ${reference}`, error instanceof Error ? error.message : error);
      throw new AppError('Le prestataire de paiement ne répond pas. Vérifiez votre téléphone, le dépôt sera crédité s\'il est validé.', 502);
    }

    if (response.providerReference) {
      await TransactionRepository.setProviderReference(reference, response.providerReference);
    }

    let status: NormalizedPaymentStatus = response.status;
    if (status !== 'pending') {
      status = await this.settleDeposit(reference, status);
    }

    convexCache.invalidateTag(`user:${params.userId}`);

    return {
      provider: response.provider,
      reference,
      status,
      message: response.message,
    };
  }

  /**
   * Règle un dépôt en attente (crédit ou échec) de manière idempotente :
   * le passage pending → final est atomique, donc un dépôt n'est jamais crédité deux fois,
   * même si le polling client, le webhook et la synchro admin arrivent en même temps.
   * Retourne le statut final de la transaction.
   */
  public static async settleDeposit(
    reference: string,
    outcome: 'completed' | 'failed'
  ): Promise<NormalizedPaymentStatus> {
    const settled = await runTransaction(async (session) => {
      const tx = await TransactionRepository.claimPending(reference, 'DEPOSIT', outcome, session);
      if (!tx) return null;

      if (outcome === 'completed') {
        const userId = tx.user.toString();
        const updatedWallet = await WalletRepository.updateBalance(userId, tx.amount, session);
        if (!updatedWallet) {
          throw new AppError(`Portefeuille introuvable pour le dépôt ${reference}.`, 500);
        }

        await LedgerRepository.createEntry(
          {
            wallet: updatedWallet._id,
            user: tx.user,
            type: 'CREDIT',
            amount: tx.amount,
            balanceBefore: updatedWallet.balance - tx.amount,
            balanceAfter: updatedWallet.balance,
            reference,
            reason: 'DEPOSIT',
            transaction: tx._id,
          },
          session
        );
      }

      return tx;
    });

    if (settled) {
      convexCache.invalidateTag(`user:${settled.user.toString()}`);
      return outcome;
    }

    // Déjà réglée par un autre appel : on renvoie l'état réel
    const current = await TransactionRepository.findByReference(reference);
    return (current?.status as NormalizedPaymentStatus) || 'pending';
  }

  /**
   * Interroge le prestataire (source de vérité) puis règle le dépôt s'il est terminé.
   */
  public static async verifyAndSettleDeposit(tx: ITransactionDocument): Promise<NormalizedPaymentStatus> {
    if (tx.type !== 'DEPOSIT') {
      throw new AppError('Cette transaction n\'est pas un dépôt.', 400);
    }
    if (tx.status !== 'pending') return tx.status;

    let providerStatus: NormalizedPaymentStatus | null = null;

    if (tx.provider === 'CODEES') {
      const result = await CodeesClient.checkPaymentStatus(tx.paymentReference);
      if (result) {
        if (result.status === 'completed' && result.amount !== undefined && result.amount !== tx.amount) {
          logger.error(
            `[WALLET] Montant incohérent pour ${tx.paymentReference} : attendu ${tx.amount}, reçu ${result.amount}. Vérification manuelle requise.`
          );
          return 'pending';
        }
        providerStatus = result.status;
      }
    } else if (tx.provider === 'STRIPE' && tx.providerReference) {
      providerStatus = await StripeClient.getPaymentStatus(tx.providerReference);
    }
    // Les anciens dépôts NotchPay ne sont plus vérifiables automatiquement : ils restent en attente.

    if (!providerStatus || providerStatus === 'pending') return 'pending';
    return this.settleDeposit(tx.paymentReference, providerStatus);
  }

  public static async withdraw(userId: string, amount: number, accountDetails: WithdrawAccountDetails) {
    if (!Number.isInteger(amount) || amount < WALLET_CONFIG.MIN_WITHDRAW || amount > WALLET_CONFIG.MAX_WITHDRAW) {
      throw new AppError(
        `Le montant de retrait doit être compris entre ${WALLET_CONFIG.MIN_WITHDRAW} et ${WALLET_CONFIG.MAX_WITHDRAW} FCFA.`,
        400
      );
    }

    const phone = normalizeCameroonPhone(accountDetails.phone);
    if (!phone) {
      throw new AppError('Numéro Mobile Money invalide (format attendu : 6XXXXXXXX).', 400);
    }

    const reference = newReference('WITH');

    const result = await runTransaction(async (session) => {
      // Débit atomique : échoue si le solde est insuffisant (filtre balance >= amount)
      const updatedWallet = await WalletRepository.updateBalance(userId, -amount, session);
      if (!updatedWallet) {
        throw new AppError('Solde réel insuffisant pour effectuer un retrait.', 400);
      }

      // 1. Demande de retrait à traiter par l'admin (virement Mobile Money manuel)
      const withdrawRequest = new WithdrawRequest({
        user: toObjectId(userId),
        amount,
        fee: 0,
        netAmount: amount,
        provider: 'MANUAL',
        reference,
        accountDetails: {
          phone,
          accountNumber: accountDetails.accountNumber,
          bankName: accountDetails.bankName,
          name: accountDetails.name,
        },
        status: 'pending',
      });
      await withdrawRequest.save({ session });

      // 2. Transaction utilisateur
      const tx = await TransactionRepository.create(
        {
          user: toObjectId(userId),
          amount,
          type: 'WITHDRAWAL',
          provider: 'MANUAL',
          paymentMethod: 'MOBILE_MONEY',
          paymentReference: reference,
          status: 'pending',
          reason: `Demande de retrait vers ${phone}`,
        },
        session
      );

      // 3. Ledger comptable
      await LedgerRepository.createEntry(
        {
          wallet: updatedWallet._id,
          user: toObjectId(userId),
          type: 'DEBIT',
          amount,
          balanceBefore: updatedWallet.balance + amount,
          balanceAfter: updatedWallet.balance,
          reference,
          reason: 'WITHDRAWAL',
          transaction: tx._id,
        },
        session
      );

      return {
        success: true,
        reference,
        newBalance: updatedWallet.balance,
      };
    });

    convexCache.invalidateTag(`user:${userId}`);
    return result;
  }

  /**
   * Traitement admin d'une demande de retrait.
   * Codees n'offrant pas d'API de virement sortant, l'admin effectue le virement Mobile Money
   * lui-même puis approuve ici (avec la référence du virement). Le verrou pending → final
   * est atomique : deux clics simultanés ne peuvent pas traiter deux fois la même demande.
   */
  public static async processWithdrawal(
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    options: { adminComment?: string; payoutReference?: string } = {}
  ) {
    const result = await runTransaction(async (session) => {
      const isApprove = action === 'APPROVE';

      const withdrawReq = await WithdrawRequest.findOneAndUpdate(
        { _id: requestId, status: 'pending' },
        {
          status: isApprove ? 'approved' : 'rejected',
          adminComment:
            options.adminComment ||
            (isApprove ? 'Retrait approuvé, virement Mobile Money effectué.' : 'Demande de retrait rejetée par l\'administrateur.'),
          payoutReference: options.payoutReference,
          processedAt: new Date(),
        },
        { session, returnDocument: 'after' }
      ).exec();

      if (!withdrawReq) {
        const exists = await WithdrawRequest.exists({ _id: requestId }).session(session);
        throw new AppError(exists ? 'Cette demande a déjà été traitée.' : 'Demande de retrait introuvable.', exists ? 409 : 404);
      }

      const userId = withdrawReq.user.toString();

      if (!isApprove) {
        const updatedWallet = await WalletRepository.updateBalance(userId, withdrawReq.amount, session);
        if (!updatedWallet) {
          throw new AppError('Portefeuille du joueur introuvable : remboursement impossible.', 500);
        }

        await LedgerRepository.createEntry(
          {
            wallet: updatedWallet._id,
            user: withdrawReq.user,
            type: 'CREDIT',
            amount: withdrawReq.amount,
            balanceBefore: updatedWallet.balance - withdrawReq.amount,
            balanceAfter: updatedWallet.balance,
            reference: `REFUND_WITHDRAW_${requestId}`,
            reason: 'REFUND',
          },
          session
        );
      }

      // Les anciennes demandes (avant ce champ) n'ont pas de référence de transaction liée
      if (withdrawReq.reference) {
        await TransactionRepository.claimPending(
          withdrawReq.reference,
          'WITHDRAWAL',
          isApprove ? 'completed' : 'failed',
          session
        );
      }

      return withdrawReq;
    });

    convexCache.invalidateTag(`user:${result.user.toString()}`);
    return result;
  }
}

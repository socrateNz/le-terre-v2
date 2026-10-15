import { CodeesClient, detectOperator, MobileOperator, NormalizedPaymentStatus } from './codees';
import { StripeClient } from './stripe';
import { AppError } from './errors';
import { PAYMENT_CONFIG, isStripeTestModeForbidden } from '@/config/payment';

export interface DepositRequestParams {
  amount: number;
  email: string;
  phone?: string;
  operator?: MobileOperator;
  paymentMethod: 'MOBILE_MONEY' | 'CARD';
  cardToken?: string;
  reference: string;
}

export interface DepositResponse {
  provider: 'CODEES' | 'STRIPE';
  reference: string;
  providerReference?: string;
  status: NormalizedPaymentStatus;
  message?: string;
}

export class PaymentRouter {
  /** Contrôles effectués AVANT d'enregistrer la transaction en base. */
  public static validateDeposit(params: Omit<DepositRequestParams, 'reference'>): void {
    const { amount, paymentMethod, phone, cardToken } = params;

    if (paymentMethod === 'MOBILE_MONEY') {
      const { MIN_AMOUNT, MAX_AMOUNT } = PAYMENT_CONFIG.CODEES;
      if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
        throw new AppError(`Le montant Mobile Money doit être compris entre ${MIN_AMOUNT} et ${MAX_AMOUNT} FCFA.`, 400);
      }
      if (!phone) {
        throw new AppError('Numéro Mobile Money requis.', 400);
      }
      if (!params.operator && !detectOperator(phone)) {
        throw new AppError('Opérateur non reconnu : choisissez MTN ou Orange.', 400);
      }
      return;
    }

    if (amount < PAYMENT_CONFIG.STRIPE.MIN_AMOUNT) {
      throw new AppError(
        `Le montant minimum pour un paiement par carte est de ${PAYMENT_CONFIG.STRIPE.MIN_AMOUNT} FCFA.`,
        400
      );
    }
    if (!cardToken) {
      throw new AppError('Informations de carte manquantes.', 400);
    }
    if (isStripeTestModeForbidden()) {
      throw new AppError('Le paiement par carte est temporairement indisponible.', 503);
    }
  }

  public static async processDeposit(params: DepositRequestParams): Promise<DepositResponse> {
    const { amount, email, phone, paymentMethod, cardToken, reference } = params;

    // 1. Mobile Money (Codees : push USSD MTN / Orange)
    if (paymentMethod === 'MOBILE_MONEY') {
      const operator = params.operator || detectOperator(phone!)!;
      const result = await CodeesClient.initiatePayment({
        amount,
        phone: phone!,
        operator,
        reference,
        customerEmail: email,
      });

      return {
        provider: 'CODEES',
        reference,
        providerReference: result.transactionId,
        status: result.status,
        message: result.message,
      };
    }

    // 2. Carte Bancaire (Stripe)
    const stripeResult = await StripeClient.processDirectCardPayment({
      amount,
      currency: 'xaf',
      email,
      reference,
      token: cardToken!,
    });

    return {
      provider: 'STRIPE',
      reference,
      providerReference: stripeResult.paymentIntentId,
      status: stripeResult.status,
      message: stripeResult.message,
    };
  }
}

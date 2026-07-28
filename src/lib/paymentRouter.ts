import { NotchPayClient } from './notchpay';
import { StripeClient } from './stripe';
import { AppError } from './errors';

export interface DepositRequestParams {
  amount: number;
  currency?: string;
  email: string;
  phone?: string;
  country?: string;
  paymentMethod: 'MOBILE_MONEY' | 'CARD';
  cardToken?: string;
  reference: string;
  baseUrl: string;
}

export interface DepositResponse {
  provider: 'NOTCHPAY' | 'STRIPE';
  redirectUrl: string;
  reference: string;
  providerReference?: string;
  directUssd?: boolean;
  directCardCompleted?: boolean;
  message?: string;
}

export class PaymentRouter {
  public static async processDeposit(params: DepositRequestParams): Promise<DepositResponse> {
    const { amount, email, phone, country = 'CM', paymentMethod, cardToken, reference, baseUrl } = params;

    // 1. Mobile Money (NotchPay USSD Direct In-App)
    if (paymentMethod === 'MOBILE_MONEY' || (country === 'CM' && paymentMethod !== 'CARD')) {
      if (amount < 50) {
        throw new AppError('Le montant minimum de rechargement par Mobile Money est de 50 FCFA.', 400);
      }

      const notchResponse = await NotchPayClient.initializePayment({
        amount,
        currency: 'XAF',
        email,
        phone,
        reference,
        callbackUrl: `${baseUrl}/api/webhooks/notchpay`,
        description: `Recharge Le Terre - ${amount} FCFA`,
      });

      const trxRef = notchResponse.transaction?.reference;
      if (trxRef && phone) {
        try {
          const chargeResult = await NotchPayClient.chargeDirectPayment(trxRef, phone);
          const returnedTrxRef = chargeResult.transaction?.reference || trxRef;
          return {
            provider: 'NOTCHPAY',
            redirectUrl: notchResponse.authorization_url || `${baseUrl}/wallet?ref=${reference}`,
            reference,
            providerReference: returnedTrxRef,
            directUssd: true,
            message: chargeResult.message || 'Demande USSD transmise à votre opérateur Mobile Money. Veuillez valider avec votre code PIN.',
          };
        } catch {
          // Fallback sur la redirection si la charge directe USSD échoue
        }
      }

      return {
        provider: 'NOTCHPAY',
        redirectUrl: notchResponse.authorization_url || `${baseUrl}/wallet?ref=${reference}`,
        reference,
        providerReference: trxRef,
      };
    }

    // 2. Carte Bancaire (Stripe Direct In-App sans aucune redirection)
    if (amount < 350) {
      throw new AppError(
        'Le montant minimum pour un paiement par carte (Stripe) est de 350 FCFA (soit environ 0.50 €). Pour les rechargements dès 50 FCFA, utilisez Mobile Money.',
        400
      );
    }

    const stripeResult = await StripeClient.processDirectCardPayment({
      amount,
      currency: 'xaf',
      email,
      reference,
      token: cardToken || 'tok_visa',
    });

    return {
      provider: 'STRIPE',
      redirectUrl: `${baseUrl}/wallet?status=success&ref=${reference}`,
      reference,
      providerReference: stripeResult.paymentIntentId,
      directCardCompleted: stripeResult.status === 'succeeded',
      message: stripeResult.message || 'Recharge par Carte validée avec succès.',
    };
  }
}

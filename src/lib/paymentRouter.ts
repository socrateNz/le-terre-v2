import { NotchPayClient } from './notchpay';
import { StripeClient } from './stripe';

export interface DepositRequestParams {
  amount: number;
  currency?: string;
  email: string;
  phone?: string;
  country?: string;
  paymentMethod: 'MOBILE_MONEY' | 'CARD' | 'TEST_CREDIT';
  reference: string;
  baseUrl: string;
}

export interface DepositResponse {
  provider: 'NOTCHPAY' | 'STRIPE' | 'TEST_CREDIT';
  redirectUrl: string;
  reference: string;
}

export class PaymentRouter {
  public static async processDeposit(params: DepositRequestParams): Promise<DepositResponse> {
    const { amount, email, phone, country = 'CM', paymentMethod, reference, baseUrl } = params;

    // 1. Si Mode Test Rapide
    if (paymentMethod === 'TEST_CREDIT') {
      return {
        provider: 'TEST_CREDIT',
        redirectUrl: `${baseUrl}/wallet?status=success&ref=${reference}`,
        reference,
      };
    }

    // 2. Si Cameroun OU Mobile Money -> NotchPay
    if (country === 'CM' || paymentMethod === 'MOBILE_MONEY') {
      const notchResponse = await NotchPayClient.initializePayment({
        amount,
        currency: 'XAF',
        email,
        phone,
        reference,
        callbackUrl: `${baseUrl}/api/webhooks/notchpay`,
        description: `Recharge de ${amount} crédits Le Terre`,
      });

      return {
        provider: 'NOTCHPAY',
        redirectUrl: notchResponse.authorization_url || `${baseUrl}/wallet?ref=${reference}`,
        reference,
      };
    }

    // 3. International / Carte -> Stripe
    const stripeResponse = await StripeClient.createCheckoutSession({
      amount,
      currency: 'EUR',
      email,
      reference,
      successUrl: `${baseUrl}/wallet?status=success&ref=${reference}`,
      cancelUrl: `${baseUrl}/wallet?status=cancel`,
    });

    return {
      provider: 'STRIPE',
      redirectUrl: stripeResponse.checkoutUrl || `${baseUrl}/wallet?ref=${reference}`,
      reference,
    };
  }
}

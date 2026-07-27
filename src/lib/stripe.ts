import { PAYMENT_CONFIG } from '@/config/payment';

export interface InitializeStripeParams {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeInitializeResponse {
  sessionId?: string;
  checkoutUrl?: string;
}

export class StripeClient {
  public static async createCheckoutSession(
    params: InitializeStripeParams
  ): Promise<StripeInitializeResponse> {
    const secretKey = PAYMENT_CONFIG.STRIPE.SECRET_KEY;

    // Si les clés Stripe ne sont pas définies, simuler la session
    if (!secretKey) {
      return {
        sessionId: `sim_stripe_${params.reference}`,
        checkoutUrl: `${params.successUrl}?reference=${params.reference}&session_id=sim_stripe_${params.reference}`,
      };
    }

    try {
      // Intégration HTTP directe avec l'API Stripe
      const body = new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': params.currency.toLowerCase() || 'eur',
        'line_items[0][price_data][product_data][name]': 'Recharge Wallet Le Terre',
        'line_items[0][price_data][unit_amount]': Math.round(params.amount * 100).toString(),
        'line_items[0][quantity]': '1',
        mode: 'payment',
        customer_email: params.email,
        client_reference_id: params.reference,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();
      return {
        sessionId: data.id,
        checkoutUrl: data.url,
      };
    } catch (error: any) {
      throw new Error(`Erreur lors de l'initialisation de Stripe: ${error.message}`);
    }
  }
}

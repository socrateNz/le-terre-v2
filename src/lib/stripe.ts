import { PAYMENT_CONFIG } from '@/config/payment';

export interface InitializeStripeParams {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
}

export interface DirectStripeCardParams {
  amount: number;
  currency?: string;
  email: string;
  reference: string;
  token?: string;
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  cvc?: string;
}

export interface StripeInitializeResponse {
  sessionId?: string;
  checkoutUrl?: string;
}

export interface StripeDirectCardResponse {
  status: 'succeeded' | 'requires_action' | 'failed';
  paymentIntentId?: string;
  message?: string;
}

export class StripeClient {
  /**
   * Effectue un paiement direct par carte bancaire (Stripe) 100% In-App sans aucune redirection
   */
  public static async processDirectCardPayment(
    params: DirectStripeCardParams
  ): Promise<StripeDirectCardResponse> {
    const secretKey = PAYMENT_CONFIG.STRIPE.SECRET_KEY;

    // Mode simulation si clé non définie
    if (!secretKey) {
      return {
        status: 'succeeded',
        paymentIntentId: `pi_sim_${params.reference}`,
        message: 'Recharge par Carte démo validée avec succès.',
      };
    }

    try {
      const curr = (params.currency || 'xaf').toLowerCase();
      const unitAmount = Math.round(params.amount);

      // 1. Créer le PaymentIntent en XAF
      const piBody = new URLSearchParams({
        amount: unitAmount.toString(),
        currency: curr,
        'payment_method_types[]': 'card',
        description: `Recharge Le Terre - ${params.amount} FCFA`,
        customer_email: params.email,
        client_reference_id: params.reference,
      });

      const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: piBody.toString(),
      });

      const piData = await piRes.json();
      if (!piRes.ok || piData.error) {
        throw new Error(piData.error?.message || `Erreur Stripe PaymentIntent (${piRes.status})`);
      }

      const piId = piData.id;
      const cardToken = params.token || 'tok_visa';

      // 2. Créer le PaymentMethod Stripe via token
      const pmBody = new URLSearchParams({
        type: 'card',
        'card[token]': cardToken,
      });

      const pmRes = await fetch('https://api.stripe.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: pmBody.toString(),
      });

      const pmData = await pmRes.json();
      if (!pmRes.ok || pmData.error) {
        throw new Error(pmData.error?.message || `Erreur Carte Stripe (${pmRes.status})`);
      }

      // 3. Confirmer le PaymentIntent en direct
      const confirmBody = new URLSearchParams({
        payment_method: pmData.id,
      });

      const confirmRes = await fetch(`https://api.stripe.com/v1/payment_intents/${piId}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: confirmBody.toString(),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || confirmData.error) {
        throw new Error(confirmData.error?.message || 'Échec de la validation de la carte.');
      }

      if (confirmData.status === 'succeeded') {
        return {
          status: 'succeeded',
          paymentIntentId: piId,
          message: 'Paiement par Carte validé avec succès !',
        };
      }

      return {
        status: confirmData.status,
        paymentIntentId: piId,
        message: 'En attente de confirmation bancaire.',
      };
    } catch (error: any) {
      throw new Error(`Erreur Stripe Carte: ${error.message}`);
    }
  }

  public static async createCheckoutSession(
    params: InitializeStripeParams
  ): Promise<StripeInitializeResponse> {
    const secretKey = PAYMENT_CONFIG.STRIPE.SECRET_KEY;

    if (!secretKey) {
      return {
        sessionId: `sim_stripe_${params.reference}`,
        checkoutUrl: `${params.successUrl}&reference=${params.reference}`,
      };
    }

    try {
      const curr = (params.currency || 'xaf').toLowerCase();
      const unitAmount = curr === 'xaf' ? Math.round(params.amount) : Math.round(params.amount * 100);

      const body = new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': curr,
        'line_items[0][price_data][product_data][name]': `Recharge Le Terre - ${params.amount} FCFA`,
        'line_items[0][price_data][unit_amount]': unitAmount.toString(),
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
      if (!response.ok) {
        throw new Error(data.error?.message || `Erreur Stripe HTTP ${response.status}`);
      }

      return {
        sessionId: data.id,
        checkoutUrl: data.url,
      };
    } catch (error: any) {
      throw new Error(`Erreur lors de l'initialisation de Stripe: ${error.message}`);
    }
  }

  public static async checkSessionStatus(sessionId: string): Promise<string | null> {
    const secretKey = PAYMENT_CONFIG.STRIPE.SECRET_KEY;
    if (!secretKey) return null;

    try {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.payment_status || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}

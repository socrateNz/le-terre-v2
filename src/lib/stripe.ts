import crypto from 'crypto';
import { PAYMENT_CONFIG } from '@/config/payment';
import { AppError } from './errors';
import type { NormalizedPaymentStatus } from './codees';

export interface DirectStripeCardParams {
  amount: number;
  currency?: string;
  email: string;
  reference: string;
  token: string;
}

export interface StripeDirectCardResponse {
  status: NormalizedPaymentStatus;
  paymentIntentId?: string;
  message?: string;
}

const STRIPE_API = 'https://api.stripe.com/v1';
const WEBHOOK_TOLERANCE_SECONDS = 300;

function ensureConfigured(): string {
  const secretKey = PAYMENT_CONFIG.STRIPE.SECRET_KEY;
  if (!secretKey) {
    throw new AppError('Le paiement par carte est indisponible (clé Stripe non configurée).', 503);
  }
  return secretKey;
}

async function stripeRequest(path: string, method: 'GET' | 'POST', body?: URLSearchParams) {
  const secretKey = ensureConfigured();
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body?.toString(),
    cache: 'no-store',
  });
  const data = await res.json();
  return { ok: res.ok && !data.error, data };
}

/** Statut d'un PaymentIntent Stripe ramené au vocabulaire interne. */
export function normalizeStripeIntentStatus(status: string): NormalizedPaymentStatus {
  if (status === 'succeeded') return 'completed';
  if (status === 'canceled' || status === 'requires_payment_method') return 'failed';
  return 'pending';
}

export class StripeClient {
  /**
   * Paiement direct par carte (PaymentIntent confirmé immédiatement).
   * XAF est une devise sans décimale chez Stripe : le montant est envoyé tel quel.
   */
  public static async processDirectCardPayment(params: DirectStripeCardParams): Promise<StripeDirectCardResponse> {
    const curr = (params.currency || 'xaf').toLowerCase();

    const pm = await stripeRequest(
      '/payment_methods',
      'POST',
      new URLSearchParams({ type: 'card', 'card[token]': params.token })
    );
    if (!pm.ok) {
      throw new AppError(`Carte refusée : ${pm.data.error?.message || 'carte invalide.'}`, 400);
    }

    const pi = await stripeRequest(
      '/payment_intents',
      'POST',
      new URLSearchParams({
        amount: Math.round(params.amount).toString(),
        currency: curr,
        'payment_method_types[]': 'card',
        payment_method: pm.data.id,
        confirm: 'true',
        description: `Recharge Le Terre - ${params.amount} FCFA`,
        receipt_email: params.email,
        'metadata[reference]': params.reference,
      })
    );

    if (!pi.ok) {
      const intentId = pi.data.error?.payment_intent?.id;
      return {
        status: 'failed',
        paymentIntentId: intentId,
        message: pi.data.error?.message || 'Échec du paiement par carte.',
      };
    }

    const status = normalizeStripeIntentStatus(pi.data.status);
    return {
      status,
      paymentIntentId: pi.data.id,
      message:
        status === 'completed'
          ? 'Paiement par Carte validé avec succès !'
          : status === 'failed'
          ? 'Paiement par carte refusé.'
          : 'En attente de confirmation bancaire.',
    };
  }

  /**
   * Statut faisant foi d'un paiement Stripe (PaymentIntent `pi_` ou Checkout Session `cs_`).
   */
  public static async getPaymentStatus(providerReference: string): Promise<NormalizedPaymentStatus | null> {
    try {
      if (providerReference.startsWith('cs_')) {
        const { ok, data } = await stripeRequest(`/checkout/sessions/${providerReference}`, 'GET');
        if (!ok) return null;
        if (data.payment_status === 'paid') return 'completed';
        return data.status === 'expired' ? 'failed' : 'pending';
      }

      const { ok, data } = await stripeRequest(`/payment_intents/${providerReference}`, 'GET');
      if (!ok) return null;
      return normalizeStripeIntentStatus(data.status);
    } catch {
      return null;
    }
  }

  /**
   * Vérifie l'en-tête `Stripe-Signature` (HMAC-SHA256 de `${timestamp}.${payload}`).
   */
  public static verifyWebhookSignature(payload: string, header: string | null): boolean {
    const secret = PAYMENT_CONFIG.STRIPE.WEBHOOK_SECRET;
    if (!secret || !header) return false;

    const parts = header.split(',').map((p) => p.split('='));
    const timestamp = parts.find(([k]) => k === 't')?.[1];
    const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
    if (!timestamp || signatures.length === 0) return false;

    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) return false;

    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest();
    return signatures.some((sig) => {
      const received = Buffer.from(sig, 'hex');
      return received.length === expected.length && crypto.timingSafeEqual(received, expected);
    });
  }
}

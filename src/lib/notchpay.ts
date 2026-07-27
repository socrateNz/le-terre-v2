import { PAYMENT_CONFIG } from '@/config/payment';
import crypto from 'crypto';

export interface InitializeNotchPayParams {
  amount: number;
  currency: string;
  email: string;
  phone?: string;
  reference: string;
  callbackUrl: string;
  description: string;
}

export interface NotchPayInitializeResponse {
  status: string;
  message: string;
  authorization_url?: string;
  transaction?: {
    reference: string;
    amount: number;
    status: string;
  };
}

export class NotchPayClient {
  public static async initializePayment(
    params: InitializeNotchPayParams
  ): Promise<NotchPayInitializeResponse> {
    const { PUBLIC_KEY, BASE_URL } = PAYMENT_CONFIG.NOTCHPAY;

    // Si les clés NotchPay ne sont pas configurées, retourner une réponse de simulation pour le dev/recette
    if (!PUBLIC_KEY) {
      return {
        status: 'success',
        message: 'Mode Simulation NotchPay (Clé API manquante)',
        authorization_url: `${params.callbackUrl}?reference=${params.reference}&status=complete`,
        transaction: {
          reference: params.reference,
          amount: params.amount,
          status: 'pending',
        },
      };
    }

    try {
      const response = await fetch(`${BASE_URL}/checkout/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: PUBLIC_KEY,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || 'XAF',
          email: params.email,
          phone: params.phone,
          reference: params.reference,
          callback_url: params.callbackUrl,
          description: params.description,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error(`Erreur lors de l'initialisation de NotchPay: ${error.message}`);
    }
  }

  /**
   * Vérifie la signature cryptographique du Webhook NotchPay
   */
  public static verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = PAYMENT_CONFIG.NOTCHPAY.WEBHOOK_SECRET;
    if (!secret) return true; // Mode dev/recette

    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}

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

export interface NotchPayChargeResponse {
  code: number;
  status: string;
  action?: string;
  message?: string;
  transaction?: {
    reference: string;
    status: string;
    merchant_reference?: string;
  };
}

export interface NotchPayTransferParams {
  amount: number;
  phone: string;
  reference: string;
  recipientName?: string;
}

function formatCameroonPhone(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('6') && cleaned.length === 9) {
    return `+237${cleaned}`;
  }
  if (cleaned.startsWith('237') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export class NotchPayClient {
  public static async initializePayment(
    params: InitializeNotchPayParams
  ): Promise<NotchPayInitializeResponse> {
    const { PUBLIC_KEY, BASE_URL } = PAYMENT_CONFIG.NOTCHPAY;

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
      const formattedPhone = formatCameroonPhone(params.phone);

      const response = await fetch(`${BASE_URL}/payments/initialize`, {
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
          phone: formattedPhone,
          reference: params.reference,
          callback: params.callbackUrl,
          description: params.description,
          channel: 'cm.mobile',
        }),
      });

      const data = await response.json();

      if (!response.ok || data.code >= 400) {
        throw new Error(data.message || `Erreur HTTP NotchPay ${response.status}`);
      }

      return data;
    } catch (error: any) {
      throw new Error(`Erreur lors de l'initialisation de NotchPay: ${error.message}`);
    }
  }

  public static async chargeDirectPayment(
    trxRef: string,
    phone: string
  ): Promise<NotchPayChargeResponse> {
    const { PUBLIC_KEY, BASE_URL } = PAYMENT_CONFIG.NOTCHPAY;

    if (!PUBLIC_KEY) {
      return {
        code: 202,
        status: 'Accepted',
        action: 'confirm',
        message: 'Simulation USSD : Veuillez valider la transaction sur votre téléphone',
      };
    }

    try {
      const formattedPhone = formatCameroonPhone(phone);

      const response = await fetch(`${BASE_URL}/payments/${trxRef}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: PUBLIC_KEY,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          channel: 'cm.mobile',
          data: {
            phone: formattedPhone,
          },
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error(`Erreur lors du déclenchement du paiement USSD: ${error.message}`);
    }
  }

  /**
   * Effectue un virement direct Mobile Money (Payout / Transfer) au destinataire via NotchPay API
   * Avec logs de suivi en console
   */
  public static async sendTransfer(params: NotchPayTransferParams): Promise<{ success: boolean; message: string; reference?: string }> {
    const { PUBLIC_KEY, PRIVATE_KEY, BASE_URL } = PAYMENT_CONFIG.NOTCHPAY;

    if (!PUBLIC_KEY || !PRIVATE_KEY) {
      console.warn('[NOTCHPAY_TRANSFER_LOG] ⚠️ Clé Publique ou Privée manquante. Exécution en mode simulation.');
      return {
        success: true,
        message: 'Mode Simulation : Retrait approuvé (Clés NotchPay non définies).',
      };
    }

    try {
      const formattedPhone = formatCameroonPhone(params.phone);
      const payload = {
        amount: params.amount,
        currency: 'XAF',
        channel: 'cm.mobile',
        phone: formattedPhone,
        reference: params.reference,
        beneficiary: {
          phone: formattedPhone,
          name: params.recipientName || 'Joueur Le Terre',
        },
        description: `Retrait Le Terre - ${params.amount} FCFA`,
      };

      const response = await fetch(`${BASE_URL}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: PUBLIC_KEY,
          'X-Grant': PRIVATE_KEY,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && (data.status === 'complete' || data.status === 'success' || data.code === 201 || data.code === 200)) {
        return {
          success: true,
          message: data.message || 'Transfert Mobile Money exécuté avec succès par NotchPay.',
          reference: data.transfer?.reference || data.reference,
        };
      }

      return {
        success: false,
        message: data.message || `Erreur NotchPay ${response.status}: ${JSON.stringify(data)}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur virement NotchPay: ${error.message}`,
      };
    }
  }

  public static async checkTransactionStatus(
    ref: string
  ): Promise<{ status: string; providerReference?: string } | null> {
    const { PUBLIC_KEY, BASE_URL } = PAYMENT_CONFIG.NOTCHPAY;

    if (!PUBLIC_KEY) return null;

    try {
      if (ref.startsWith('trx.')) {
        const response = await fetch(`${BASE_URL}/payments/${ref}`, {
          method: 'GET',
          headers: {
            Authorization: PUBLIC_KEY,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.transaction?.status) {
            return {
              status: data.transaction.status,
              providerReference: data.transaction.reference,
            };
          }
        }
      }

      const listResponse = await fetch(`${BASE_URL}/payments`, {
        method: 'GET',
        headers: {
          Authorization: PUBLIC_KEY,
          Accept: 'application/json',
        },
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        const items = listData.items || [];

        for (const item of items) {
          if (item.reference) {
            const detailResponse = await fetch(`${BASE_URL}/payments/${item.reference}`, {
              method: 'GET',
              headers: {
                Authorization: PUBLIC_KEY,
                Accept: 'application/json',
              },
            });

            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              const trx = detailData.transaction;
              if (
                trx &&
                (trx.merchant_reference === ref || trx.trxref === ref || trx.reference === ref)
              ) {
                return {
                  status: trx.status,
                  providerReference: trx.reference,
                };
              }
            }
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  public static verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = PAYMENT_CONFIG.NOTCHPAY.WEBHOOK_SECRET;
    if (!secret) return true;

    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}

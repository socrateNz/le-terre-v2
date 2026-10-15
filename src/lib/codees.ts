import { PAYMENT_CONFIG } from '@/config/payment';
import { AppError } from './errors';
import { logger } from './logger';

/**
 * Client de la passerelle Codees Payment Gateway (Mobile Money Cameroun : MTN / Orange).
 * Doc : https://pay.codees-cm.com/merchant/api-reference/
 *
 * L'API n'expose ni virement sortant (payout) ni webhook signé documenté :
 * chaque paiement est donc vérifié côté serveur via GET /payment/status/.
 */

export type MobileOperator = 'MTN' | 'ORANGE';
export type NormalizedPaymentStatus = 'pending' | 'completed' | 'failed';

export interface CodeesInitiateParams {
  amount: number;
  phone: string;
  operator: MobileOperator;
  reference: string;
  customerName?: string;
  customerEmail?: string;
}

export interface CodeesInitiateResult {
  status: NormalizedPaymentStatus;
  message: string;
  transactionId?: string;
}

export interface CodeesStatusResult {
  status: NormalizedPaymentStatus;
  amount?: number;
  transactionId?: string;
}

type CodeesPayload = Record<string, unknown>;

const COMPLETED_STATUSES = ['completed', 'complete', 'success', 'successful', 'succeeded', 'paid'];
const FAILED_STATUSES = ['failed', 'failure', 'cancelled', 'canceled', 'expired', 'rejected', 'declined', 'error'];

export function normalizeCodeesStatus(raw: unknown): NormalizedPaymentStatus {
  const status = String(raw || '').toLowerCase();
  if (COMPLETED_STATUSES.includes(status)) return 'completed';
  if (FAILED_STATUSES.includes(status)) return 'failed';
  return 'pending';
}

/**
 * Normalise un numéro camerounais au format local à 9 chiffres (6XXXXXXXX).
 */
export function normalizeCameroonPhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00237')) digits = digits.slice(5);
  else if (digits.startsWith('237') && digits.length === 12) digits = digits.slice(3);
  return /^6\d{8}$/.test(digits) ? digits : null;
}

/**
 * Détecte l'opérateur à partir du préfixe (MTN : 650-654, 67x, 680-684 / Orange : 655-659, 686-689, 69x).
 */
export function detectOperator(phone: string): MobileOperator | null {
  const local = normalizeCameroonPhone(phone);
  if (!local) return null;
  const prefix = Number(local.slice(0, 3));
  if (prefix >= 670 && prefix <= 679) return 'MTN';
  if (prefix >= 690 && prefix <= 699) return 'ORANGE';
  if (prefix >= 650 && prefix <= 654) return 'MTN';
  if (prefix >= 655 && prefix <= 659) return 'ORANGE';
  if (prefix >= 680 && prefix <= 684) return 'MTN';
  if (prefix >= 685 && prefix <= 689) return 'ORANGE';
  return null;
}

/** Récupère un champ dans la réponse, qu'il soit à la racine ou dans `data` / `transaction`. */
function pick(payload: CodeesPayload, key: string): unknown {
  for (const source of [payload, payload.data, payload.transaction]) {
    if (source && typeof source === 'object' && key in source) {
      return (source as CodeesPayload)[key];
    }
  }
  return undefined;
}

function ensureConfigured() {
  const { API_KEY, SECRET_KEY } = PAYMENT_CONFIG.CODEES;
  if (!API_KEY || !SECRET_KEY) {
    throw new AppError('Le paiement Mobile Money est indisponible (clés Codees non configurées).', 503);
  }
}

function authHeaders(): Record<string, string> {
  return {
    'X-API-Key': PAYMENT_CONFIG.CODEES.API_KEY,
    'X-Secret-Key': PAYMENT_CONFIG.CODEES.SECRET_KEY,
    Accept: 'application/json',
  };
}

async function readJson(res: Response): Promise<CodeesPayload> {
  try {
    return (await res.json()) as CodeesPayload;
  } catch {
    return {};
  }
}

function extractError(payload: CodeesPayload, fallback: string): string {
  const candidate = payload.error || payload.message || payload.detail;
  if (typeof candidate === 'string') return candidate;
  return fallback;
}

export class CodeesClient {
  /**
   * POST /payment/process/ : déclenche la demande de paiement (push USSD) sur le téléphone du client.
   */
  public static async initiatePayment(params: CodeesInitiateParams): Promise<CodeesInitiateResult> {
    ensureConfigured();

    const phone = normalizeCameroonPhone(params.phone);
    if (!phone) {
      throw new AppError('Numéro Mobile Money invalide (format attendu : 6XXXXXXXX).', 400);
    }

    const body: Record<string, string> = {
      amount: String(params.amount),
      customer_phone: phone,
      payment_method: 'MOBILE_MONEY',
      network_code: PAYMENT_CONFIG.CODEES.NETWORKS[params.operator],
      reference: params.reference,
    };
    if (params.customerName) body.customer_name = params.customerName;
    if (params.customerEmail) body.customer_email = params.customerEmail;
    if (PAYMENT_CONFIG.CODEES.MERCHANT_PHONE) body.merchant_phone = PAYMENT_CONFIG.CODEES.MERCHANT_PHONE;

    const res = await fetch(`${PAYMENT_CONFIG.CODEES.BASE_URL}/payment/process/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const payload = await readJson(res);

    if (!res.ok) {
      logger.error(`[CODEES] Échec initiation paiement ${params.reference} (HTTP ${res.status})`, payload);
      throw new AppError(
        `Paiement Mobile Money refusé : ${extractError(payload, `erreur ${res.status}`)}`,
        res.status === 429 ? 429 : 400
      );
    }

    const transactionId = pick(payload, 'transaction_id') ?? pick(payload, 'id');

    return {
      status: normalizeCodeesStatus(pick(payload, 'status')),
      message:
        (pick(payload, 'message') as string) ||
        'Demande de paiement envoyée sur votre téléphone. Validez avec votre code PIN.',
      transactionId: transactionId ? String(transactionId) : undefined,
    };
  }

  /**
   * GET /payment/status/?reference=... : statut faisant foi côté passerelle.
   * Retourne null si la passerelle ne répond pas (le paiement reste alors en attente).
   */
  public static async checkPaymentStatus(reference: string): Promise<CodeesStatusResult | null> {
    ensureConfigured();

    try {
      const url = `${PAYMENT_CONFIG.CODEES.BASE_URL}/payment/status/?reference=${encodeURIComponent(reference)}`;
      const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
      const payload = await readJson(res);

      if (!res.ok) {
        logger.error(`[CODEES] Statut indisponible pour ${reference} (HTTP ${res.status})`, payload);
        return null;
      }

      const rawAmount = pick(payload, 'amount');
      const transactionId = pick(payload, 'transaction_id') ?? pick(payload, 'id');

      return {
        status: normalizeCodeesStatus(pick(payload, 'status')),
        amount: rawAmount !== undefined && rawAmount !== null ? Number(rawAmount) : undefined,
        transactionId: transactionId ? String(transactionId) : undefined,
      };
    } catch (error) {
      logger.error(`[CODEES] Erreur réseau statut ${reference}`, error);
      return null;
    }
  }
}

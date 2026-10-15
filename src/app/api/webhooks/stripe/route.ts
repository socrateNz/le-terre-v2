import { NextRequest, NextResponse } from 'next/server';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { WalletService } from '@/services/WalletService';
import { StripeClient } from '@/lib/stripe';
import { logger } from '@/lib/logger';

/**
 * Webhook Stripe : la signature est obligatoire, et le contenu de l'événement ne sert qu'à
 * retrouver la transaction. Le montant crédité est toujours celui enregistré en base, et le
 * statut est re-vérifié auprès de l'API Stripe avant tout crédit.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!StripeClient.verifyWebhookSignature(rawBody, req.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);
    const object = event.data?.object || {};

    let reference: string | undefined;
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      reference = object.metadata?.reference;
    } else if (event.type === 'checkout.session.completed') {
      reference = object.client_reference_id;
    }

    if (reference) {
      const tx = await TransactionRepository.findByReference(reference);
      if (tx && tx.type === 'DEPOSIT' && tx.provider === 'STRIPE') {
        if (!tx.providerReference && object.id) {
          tx.providerReference = object.id;
          await tx.save();
        }
        await WalletService.verifyAndSettleDeposit(tx);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook Stripe Exception', error instanceof Error ? error.message : error);
    // 500 : Stripe renverra l'événement plus tard
    return NextResponse.json({ error: 'Erreur de traitement' }, { status: 500 });
  }
}

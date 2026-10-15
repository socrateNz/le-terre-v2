import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { WalletService } from '@/services/WalletService';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Re-vérifie auprès des prestataires (Codees / Stripe) tous les dépôts encore en attente.
 * Un dépôt n'est réglé que si le prestataire renvoie un statut final : un dépôt récent
 * ou introuvable reste en attente au lieu d'être marqué échoué à tort.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    await connectDB();

    const pendingTxs = await Transaction.find({
      type: 'DEPOSIT',
      status: 'pending',
      provider: { $in: ['CODEES', 'STRIPE'] },
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .exec();

    let completedCount = 0;
    let failedCount = 0;

    for (const tx of pendingTxs) {
      try {
        const status = await WalletService.verifyAndSettleDeposit(tx);
        if (status === 'completed') completedCount++;
        if (status === 'failed') failedCount++;
      } catch (error) {
        logger.error(`[SYNC_PAYMENTS] Échec vérification ${tx.paymentReference}`, error instanceof Error ? error.message : error);
      }
    }

    const stillPending = pendingTxs.length - completedCount - failedCount;

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée : ${completedCount} validé(s), ${failedCount} échoué(s), ${stillPending} toujours en attente.`,
      data: { analyzed: pendingTxs.length, completedCount, failedCount, stillPending },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur lors de la synchronisation.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { WalletService } from '@/services/WalletService';
import { adminWithdrawalActionSchema } from '@/schemas/wallet';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    await connectDB();
    const requests = await WithdrawRequest.find()
      .populate('user', 'username email avatar country')
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur liste demandes de retrait.' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    const { requestId, action, adminComment, payoutReference } = adminWithdrawalActionSchema.parse(await req.json());

    if (action === 'APPROVE' && !payoutReference) {
      return NextResponse.json(
        { success: false, error: 'Indiquez la référence du virement Mobile Money effectué.' },
        { status: 400 }
      );
    }

    const updatedRequest = await WalletService.processWithdrawal(requestId, action, { adminComment, payoutReference });

    logger.info(`[ADMIN_WITHDRAWAL] ${action} demande ${requestId} par l'admin ${auth.userId}`);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message:
        action === 'APPROVE'
          ? 'Retrait marqué comme payé.'
          : 'Demande de retrait rejetée et fonds restitués au joueur.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || 'Paramètres invalides.' }, { status: 400 });
    }
    logger.error('[ADMIN_WITHDRAWAL] Erreur traitement retrait', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Erreur traitement retrait.' }, { status: 500 });
  }
}

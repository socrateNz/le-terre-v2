import { NextRequest, NextResponse } from 'next/server';
import { GameService } from '@/services/GameService';

import { getAuthUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await GameService.getGameDetails(id);
    if (!game) {
      return NextResponse.json({ success: false, error: 'Partie non trouvée.' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erreur détails partie.' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthUser(req);
    const { id } = await params;
    const cancelledGame = await GameService.cancelGame(
      id,
      auth.userId,
      auth.role === 'ADMIN'
    );

    return NextResponse.json({
      success: true,
      data: cancelledGame,
      message: 'Partie annulée avec succès et mises remboursées.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Impossible d’annuler cette partie.' },
      { status: 400 }
    );
  }
}

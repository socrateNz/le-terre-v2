import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GameService } from '@/services/GameService';
import { AppError, publicErrorMessage } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    getAuthUser(req);
    const { id } = await params;
    const game = await GameService.startGame(id);

    return NextResponse.json({
      success: true,
      data: game,
      message: 'Partie terminée ! Le gagnant a reçu la cagnotte.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: publicErrorMessage(error, 'Impossible de démarrer la partie.') }, { status: 400 });
  }
}

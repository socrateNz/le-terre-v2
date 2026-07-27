import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GameService } from '@/services/GameService';
import { AppError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthUser(req);
    const { id } = await params;
    const { action } = await req.json();

    let resultGame;
    if (action === 'propose') {
      resultGame = await GameService.proposeRematch(id, auth.userId);
    } else if (action === 'accept') {
      resultGame = await GameService.acceptRematch(id, auth.userId);
    } else if (action === 'decline') {
      resultGame = await GameService.declineRematch(id, auth.userId);
    } else {
      throw new AppError('Action invalide.', 400);
    }

    return NextResponse.json({
      success: true,
      data: resultGame,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la gestion de la revanche.' },
      { status: 400 }
    );
  }
}

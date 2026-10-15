import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GameService } from '@/services/GameService';
import { AppError, publicErrorMessage } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthUser(req);
    const { id } = await params;
    const game = await GameService.rollPlayerDice(id, auth.userId);

    return NextResponse.json({
      success: true,
      data: game,
      message: 'Vos dés ont été lancés avec succès !',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: publicErrorMessage(error, 'Erreur lors du lancer de dés.') },
      { status: 400 }
    );
  }
}

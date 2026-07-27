import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GameService } from '@/services/GameService';
import { createGameSchema } from '@/schemas/game';
import { AppError } from '@/lib/errors';

export async function GET() {
  try {
    const games = await GameService.listGames();
    return NextResponse.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erreur récupération des parties.' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const body = await req.json();
    const validated = createGameSchema.parse(body);

    const game = await GameService.createGame({
      userId: auth.userId,
      bet: validated.bet,
      maxPlayers: validated.maxPlayers,
    });

    return NextResponse.json({
      success: true,
      data: game,
      message: 'Partie créée avec succès !',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur création de partie.' }, { status: 400 });
  }
}

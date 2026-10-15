import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GameService } from '@/services/GameService';
import { GameRepository } from '@/repositories/GameRepository';
import { createGameSchema } from '@/schemas/game';
import { AppError, publicErrorMessage } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const minBet = searchParams.get('minBet') ? Number(searchParams.get('minBet')) : undefined;
    const maxBet = searchParams.get('maxBet') ? Number(searchParams.get('maxBet')) : undefined;
    const isPrivate = searchParams.get('isPrivate') !== null ? searchParams.get('isPrivate') === 'true' : undefined;
    const search = searchParams.get('search') || undefined;

    const games = await GameRepository.findAll({
      status,
      minBet,
      maxBet,
      isPrivate,
      search,
    });

    return NextResponse.json({
      success: true,
      data: games,
    });
  } catch {
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
      isPrivate: validated.isPrivate,
      passcode: validated.passcode,
    });

    return NextResponse.json({
      success: true,
      data: game,
      message: 'Partie créée avec succès !',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: publicErrorMessage(error, 'Erreur création de partie.') }, { status: 400 });
  }
}

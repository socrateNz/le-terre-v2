import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { UserRepository } from '@/repositories/UserRepository';
import { GameRepository } from '@/repositories/GameRepository';
import { updateProfileSchema } from '@/schemas/profile';
import { AppError, publicErrorMessage } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const userGames = await GameRepository.findUserGames(auth.userId);

    const totalGames = userGames.length;
    const finishedGames = userGames.filter((g) => g.status === 'FINISHED');
    const wins = finishedGames.filter(
      (g) => (g.winner?._id || g.winner)?.toString() === auth.userId
    ).length;
    const losses = finishedGames.filter(
      (g) => g.winner && (g.winner?._id || g.winner)?.toString() !== auth.userId
    ).length;
    const ties = finishedGames.filter((g) => !g.winner).length;
    const winRate = finishedGames.length > 0 ? Math.round((wins / finishedGames.length) * 100) : 0;

    let netProfit = 0;
    finishedGames.forEach((g) => {
      const isWinner = (g.winner?._id || g.winner)?.toString() === auth.userId;
      if (isWinner) {
        netProfit += g.totalPot - g.bet;
      } else if (g.winner) {
        netProfit -= g.bet;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalGames,
          finishedGamesCount: finishedGames.length,
          wins,
          losses,
          ties,
          winRate,
          netProfit,
        },
        history: userGames,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur chargement de l\'historique profil.' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    const updatedUser = await UserRepository.update(auth.userId, validated);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profil mis à jour avec succès.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: publicErrorMessage(error, 'Erreur mise à jour profil.') }, { status: 400 });
  }
}

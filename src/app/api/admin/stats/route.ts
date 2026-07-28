import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Game } from '@/models/Game';
import { Wallet } from '@/models/Wallet';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (auth.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Accès réservé aux administrateurs.' },
        { status: 403 }
      );
    }

    await connectDB();

    const [
      totalUsers,
      totalGames,
      activeGamesCount,
      finishedGamesCount,
      wallets,
      pendingWithdrawalsCount,
    ] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments(),
      Game.countDocuments({ status: { $in: ['WAITING_FOR_PLAYERS', 'READY', 'ROLLING_DICE'] } }),
      Game.countDocuments({ status: 'FINISHED' }),
      Wallet.find().select('balance'),
      WithdrawRequest.countDocuments({ status: 'pending' }),
    ]);

    const totalCirculatingBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalGames,
        activeGamesCount,
        finishedGamesCount,
        totalCirculatingBalance,
        pendingWithdrawalsCount,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur admin stats.' }, { status: 400 });
  }
}

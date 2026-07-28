import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { UserRepository } from '@/repositories/UserRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { runTransaction } from '@/lib/db';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const users = await UserRepository.findAll(search);

    // Charger les soldes de chaque utilisateur
    const usersWithWallets = await Promise.all(
      users.map(async (u) => {
        const wallet = await WalletRepository.findByUserId(u._id.toString());
        return {
          _id: u._id,
          username: u.username,
          email: u.email,
          role: u.role,
          country: u.country,
          balance: wallet?.balance || 0,
          createdAt: u.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: usersWithWallets,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Erreur liste utilisateurs.' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs.' }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, action, amount, newRole } = body;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'targetUserId requis.' }, { status: 400 });
    }

    if (action === 'CHANGE_ROLE') {
      if (!['USER', 'ADMIN'].includes(newRole)) {
        return NextResponse.json({ success: false, error: 'Rôle invalide.' }, { status: 400 });
      }
      const updated = await UserRepository.update(targetUserId, { role: newRole });
      return NextResponse.json({
        success: true,
        data: updated,
        message: `Rôle de l'utilisateur mis à jour : ${newRole}`,
      });
    }

    if (action === 'ADJUST_BALANCE') {
      if (typeof amount !== 'number' || amount === 0) {
        return NextResponse.json({ success: false, error: 'Montant d\'ajustement invalide.' }, { status: 400 });
      }

      const updatedGame = await runTransaction(async (session) => {
        const wallet = await WalletRepository.findByUserId(targetUserId, session);
        if (!wallet) {
          throw new AppError('Portefeuille introuvable.', 404);
        }

        const balanceBefore = wallet.balance;
        const updatedWallet = await WalletRepository.updateBalance(targetUserId, amount, session);
        if (!updatedWallet) {
          throw new AppError('Impossible d\'ajuster le solde.', 400);
        }

        await LedgerRepository.createEntry(
          {
            wallet: updatedWallet._id,
            user: targetUserId as any,
            type: amount > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(amount),
            balanceBefore,
            balanceAfter: updatedWallet.balance,
            reference: `ADMIN_ADJUST_${Date.now()}`,
            reason: 'TEST_CREDIT',
          },
          session
        );

        return updatedWallet;
      });

      return NextResponse.json({
        success: true,
        data: updatedGame,
        message: `Solde ajusté de ${amount > 0 ? '+' : ''}${amount} CR`,
      });
    }

    return NextResponse.json({ success: false, error: 'Action admin non reconnue.' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur modification utilisateur.' }, { status: 400 });
  }
}

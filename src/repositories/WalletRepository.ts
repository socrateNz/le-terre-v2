import { Wallet, IWalletDocument } from '@/models/Wallet';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class WalletRepository {
  public static async findByUserId(
    userId: string,
    session?: mongoose.ClientSession
  ): Promise<IWalletDocument | null> {
    await connectDB();
    const query = Wallet.findOne({ user: userId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  public static async createWallet(
    userId: string,
    initialBalance = 0,
    session?: mongoose.ClientSession
  ): Promise<IWalletDocument> {
    await connectDB();
    const wallet = new Wallet({
      user: userId,
      balance: initialBalance,
    });
    if (session) {
      return wallet.save({ session });
    }
    return wallet.save();
  }

  public static async updateBalance(
    userId: string,
    amountDelta: number,
    session?: mongoose.ClientSession
  ): Promise<IWalletDocument | null> {
    await connectDB();
    const opts = session ? { session, returnDocument: 'after' as const } : { returnDocument: 'after' as const };

    const filter: Record<string, unknown> = { user: userId };
    if (amountDelta < 0) {
      filter.balance = { $gte: Math.abs(amountDelta) };
    }

    return Wallet.findOneAndUpdate(
      filter,
      { $inc: { balance: amountDelta } },
      opts
    ).exec();
  }
}

import { WalletLedger, IWalletLedgerDocument } from '@/models/WalletLedger';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class LedgerRepository {
  public static async createEntry(
    entryData: Partial<IWalletLedgerDocument>,
    session?: mongoose.ClientSession
  ): Promise<IWalletLedgerDocument> {
    await connectDB();
    const ledger = new WalletLedger(entryData);
    if (session) {
      return ledger.save({ session });
    }
    return ledger.save();
  }

  public static async findByUserId(userId: string, limit = 50): Promise<IWalletLedgerDocument[]> {
    await connectDB();
    return WalletLedger.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

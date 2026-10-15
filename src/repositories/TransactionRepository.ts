import { Transaction, ITransactionDocument } from '@/models/Transaction';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class TransactionRepository {
  public static async create(
    txData: Partial<ITransactionDocument>,
    session?: mongoose.ClientSession
  ): Promise<ITransactionDocument> {
    await connectDB();
    const tx = new Transaction(txData);
    if (session) {
      return tx.save({ session });
    }
    return tx.save();
  }

  public static async findByReference(
    reference: string,
    session?: mongoose.ClientSession
  ): Promise<ITransactionDocument | null> {
    await connectDB();
    const query = Transaction.findOne({ paymentReference: reference });
    if (session) query.session(session);
    return query.exec();
  }

  public static async findByUserId(userId: string, limit = 50): Promise<ITransactionDocument[]> {
    await connectDB();
    return Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  /**
   * Passe atomiquement une transaction de 'pending' à son statut final.
   * Retourne null si elle n'était plus en attente : un seul appelant peut donc la régler.
   */
  public static async claimPending(
    reference: string,
    type: ITransactionDocument['type'],
    status: 'completed' | 'failed',
    session?: mongoose.ClientSession
  ): Promise<ITransactionDocument | null> {
    await connectDB();
    const opts = session ? { session, returnDocument: 'after' as const } : { returnDocument: 'after' as const };
    return Transaction.findOneAndUpdate(
      { paymentReference: reference, type, status: 'pending' },
      { status },
      opts
    ).exec();
  }

  public static async setProviderReference(reference: string, providerReference: string): Promise<void> {
    await connectDB();
    await Transaction.updateOne({ paymentReference: reference }, { providerReference }).exec();
  }

  public static async updateStatus(
    reference: string,
    status: 'completed' | 'failed',
    session?: mongoose.ClientSession
  ): Promise<ITransactionDocument | null> {
    await connectDB();
    const opts = session ? { session, returnDocument: 'after' as const } : { returnDocument: 'after' as const };
    return Transaction.findOneAndUpdate({ paymentReference: reference }, { status }, opts).exec();
  }
}

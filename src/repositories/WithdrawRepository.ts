import { WithdrawRequest, IWithdrawRequestDocument } from '@/models/WithdrawRequest';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class WithdrawRepository {
  public static async create(
    data: Partial<IWithdrawRequestDocument>,
    session?: mongoose.ClientSession
  ): Promise<IWithdrawRequestDocument> {
    await connectDB();
    const req = new WithdrawRequest(data);
    if (session) return req.save({ session });
    return req.save();
  }

  public static async findById(id: string): Promise<IWithdrawRequestDocument | null> {
    await connectDB();
    return WithdrawRequest.findById(id).populate('user', 'username email').exec();
  }

  public static async findAllPending(): Promise<IWithdrawRequestDocument[]> {
    await connectDB();
    return WithdrawRequest.find({ status: 'pending' })
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .exec();
  }

  public static async findByUserId(userId: string): Promise<IWithdrawRequestDocument[]> {
    await connectDB();
    return WithdrawRequest.find({ user: userId }).sort({ createdAt: -1 }).exec();
  }

  public static async updateStatus(
    id: string,
    status: 'approved' | 'rejected',
    comment?: string,
    session?: mongoose.ClientSession
  ): Promise<IWithdrawRequestDocument | null> {
    await connectDB();
    const opts = session ? { session, returnDocument: 'after' as const } : { returnDocument: 'after' as const };
    return WithdrawRequest.findByIdAndUpdate(
      id,
      { status, adminComment: comment, processedAt: new Date() },
      opts
    ).exec();
  }
}

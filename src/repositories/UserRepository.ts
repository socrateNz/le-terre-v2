import { User, IUserDocument } from '@/models/User';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class UserRepository {
  public static async findById(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findById(id).exec();
  }

  public static async findByEmail(email: string, selectPassword = false): Promise<IUserDocument | null> {
    await connectDB();
    const query = User.findOne({ email: email.toLowerCase() });
    if (selectPassword) {
      query.select('+password');
    }
    return query.exec();
  }

  public static async findByUsername(username: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findOne({ username }).exec();
  }

  public static async create(userData: Partial<IUserDocument>, session?: mongoose.ClientSession): Promise<IUserDocument> {
    await connectDB();
    const user = new User(userData);
    if (session) {
      return user.save({ session });
    }
    return user.save();
  }

  public static async update(
    id: string,
    updateData: Partial<IUserDocument>,
    session?: mongoose.ClientSession
  ): Promise<IUserDocument | null> {
    await connectDB();
    const opts = session ? { session, returnDocument: 'after' as const } : { returnDocument: 'after' as const };
    return User.findByIdAndUpdate(id, updateData, opts).exec();
  }
}

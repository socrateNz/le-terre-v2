import { Notification, INotificationDocument } from '@/models/Notification';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class NotificationRepository {
  public static async create(
    data: Partial<INotificationDocument>,
    session?: mongoose.ClientSession
  ): Promise<INotificationDocument> {
    await connectDB();
    const notif = new Notification(data);
    if (session) return notif.save({ session });
    return notif.save();
  }

  public static async findByUserId(userId: string, limit = 20): Promise<INotificationDocument[]> {
    await connectDB();
    return Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  public static async markAllAsRead(userId: string): Promise<void> {
    await connectDB();
    await Notification.updateMany({ user: userId, read: false }, { read: true });
  }
}

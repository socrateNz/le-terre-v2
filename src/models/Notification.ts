import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  read: boolean;
  type: 'GAME' | 'WALLET' | 'SYSTEM';
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['GAME', 'WALLET', 'SYSTEM'],
      default: 'SYSTEM',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', NotificationSchema);

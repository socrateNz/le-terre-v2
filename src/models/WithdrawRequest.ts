import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWithdrawRequestDocument extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  netAmount: number;
  provider: 'NOTCHPAY' | 'STRIPE';
  accountDetails: {
    phone?: string;
    accountNumber?: string;
    bankName?: string;
    name?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  processedAt?: Date;
  createdAt: Date;
}

const WithdrawRequestSchema = new Schema<IWithdrawRequestDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 50,
    },
    fee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    provider: {
      type: String,
      enum: ['NOTCHPAY', 'STRIPE'],
      required: true,
    },
    accountDetails: {
      phone: String,
      accountNumber: String,
      bankName: String,
      name: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminComment: String,
    processedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const WithdrawRequest: Model<IWithdrawRequestDocument> =
  mongoose.models.WithdrawRequest ||
  mongoose.model<IWithdrawRequestDocument>('WithdrawRequest', WithdrawRequestSchema);

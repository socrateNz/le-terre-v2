import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransactionDocument extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  type: 'CREDIT_TEST' | 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'WIN';
  provider: 'CODEES' | 'STRIPE' | 'MANUAL' | 'NOTCHPAY' | 'TEST_CREDIT';
  paymentMethod: 'MOBILE_MONEY' | 'CARD' | 'TEST_CREDIT';
  paymentReference: string;
  providerReference?: string;
  status: 'pending' | 'completed' | 'failed';
  reason: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransactionDocument>(
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
    },
    type: {
      type: String,
      enum: ['CREDIT_TEST', 'DEPOSIT', 'WITHDRAWAL', 'BET', 'WIN'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['CODEES', 'STRIPE', 'MANUAL', 'NOTCHPAY', 'TEST_CREDIT'],
      default: 'TEST_CREDIT',
    },
    paymentMethod: {
      type: String,
      enum: ['MOBILE_MONEY', 'CARD', 'TEST_CREDIT'],
      default: 'TEST_CREDIT',
    },
    paymentReference: {
      type: String,
      required: true,
      index: true,
    },
    providerReference: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Transaction: Model<ITransactionDocument> =
  mongoose.models.Transaction ||
  mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);

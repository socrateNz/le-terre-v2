import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWithdrawRequestDocument extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  netAmount: number;
  provider: 'MANUAL' | 'CODEES' | 'NOTCHPAY' | 'STRIPE';
  // Référence de la Transaction WITHDRAWAL associée (WITH-...)
  reference?: string;
  // Référence du virement Mobile Money effectué manuellement par l'admin
  payoutReference?: string;
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
      enum: ['MANUAL', 'CODEES', 'NOTCHPAY', 'STRIPE'],
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
    reference: {
      type: String,
      index: true,
    },
    payoutReference: String,
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

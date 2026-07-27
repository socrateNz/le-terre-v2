import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWalletLedgerDocument extends Document {
  wallet: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  reason: 'TEST_CREDIT' | 'DEPOSIT' | 'WITHDRAWAL' | 'GAME_BET' | 'GAME_WIN' | 'REFUND';
  game?: mongoose.Types.ObjectId;
  transaction?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WalletLedgerSchema = new Schema<IWalletLedgerDocument>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['TEST_CREDIT', 'DEPOSIT', 'WITHDRAWAL', 'GAME_BET', 'GAME_WIN', 'REFUND'],
      required: true,
    },
    game: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const WalletLedger: Model<IWalletLedgerDocument> =
  mongoose.models.WalletLedger ||
  mongoose.model<IWalletLedgerDocument>('WalletLedger', WalletLedgerSchema);

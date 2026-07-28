import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWalletDocument extends Document {
  user: mongoose.Types.ObjectId;
  balance: number; // Solde Réel (FCFA) retirable
  updatedAt: Date;
}

const WalletSchema = new Schema<IWalletDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Le solde ne peut pas être négatif'],
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet: Model<IWalletDocument> =
  mongoose.models.Wallet || mongoose.model<IWalletDocument>('Wallet', WalletSchema);

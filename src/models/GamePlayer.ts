import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGamePlayerDocument extends Document {
  user: mongoose.Types.ObjectId;
  diceOne: number;
  diceTwo: number;
  total: number;
  joinedAt: Date;
}

export const GamePlayerSchema = new Schema<IGamePlayerDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    diceOne: {
      type: Number,
      default: 0,
    },
    diceTwo: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

delete (mongoose.models as any).GamePlayer;

export const GamePlayer: Model<IGamePlayerDocument> =
  mongoose.models.GamePlayer ||
  mongoose.model<IGamePlayerDocument>('GamePlayer', GamePlayerSchema);

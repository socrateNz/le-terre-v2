import mongoose, { Schema, Document, Model } from 'mongoose';
import { GamePlayerSchema, IGamePlayerDocument } from './GamePlayer';

export type GameStatus =
  | 'CREATED'
  | 'WAITING_FOR_PLAYERS'
  | 'READY'
  | 'ROLLING_DICE'
  | 'PAYOUT'
  | 'FINISHED'
  | 'CANCELLED';

export interface IGameDocument extends Document {
  creator: mongoose.Types.ObjectId;
  maxPlayers: number;
  bet: number;
  status: GameStatus;
  players: IGamePlayerDocument[];
  winner?: mongoose.Types.ObjectId;
  rematchRequestedBy?: mongoose.Types.ObjectId;
  nextGameId?: mongoose.Types.ObjectId;
  totalPot: number;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema<IGameDocument>(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    maxPlayers: {
      type: Number,
      required: true,
      min: 2,
      max: 6,
      default: 2,
    },
    bet: {
      type: Number,
      required: true,
      min: [10, 'La mise minimale est de 10 crédits'],
    },
    status: {
      type: String,
      enum: [
        'CREATED',
        'WAITING_FOR_PLAYERS',
        'READY',
        'ROLLING_DICE',
        'PAYOUT',
        'FINISHED',
        'CANCELLED',
      ],
      default: 'WAITING_FOR_PLAYERS',
      index: true,
    },
    players: [GamePlayerSchema],
    winner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rematchRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    nextGameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
    },
    totalPot: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

delete (mongoose.models as any).Game;

export const Game: Model<IGameDocument> =
  mongoose.models.Game || mongoose.model<IGameDocument>('Game', GameSchema);

import { Game, IGameDocument } from '@/models/Game';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export class GameRepository {
  public static async findById(
    id: string,
    session?: mongoose.ClientSession
  ): Promise<IGameDocument | null> {
    await connectDB();
    const query = Game.findById(id)
      .populate('creator', 'username email avatar')
      .populate('players.user', 'username email avatar')
      .populate('winner', 'username email avatar');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  public static async findAllActive(): Promise<IGameDocument[]> {
    await connectDB();
    return Game.find({
      status: { $in: ['CREATED', 'WAITING_FOR_PLAYERS', 'READY', 'ROLLING_DICE'] },
    })
      .populate('creator', 'username avatar')
      .populate('players.user', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  public static async findUserGames(userId: string): Promise<IGameDocument[]> {
    await connectDB();
    return Game.find({
      'players.user': userId,
    })
      .populate('creator', 'username avatar')
      .populate('players.user', 'username avatar')
      .populate('winner', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  public static async createGame(
    gameData: Partial<IGameDocument>,
    session?: mongoose.ClientSession
  ): Promise<IGameDocument> {
    await connectDB();
    const game = new Game(gameData);
    if (session) {
      return game.save({ session });
    }
    return game.save();
  }

  public static async updateGame(
    id: string,
    updateData: Partial<IGameDocument>,
    session?: mongoose.ClientSession
  ): Promise<IGameDocument | null> {
    await connectDB();
    const opts = session ? { session, returnDocument: 'after' as const } : { returnDocument: 'after' as const };
    return Game.findByIdAndUpdate(id, updateData, opts)
      .populate('creator', 'username email avatar')
      .populate('players.user', 'username email avatar')
      .populate('winner', 'username email avatar')
      .exec();
  }
}

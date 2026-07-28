import { Game, IGameDocument } from '@/models/Game';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export interface GameFilters {
  status?: string;
  minBet?: number;
  maxBet?: number;
  isPrivate?: boolean;
  search?: string;
  maxPlayers?: number;
}

export class GameRepository {
  public static async findById(
    id: string,
    session?: mongoose.ClientSession,
    includePasscode = false
  ): Promise<IGameDocument | null> {
    await connectDB();
    const query = Game.findById(id)
      .populate('creator', 'username email avatar')
      .populate('players.user', 'username email avatar')
      .populate('winner', 'username email avatar');

    if (includePasscode) {
      query.select('+passcode');
    }

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  public static async findAll(filters: GameFilters = {}): Promise<IGameDocument[]> {
    await connectDB();
    const mongoFilter: any = {};

    if (filters.status && filters.status !== 'ALL') {
      mongoFilter.status = filters.status;
    } else if (!filters.status) {
      mongoFilter.status = { $in: ['CREATED', 'WAITING_FOR_PLAYERS', 'READY', 'ROLLING_DICE'] };
    }

    if (filters.minBet !== undefined || filters.maxBet !== undefined) {
      mongoFilter.bet = {};
      if (filters.minBet !== undefined) mongoFilter.bet.$gte = filters.minBet;
      if (filters.maxBet !== undefined) mongoFilter.bet.$lte = filters.maxBet;
    }

    if (filters.isPrivate !== undefined) {
      mongoFilter.isPrivate = filters.isPrivate;
    }

    if (filters.maxPlayers !== undefined) {
      mongoFilter.maxPlayers = filters.maxPlayers;
    }

    const query = Game.find(mongoFilter)
      .populate('creator', 'username avatar')
      .populate('players.user', 'username avatar')
      .sort({ createdAt: -1 });

    const games = await query.exec();

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      return games.filter(
        (g) =>
          g._id.toString().toLowerCase().includes(s) ||
          (g.creator as any)?.username?.toLowerCase().includes(s)
      );
    }

    return games;
  }

  public static async findAllActive(): Promise<IGameDocument[]> {
    return this.findAll();
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

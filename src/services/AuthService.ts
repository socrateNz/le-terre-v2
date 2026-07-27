import { UserRepository } from '@/repositories/UserRepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { LedgerRepository } from '@/repositories/LedgerRepository';
import { runTransaction } from '@/lib/db';
import { signToken, JwtPayload } from '@/lib/jwt';
import { ValidationError, UnauthorizedError, NotFoundError } from '@/lib/errors';
import { WALLET_CONFIG } from '@/config/wallet';
import bcrypt from 'bcryptjs';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  country?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  public static async register(input: RegisterInput) {
    const existingEmail = await UserRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ValidationError('Cette adresse email est déjà utilisée.');
    }

    const existingUsername = await UserRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ValidationError('Ce nom d\'utilisateur est déjà pris.');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Utilisation d'une transaction MongoDB pour créer l'utilisateur et son portefeuille d'accueil
    return runTransaction(async (session) => {
      const newUser = await UserRepository.create(
        {
          username: input.username,
          email: input.email.toLowerCase(),
          password: hashedPassword,
          country: input.country || 'CM',
          role: 'USER',
        },
        session
      );

      const wallet = await WalletRepository.createWallet(
        newUser._id.toString(),
        WALLET_CONFIG.WELCOME_CREDITS,
        session
      );

      await LedgerRepository.createEntry(
        {
          wallet: wallet._id,
          user: newUser._id,
          type: 'CREDIT',
          amount: WALLET_CONFIG.WELCOME_CREDITS,
          balanceBefore: 0,
          balanceAfter: WALLET_CONFIG.WELCOME_CREDITS,
          reference: `WELCOME-${Date.now()}`,
          reason: 'TEST_CREDIT',
        },
        session
      );

      const token = signToken({
        userId: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
      });

      return {
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          email: newUser.email,
          avatar: newUser.avatar,
          country: newUser.country,
          role: newUser.role,
        },
        token,
      };
    });
  }

  public static async login(input: LoginInput) {
    const user = await UserRepository.findByEmail(input.email, true);
    if (!user || !user.password) {
      throw new UnauthorizedError('Identifiants incorrects.');
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Identifiants incorrects.');
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        country: user.country,
        role: user.role,
      },
      token,
    };
  }

  public static async me(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé.');
    }

    const wallet = await WalletRepository.findByUserId(userId);

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      country: user.country,
      role: user.role,
      balance: wallet?.balance || 0,
    };
  }
}

export type UserRole = 'USER' | 'ADMIN';

export interface IUser {
  _id: string;
  id?: string;
  username: string;
  email: string;
  avatar?: string;
  country: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWallet {
  _id: string;
  user: string | IUser;
  balance: number;
  updatedAt: Date;
}

export type LedgerType = 'DEBIT' | 'CREDIT';
export type LedgerReason =
  | 'TEST_CREDIT'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'GAME_BET'
  | 'GAME_WIN'
  | 'REFUND';

export interface IWalletLedger {
  _id: string;
  wallet: string | IWallet;
  user: string | IUser;
  type: LedgerType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  reason: LedgerReason;
  game?: string;
  transaction?: string;
  createdAt: Date;
}

export type GameStatus =
  | 'CREATED'
  | 'WAITING_FOR_PLAYERS'
  | 'READY'
  | 'ROLLING_DICE'
  | 'PAYOUT'
  | 'FINISHED'
  | 'CANCELLED';

export interface IGamePlayer {
  _id?: string;
  user: IUser | string;
  diceOne: number;
  diceTwo: number;
  total: number;
  joinedAt: Date;
}

export interface IGame {
  _id: string;
  creator: IUser | string;
  maxPlayers: number;
  bet: number;
  status: GameStatus;
  players: IGamePlayer[];
  winner?: IUser | string;
  totalPot: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 'CREDIT_TEST' | 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'WIN';
export type PaymentProvider = 'NOTCHPAY' | 'STRIPE' | 'TEST_CREDIT';
export type PaymentMethod = 'MOBILE_MONEY' | 'CARD' | 'TEST_CREDIT';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface ITransaction {
  _id: string;
  user: string | IUser;
  amount: number;
  type: TransactionType;
  provider: PaymentProvider;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  status: TransactionStatus;
  reason: string;
  createdAt: Date;
}

export type WithdrawStatus = 'pending' | 'approved' | 'rejected';

export interface IWithdrawRequest {
  _id: string;
  user: string | IUser;
  amount: number;
  fee: number;
  netAmount: number;
  provider: PaymentProvider;
  accountDetails: {
    phone?: string;
    accountNumber?: string;
    bankName?: string;
    name?: string;
  };
  status: WithdrawStatus;
  adminComment?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface INotification {
  _id: string;
  user: string;
  title: string;
  message: string;
  read: boolean;
  type: 'GAME' | 'WALLET' | 'SYSTEM';
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

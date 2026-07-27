import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }
  return secret;
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

/**
 * Signe un nouveau token JWT avec le payload de l'utilisateur
 */
export function signToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();

  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    secret,
    {
      expiresIn: expiresIn as any,
    }
  );
}

/**
 * Vérifie l'authenticité et la validité d'un token JWT
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Décode un token sans vérifier la signature (utile pour inspection)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

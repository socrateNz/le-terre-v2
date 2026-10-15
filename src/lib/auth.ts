import { NextRequest } from 'next/server';
import { verifyToken, JwtPayload } from './jwt';
import { UnauthorizedError, ForbiddenError } from './errors';
import { UserRepository } from '@/repositories/UserRepository';

export function getAuthUser(req: NextRequest): JwtPayload {
  const tokenFromCookie = req.cookies.get('token')?.value;
  const authHeader = req.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    throw new UnauthorizedError('Session expirée ou absente.');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new UnauthorizedError('Token JWT invalide.');
  }

  return decoded;
}

/**
 * Vérifie le rôle ADMIN en base (et non dans le JWT) : un admin rétrogradé
 * perd immédiatement l'accès, sans attendre l'expiration de son token.
 */
export async function requireAdmin(req: NextRequest): Promise<JwtPayload> {
  const auth = getAuthUser(req);
  const user = await UserRepository.findById(auth.userId);
  if (!user || user.role !== 'ADMIN') {
    throw new ForbiddenError('Accès réservé aux administrateurs.');
  }
  return auth;
}

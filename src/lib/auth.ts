import { NextRequest } from 'next/server';
import { verifyToken, JwtPayload } from './jwt';
import { UnauthorizedError } from './errors';

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

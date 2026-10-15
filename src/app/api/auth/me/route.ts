import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { AuthService } from '@/services/AuthService';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    logger.info('[API] GET /api/auth/me - Authenticating user...');
    const auth = getAuthUser(req);
    const userDetails = await AuthService.me(auth.userId);

    logger.info(`[API] GET /api/auth/me - User authenticated: ${userDetails.username}`);
    return NextResponse.json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    logger.warn(`[API] GET /api/auth/me - Auth failed/error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
  }
}

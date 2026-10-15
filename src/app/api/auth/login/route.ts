import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/AuthService';
import { loginSchema } from '@/schemas/auth';
import { AppError, publicErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const result = await AuthService.login(validatedData);

    const response = NextResponse.json({
      success: true,
      data: result.user,
      message: 'Connexion réussie !',
    });

    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Erreur connexion', error);
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: publicErrorMessage(error, 'Identifiants invalides.') },
      { status: 400 }
    );
  }
}

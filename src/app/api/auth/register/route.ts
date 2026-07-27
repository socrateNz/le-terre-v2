import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/AuthService';
import { registerSchema } from '@/schemas/auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const result = await AuthService.register(validatedData);

    const response = NextResponse.json({
      success: true,
      data: result.user,
      message: 'Compte créé avec succès !',
    });

    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    logger.error('Erreur inscription', error);
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'inscription.' },
      { status: 400 }
    );
  }
}

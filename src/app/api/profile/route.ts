import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { UserRepository } from '@/repositories/UserRepository';
import { updateProfileSchema } from '@/schemas/profile';
import { AppError } from '@/lib/errors';

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    const updatedUser = await UserRepository.update(auth.userId, validated);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profil mis à jour avec succès.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur profil.' }, { status: 400 });
  }
}

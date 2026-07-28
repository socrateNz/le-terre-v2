import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GameService } from '@/services/GameService';
import { AppError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthUser(req);
    const { id } = await params;
    
    let passcode: string | undefined = undefined;
    try {
      const body = await req.json();
      passcode = body?.passcode;
    } catch {
      // Body may be empty if no JSON provided
    }

    const game = await GameService.joinGame(id, auth.userId, passcode);

    return NextResponse.json({
      success: true,
      data: game,
      message: 'Vous avez rejoint la partie avec succès !',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Impossible de rejoindre la partie.' }, { status: 400 });
  }
}

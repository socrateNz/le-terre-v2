import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WalletService } from '@/services/WalletService';
import { depositSchema } from '@/schemas/wallet';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const body = await req.json();
    const validated = depositSchema.parse(body);

    const origin = req.nextUrl.origin;

    const result = await WalletService.deposit({
      userId: auth.userId,
      amount: validated.amount,
      paymentMethod: validated.paymentMethod,
      phone: validated.phone,
      country: validated.country || 'CM',
      email: auth.email,
      baseUrl: origin,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: error.message || 'Erreur dépôt.' }, { status: 400 });
  }
}

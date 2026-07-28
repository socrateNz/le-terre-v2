import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Le mode démo est désactivé. Veuillez recharger votre portefeuille via Mobile Money ou Carte Bancaire.' },
    { status: 400 }
  );
}

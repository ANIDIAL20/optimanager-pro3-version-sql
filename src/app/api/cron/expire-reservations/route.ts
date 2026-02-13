import { NextResponse } from 'next/server';
import { autoExpireFrameReservations } from '@/features/reservations/jobs/auto-expire-reservations';

/**
 * Route API pour déclencher l'expiration automatique des réservations.
 * Configurée pour être appelée par Vercel Cron.
 */
export async function GET(request: Request) {
  // Check authorization header for Vercel Cron safety
  const authHeader = request.headers.get('authorization');
  
  // En environnement de production, on vérifie le CRON_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
  
  try {
    const result = await autoExpireFrameReservations();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

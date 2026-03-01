// SECURED: uses CRON_SECRET (2026-03-01)
import { NextRequest, NextResponse } from 'next/server';
import { refreshSupplierBalances } from '@/lib/utils/refresh-views';

/**
 * Endpoint Cron pour rafraîchir les vues matérialisées
 * Sécurisé par CRON_SECRET dans les variables d'environnement
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (process.env.NODE_ENV === 'production') {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  try {
    await refreshSupplierBalances();
    return NextResponse.json({ 
      success: true, 
      message: 'Views refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

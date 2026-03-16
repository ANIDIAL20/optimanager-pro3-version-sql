import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, any> = {};

  // 1. Check env vars
  checks.env = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING',
    AUTH_SECRET: process.env.AUTH_SECRET ? '✅ SET' : '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. Check DB
  try {
    const { db } = await import('@/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1 as ok`);
    checks.db = '✅ Connected';
  } catch (e: any) {
    checks.db = { error: e.message };
  }

  // 3. Check Auth
  let userId: string | null = null;
  try {
    const { auth } = await import('@/auth');
    const session = await auth();
    userId = session?.user?.id || null;
    checks.auth = { status: '✅', userId };
  } catch (e: any) {
    checks.auth = { error: e.message };
  }

  // 4. Test getShopProfile (parametres page uses this)
  try {
    const { getShopProfile } = await import('@/app/actions/shop-actions');
    const profile = await getShopProfile();
    checks.getShopProfile = { status: '✅', hasProfile: !!profile, profileId: profile?.id };
  } catch (e: any) {
    checks.getShopProfile = { 
      status: '❌ FAILED', 
      error: e.message, 
      stack: e.stack?.split('\n').slice(0, 8)
    };
  }

  // 5. Test getDocumentConfig (parametres page uses this)
  try {
    const { getDocumentConfig } = await import('@/app/actions/shop-actions');
    const config = await getDocumentConfig();
    checks.getDocumentConfig = { status: '✅', hasConfig: !!config };
  } catch (e: any) {
    checks.getDocumentConfig = { 
      status: '❌ FAILED', 
      error: e.message, 
      stack: e.stack?.split('\n').slice(0, 8)
    };
  }

  // 6. Test getClientUsageStats (dashboard page uses this)
  if (userId) {
    try {
      const { getClientUsageStats } = await import('@/app/actions/adminActions');
      const usage = await getClientUsageStats(userId);
      checks.getClientUsageStats = { status: '✅', usage };
    } catch (e: any) {
      checks.getClientUsageStats = { 
        status: '❌ FAILED', 
        error: e.message, 
        stack: e.stack?.split('\n').slice(0, 8)
      };
    }
  }

  // 7. Test requireUser (dashboard page uses this)
  try {
    const { requireUser } = await import('@/lib/auth-helpers');
    const user = await requireUser();
    checks.requireUser = { status: '✅', id: user.id };
  } catch (e: any) {
    checks.requireUser = { 
      status: '❌ FAILED', 
      error: e.message 
    };
  }

  return NextResponse.json(checks, { status: 200 });
}

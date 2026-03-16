import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, any> = {};

  // 1. Check env vars
  checks.env = {
    DATABASE_URL: process.env.DATABASE_URL ? `✅ SET (${process.env.DATABASE_URL.substring(0, 30)}...)` : '❌ MISSING',
    AUTH_SECRET: process.env.AUTH_SECRET ? '✅ SET' : '❌ MISSING',
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || '❌ MISSING',
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? '✅ SET' : '❌ MISSING',
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ? '✅ SET' : '❌ MISSING',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? '✅ SET' : '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL || 'not set',
    VERCEL_URL: process.env.VERCEL_URL || 'not set',
  };

  // 2. Check DB connection
  try {
    const { db } = await import('@/db');
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`SELECT 1 as ok`);
    checks.db = { status: '✅ Connected', result: 'SELECT 1 OK' };
  } catch (e: any) {
    checks.db = { 
      status: '❌ Failed', 
      error: e.message, 
      code: e.code,
      stack: e.stack?.split('\n').slice(0, 5) 
    };
  }

  // 3. Check Auth
  try {
    const { auth } = await import('@/auth');
    const session = await auth();
    checks.auth = { 
      status: '✅ Auth module loaded', 
      hasSession: !!session,
      userId: session?.user?.id || 'none',
    };
  } catch (e: any) {
    checks.auth = { 
      status: '❌ Auth Failed', 
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5) 
    };
  }

  return NextResponse.json(checks, { status: 200 });
}

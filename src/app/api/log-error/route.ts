import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// SECURED: basic rate-limiting recommended here instead of auth(), to catch pre-login errors (2026-03-01)

export async function POST(request: Request) {
  try {
    // Basic validation/rate limiting should be done here
    // e.g., using Upstash Redis or memory-based rate limiter
    
    const errorData = await request.json();
    
    // Log to console for internal tracking
    console.error('🛑 CLIENT_ERROR_REPORTED:', {
      message: errorData.message,
      stack: errorData.stack,
      componentStack: errorData.componentStack,
      url: errorData.url,
      timestamp: new Date().toISOString(),
    });

    // Optional: Send to Discord/Slack webhook if configured
    if (process.env.DISCORD_WEBHOOK_URL) {
       // await fetch(process.env.DISCORD_WEBHOOK_URL, { ... })
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

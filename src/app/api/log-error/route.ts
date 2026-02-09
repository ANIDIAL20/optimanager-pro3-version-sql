import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

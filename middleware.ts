/**
 * Next.js Middleware
 * Protects routes and verifies Firebase authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/api/public',
];

// Routes that require admin access
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Check for session cookie
  const session = request.cookies.get('session');
  
  if (!session) {
    // No session - redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // TODO: Verify the session token with Firebase Admin
  // For now, we trust the session cookie exists
  // The actual verification happens in server actions via auth.ts
  
  // Check admin routes
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    // TODO: Verify admin role from decoded token
    // For now, allow if session exists
  }
  
  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

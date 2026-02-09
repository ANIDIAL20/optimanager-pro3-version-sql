import NextAuth from "next-auth";
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { checkRateLimit } from './lib/ratelimit';

export default auth(async (req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  // ⚡ Optimization: Early return for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|webp)$/)
  ) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isPublicRoute = pathname === '/login' || pathname === '/'; 
  const isAuthRoute = pathname.startsWith('/login');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminApiRoute = pathname.startsWith('/api/admin');

  // 0. RBAC Protection for Admin Pages (with Rate Limiting)
  if (isAdminRoute) {
    // ⚡ Security Enhancement: Rate Limiting
    const identifier = req.auth?.user?.id || req.headers.get('x-forwarded-for') || 'local';
    const rateLimit = await checkRateLimit(`admin_page_access:${identifier}`);
    
    if (!rateLimit.success) {
      console.warn(`[SECURITY AUDIT] 🚨 Rate Limit Exceeded (Page): ${identifier}`);
      return new Response(JSON.stringify({ error: 'Too many requests - Please try again later' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userRole = req.auth?.user?.role;
    if (userRole !== 'ADMIN') {
      const auditDetails = {
        timestamp: new Date().toISOString(),
        userId: req.auth?.user?.id || 'anonymous',
        email: req.auth?.user?.email || 'anonymous',
        role: userRole || 'NONE',
        targetPath: nextUrl.pathname,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || 'local'
      };

      console.error(`[SECURITY AUDIT] 🚫 RBAC Denial (Page)`, JSON.stringify(auditDetails, null, 2));
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
  }

  // 1. RBAC Protection for Admin API Routes (with Rate Limiting)
  if (isAdminApiRoute) {
    // ⚡ Security Enhancement: Rate Limiting
    const identifier = req.auth?.user?.id || req.headers.get('x-forwarded-for') || 'local';
    const rateLimit = await checkRateLimit(`admin_api_access:${identifier}`);
    
    if (!rateLimit.success) {
      console.warn(`[SECURITY AUDIT] 🚨 Rate Limit Exceeded (API): ${identifier}`);
      return new Response(JSON.stringify({ error: 'Too many requests - Please try again later' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userRole = req.auth?.user?.role;
    if (userRole !== 'ADMIN') {
      const auditDetails = {
        timestamp: new Date().toISOString(),
        userId: req.auth?.user?.id || 'anonymous',
        email: req.auth?.user?.email || 'anonymous',
        role: userRole || 'NONE',
        targetPath: nextUrl.pathname,
        method: req.method,
        ip: req.headers.get('x-forwarded-for') || 'local'
      };

      console.error(`[SECURITY AUDIT] 🚫 RBAC Denial (API)`, JSON.stringify(auditDetails, null, 2));
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 1. API Auth routes - do not block
  if (isApiAuthRoute) {
    return null;
  }

  // 2. Auth Routes (Login) - Redirect to dashboard if logged in
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
    return null;
  }

  // 3. Protected Routes (Dashboard, etc.) - Redirect to login if not logged in
  if (!isLoggedIn && !isPublicRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    
    // Default to redirecting to login
    return Response.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  return null;
});

// Configure matcher to exclude static files and images
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

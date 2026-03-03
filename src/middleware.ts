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
  const userRole = req.auth?.user?.role;

  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isPublicRoute = pathname === '/login' || pathname === '/';
  const isAuthRoute = pathname.startsWith('/login');

  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminApiRoute = pathname.startsWith('/api/admin');

  const isSupplierRoute = pathname.startsWith('/supplier');
  const isSupplierApiRoute = pathname.startsWith('/api/supplier');

  const isDashboardRoute = pathname.startsWith('/dashboard');

  // 1. API Auth routes - do not block
  if (isApiAuthRoute) {
    return null;
  }

  // 2. Auth Routes (Login) - Redirect based on role if logged in
  if (isAuthRoute) {
    if (isLoggedIn) {
      if (userRole === 'SUPPLIER') {
        return Response.redirect(new URL('/supplier/dashboard', nextUrl));
      } else if (userRole === 'ADMIN') {
        return Response.redirect(new URL('/admin', nextUrl));
      }
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
    return null;
  }

  // 3. Protected Routes - Redirect to login if not logged in
  if (!isLoggedIn && !isPublicRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return Response.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // 4. RBAC Protection for Admin Routes
  if (isAdminRoute || isAdminApiRoute) {
    // ⚡ Rate Limiting for Admin
    const identifier = req.auth?.user?.id || req.headers.get('x-forwarded-for') || 'local';
    const rateLimit = await checkRateLimit(isAdminApiRoute ? `admin_api_access:${identifier}` : `admin_page_access:${identifier}`);

    if (!rateLimit.success) {
      console.warn(`[SECURITY AUDIT] 🚨 Rate Limit Exceeded (Admin): ${identifier}`);
      return new Response(JSON.stringify({ error: 'Too many requests - Please try again later' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (userRole !== 'ADMIN') {
      const auditDetails = {
        timestamp: new Date().toISOString(),
        userId: req.auth?.user?.id || 'anonymous',
        role: userRole || 'NONE',
        targetPath: nextUrl.pathname,
        ip: req.headers.get('x-forwarded-for') || 'local'
      };
      console.error(`[SECURITY AUDIT] 🚫 Admin RBAC Denial`, JSON.stringify(auditDetails));

      if (isAdminApiRoute) {
        return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), { status: 403 });
      }
      return Response.redirect(new URL(userRole === 'SUPPLIER' ? '/supplier/dashboard' : '/dashboard', nextUrl));
    }
  }

  // 5. RBAC Protection for Supplier Routes
  if (isSupplierRoute || isSupplierApiRoute) {
    if (userRole !== 'SUPPLIER' && userRole !== 'ADMIN') {
      if (isSupplierApiRoute) {
        return new Response(JSON.stringify({ error: 'Forbidden - Supplier access required' }), { status: 403 });
      }
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
  }

  // 6. RBAC Protection for Dashboard Routes (Opposite logic: Block suppliers from Optician dashboard)
  if (isDashboardRoute) {
    if (userRole === 'SUPPLIER') {
      return Response.redirect(new URL('/supplier/dashboard', nextUrl));
    }
  }

  return null;
});

// Configure matcher to exclude static files and images
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/supplier/:path*',
    '/api/supplier/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

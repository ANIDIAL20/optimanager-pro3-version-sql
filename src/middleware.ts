import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/'; // Add other public routes if needed
  const isAuthRoute = nextUrl.pathname.startsWith('/login');
  
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

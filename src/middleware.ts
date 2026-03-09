import NextAuth from "next-auth";
import authConfig from "./auth.config";

// ✅ Simple and Edge-compatible middleware structure
const { auth } = NextAuth(authConfig);

export default auth;

// 🛡️ Optimized matcher to exclude static assets (prevents 500 on manifest.json)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - usually handled by separate protection or skipped by auth
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - robots.txt, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml).*)',
  ],
};

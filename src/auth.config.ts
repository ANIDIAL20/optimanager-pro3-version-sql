import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // Empty here, filled in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user?.id; // Check for actual user ID
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      console.log('🔐 Middleware Auth Check:', {
        path: nextUrl.pathname,
        isLoggedIn,
        userId: auth?.user?.id || 'MISSING',
        userRole: auth?.user?.role || 'MISSING',
      });

      // Protected routes require login
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Will redirect to /login (configured in pages.signIn)
      }
      
      // Logged-in users shouldn't access /login
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      
      return true;
    },
    async jwt({ token, user }) {
      console.log('🎫 JWT Callback:', { hasUser: !!user, userId: user?.id });
      
      if (user) {
        // Store in token.sub (standard NextAuth field)
        token.sub = user.id;
        token.role = user.role;
        
        console.log('✅ JWT Token populated:', { 
          sub: token.sub, 
          role: token.role 
        });
      }
      return token;
    },
    async session({ session, token }) {
      console.log('📋 Session Callback (auth.config):', {
        hasSessionUser: !!session.user,
        tokenSub: token.sub,
        tokenRole: token.role,
      });

      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;

        console.log('✅ Session populated (auth.config):', {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
        });
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

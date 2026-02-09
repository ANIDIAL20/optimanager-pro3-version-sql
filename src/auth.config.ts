import type { NextAuthConfig } from "next-auth";
import { RoleSchema } from "./lib/validations/auth";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // Empty here, filled in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user?.id; // Check for actual user ID
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      console.log('🔐 Middleware Auth Check:', {
        path: nextUrl.pathname,
        isLoggedIn,
        userId: auth?.user?.id || 'MISSING',
        userRole: auth?.user?.role || 'MISSING',
      });

      // 1. Admin Protection (Strict)
      if (isOnAdmin) {
        if (!isLoggedIn) return false; // Redirect to login
        if (auth?.user?.role !== 'ADMIN') {
          console.warn(`⛔ Unauthorized /admin access attempt: User ${auth?.user?.email} with role ${auth?.user?.role}`);
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // 2. Protected routes require login
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Will redirect to /login
      }
      
      // 3. Logged-in users shouldn't access /login
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      
      return true;
    },
    async jwt({ token, user, trigger }) {
      console.log('🎫 JWT Callback:', { hasUser: !!user, userId: user?.id });
      
      if (user) {
        // ✅ Layer 1: Runtime validation of role from DB/User object
        const validatedRole = RoleSchema.safeParse(user.role);
        token.role = validatedRole.success ? validatedRole.data : 'USER';
        token.id = user.id;
      }

      // ✅ Layer 4: Refresh role from DB on session update
      if (trigger === "update" && token.sub) {
        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, token.sub),
          columns: { role: true }
        });
        if (freshUser) {
          const validatedRole = RoleSchema.safeParse(freshUser.role);
          token.role = validatedRole.success ? validatedRole.data : 'USER';
        }
      }

      return token;
    },
    async session({ session, token }) {
      console.log('📋 Session Callback (auth.config):', {
        hasSessionUser: !!session.user,
        tokenSub: token.sub,
        tokenRole: token.role,
      });

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'ADMIN' | 'USER';

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

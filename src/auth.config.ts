import type { NextAuthConfig } from "next-auth";
import { RoleSchema } from "./lib/validations/auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // ✅ Check both .id and .email — email is always populated even on first redirect
      const isLoggedIn = !!(auth?.user?.id || auth?.user?.email);
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        if (!isLoggedIn) return false;
        if (auth?.user?.role !== "ADMIN") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      if (isOnDashboard) return isLoggedIn;
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    // jwt and session should be in auth.ts ONLY
  },
} satisfies NextAuthConfig;

export default authConfig;

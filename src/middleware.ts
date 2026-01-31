import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Exclude /login, /api/auth, static files from middleware
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { authConfig } from "./auth.config";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // IMPORTANT: We use JWT sessions, not database sessions
  // DrizzleAdapter is commented out because it forces database sessions
  // which conflicts with our JWT strategy in authConfig
  // adapter: DrizzleAdapter(db, {
  //   usersTable: users,
  //   accountsTable: accounts,
  //   sessionsTable: sessions,
  //   verificationTokensTable: verificationTokens,
  // }),
  session: {
    strategy: "jwt", // Explicitly enforce JWT sessions
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 AUTHORIZE FUNCTION CALLED');
        console.log('📥 Credentials received:', {
          hasEmail: !!credentials?.email,
          hasPassword: !!credentials?.password,
          email: credentials?.email,
          passwordLength: credentials?.password?.length,
        });

        // Validation check
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ AUTHORIZE FAILED: Missing credentials');
          return null;
        }

        try {
          console.log('🔍 Querying database for user:', credentials.email);
          
          // Find user by email
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          console.log('📊 Database query result:', {
            userFound: !!user,
            hasPassword: !!user?.password,
            userId: user?.id,
            userEmail: user?.email,
            userRole: user?.role,
          });

          if (!user) {
            console.log('❌ AUTHORIZE FAILED: User not found in database');
            return null;
          }

          if (!user.password) {
            console.log('❌ AUTHORIZE FAILED: User exists but has no password (OAuth user?)');
            return null;
          }

          console.log('🔒 Verifying password with bcrypt...');
          console.log('Password hash preview:', user.password.substring(0, 20) + '...');

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          console.log('🔓 Password verification result:', isValidPassword);

          if (!isValidPassword) {
            console.log('❌ AUTHORIZE FAILED: Invalid password');
            return null;
          }

          console.log('✅ AUTHORIZE SUCCESS! Returning user:', {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "user",
          };
        } catch (error) {
          console.error('💥 AUTHORIZE ERROR:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
          });
          return null;
        }
      },
    }),
  ],
  debug: true, // 🔍 Enable extensive debugging
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // console.log("🎫 JWT Callback Triggered", { email: token.email, sub: token.sub });

      // 1. Initial Sign In (Google or Credentials)
      if (user) {
        token.id = user.id; // Initial, might be Google ID or DB ID
        token.email = user.email;
      }

      // 2. On every JWT check (navigation), sync with DB to get real Role and ID
      if (token.email) {
        try {
          // Use query builder for safer execution
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, token.email as string),
            columns: {
              id: true,
              role: true,
              isActive: true,
            }
          });

          if (dbUser) {
            token.sub = dbUser.id; // Use DB ID as the subject
            token.role = dbUser.role; // Sync Role (ADMIN/USER)
            token.isActive = dbUser.isActive;
            // console.log("✅ JWT Synced with DB:", { id: dbUser.id, role: dbUser.role });
          } else {
             console.log("⚠️ User not found in DB during JWT sync:", token.email);
          }
        } catch (error: any) {
          console.error(`❌ Failed to sync user in JWT: ${error.message}`);
          // Fallback: don't crash, just use existing token data
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      console.log("📋 Session Callback Triggered", { sub: token.sub, role: token.role });
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.email = token.email as string;
        session.user.role = token.role as string; // Will now be 'ADMIN' from DB
      }
      return session;
    },
  },
});

console.log("🔒 Auth Configuration Loaded");
console.log("- AUTH_SECRET Present:", !!process.env.AUTH_SECRET);
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- GOOGLE CLIENT ID Present:", !!(process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID));

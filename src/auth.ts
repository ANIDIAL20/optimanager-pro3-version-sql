import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { authConfig } from "./auth.config";
import { users } from "@/db/schema/auth-core";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { RoleSchema } from "./lib/validations/auth";

// ✅ JWT Strategy: No DrizzleAdapter needed.
// DrizzleAdapter is for database sessions only.
// Our db is a Proxy object — DrizzleAdapter is incompatible with it.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
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
        console.log('🔐 AUTHORIZE START');
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        try {
          // 1. Find user
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            console.log('❌ User not found:', email);
            return null;
          }

          // 2. Check Active Status
          if (!user.isActive) {
             console.warn(`⛔ User ${email} is inactive/suspended.`);
             throw new Error("Compte désactivé. Contactez l'administrateur.");
          }

          // 3. Check Lockout
          if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
             console.warn(`🔒 User ${email} is locked out until ${user.lockoutUntil}`);
             throw new Error("Compte temporairement bloqué (trop de tentatives). Réessayez plus tard.");
          }

          // 4. Verify password
          if (!user.password) {
             console.warn(`⚠️ User ${email} has no password set.`);
             return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            console.log(`❌ Invalid password for ${email}`);
            
            // Increment failed attempts
            const newFailCount = (user.failedLoginAttempts || 0) + 1;
            let updateData: any = { failedLoginAttempts: newFailCount };
            
            // Lock if threshold reached (e.g., 5 attempts)
            if (newFailCount >= 5) {
                const lockoutTime = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
                updateData.lockoutUntil = lockoutTime;
                console.warn(`🔒 Locking user ${email} due to ${newFailCount} failed attempts.`);
            }

            await db.update(users).set(updateData).where(eq(users.id, user.id));
            
            return null;
          }

          // 5. Success - Reset failures & Return user
          if ((user.failedLoginAttempts || 0) > 0 || user.lockoutUntil) {
              await db.update(users).set({
                  failedLoginAttempts: 0,
                  lockoutUntil: null,
                  lastLoginAt: new Date(),
              }).where(eq(users.id, user.id));
          } else {
              // Just update last login time casually
               await db.update(users).set({
                  lastLoginAt: new Date(),
              }).where(eq(users.id, user.id));
          }

          console.log('✅ AUTHORIZE SUCCESS:', email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "user",
            image: user.image,
          };

        } catch (error: any) {
          console.error('💥 AUTHORIZE ERROR:', error.message);
          throw error; // Re-throw to show specific error to client if possible
        }
      },
    }),
  ],
  debug: true,
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 1. On first sign-in, persist user info in the token
      if (user) {
        token.sub = user.id; // Use token.sub as the canonical user ID
        token.email = user.email;
      }

      // 2. Sync with DB on signIn, signUp, or when role is missing
      if (token.email && (trigger === "signIn" || trigger === "signUp" || !token.role)) {
        try {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, token.email as string),
            columns: { id: true, role: true },
          });
          if (dbUser) {
            token.sub = dbUser.id; // Always use DB id as the canonical sub
            const validatedRole = RoleSchema.safeParse(dbUser.role);
            token.role = validatedRole.success ? validatedRole.data : "USER";
          }
        } catch (e) {
          console.error("[JWT] DB sync failed:", e);
        }
      }

      // 3. On forced update (e.g. role change), refresh from DB
      if (trigger === "update" && token.sub) {
        try {
          const freshUser = await db.query.users.findFirst({
            where: eq(users.id, token.sub),
            columns: { role: true },
          });
          if (freshUser) {
            const validatedRole = RoleSchema.safeParse(freshUser.role);
            token.role = validatedRole.success ? validatedRole.data : "USER";
          }
        } catch (e) {
          console.error("[JWT] Role refresh failed:", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Use token.sub as the canonical user ID (always set from DB)
      if (token && session.user) {
        session.user.id = token.sub as string;   // ✅ token.sub is always set
        session.user.email = token.email as string;
        session.user.role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
  },
});

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { authConfig } from "./auth.config";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { RoleSchema } from "./lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/login",
    error: "/login",
  },
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
      if (user) {
        const validatedRole = RoleSchema.safeParse(user.role);
        token.role = validatedRole.success ? validatedRole.data : "USER";
        token.id = user.id;
      }
      if (token.email && (trigger === "signIn" || !token.role)) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, token.email as string),
        });
        if (dbUser) {
          token.sub = dbUser.id;
          const validatedRole = RoleSchema.safeParse(dbUser.role);
          token.role = validatedRole.success ? validatedRole.data : "USER";
        }
      }
      if (trigger === "update" && token.sub) {
        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, token.sub),
          columns: { role: true },
        });
        if (freshUser) {
          const validatedRole = RoleSchema.safeParse(freshUser.role);
          token.role = validatedRole.success ? validatedRole.data : "USER";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
  },
});

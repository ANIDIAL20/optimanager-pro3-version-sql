import { auth } from "@/auth";
import { db } from "@/db";
import { users, auditLogs, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "crypto";

// ============================================
// HELPER: Generate Session Fingerprint
// ============================================
// NOTE: IP removed to prevent logout on network switch (4G <-> WiFi)
function generateFingerprint(userAgent: string | null): string {
  const data = `${userAgent || "unknown"}`;
  return createHash("sha256").update(data).digest("hex");
}

// ============================================
// HELPER: Log Security Event
// ============================================
async function logSecurityEvent(
  userId: string | null,
  action: string,
  success: boolean,
  resource?: string,
  severity: "INFO" | "WARNING" | "CRITICAL" = "INFO",
  metadata?: Record<string, any>
) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  const fingerprint = generateFingerprint(userAgent);

  try {
    await db.insert(auditLogs).values({
      userId: userId || "anonymous",
      action,
      resource,
      success,
      ipAddress: ip,
      userAgent,
      fingerprint,
      severity,
      metadata: metadata ? JSON.stringify(metadata) : null,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("❌ Failed to log event:", error);
  }
}

// ============================================
// MAIN: Require Admin Guard
// ============================================
export async function requireAdmin() {
  const session = await auth();
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const currentFingerprint = generateFingerprint(userAgent);

  // 1. Authentication Check
  if (!session?.user?.email) {
    await logSecurityEvent(null, "ADMIN_ACCESS_DENIED", false, "/admin", "INFO", { reason: "Not authenticated" });
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  // 2. Real-time DB Check
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!user) {
    redirect("/api/auth/signin");
  }

  // 3. Account Lockout Check (DB Native)
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000 / 60);
    redirect(`/account-locked?minutes=${remainingMinutes}`);
  }

  // 4. Role Validation & Brute Force Protection
  if (user.role !== "ADMIN") {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= 5;

    await db.update(users)
      .set({
        failedLoginAttempts: newAttempts,
        lockoutUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : user.lockoutUntil, // Lock for 15 mins
      })
      .where(eq(users.id, user.id));

    await logSecurityEvent(
      user.id.toString(),
      "ADMIN_ACCESS_DENIED",
      false,
      "/admin",
      shouldLock ? "CRITICAL" : "WARNING",
      { reason: "Insufficient permissions", userRole: user.role, failedAttempts: newAttempts }
    );

    if (shouldLock) redirect("/account-locked?minutes=15");
    redirect("/dashboard?error=unauthorized");
  }

  // 5. Session Fingerprint Validation (Anti-Hijacking)
  // We check existing session if available in DB
  const storedSession = await db.query.sessions.findFirst({
    where: eq(sessions.userId, user.id.toString()),
  });

  if (storedSession && storedSession.fingerprint !== currentFingerprint) {
    // Only flag critical if User-Agent changed drastically
    await logSecurityEvent(
      user.id.toString(),
      "SESSION_MISMATCH",
      false,
      "/admin",
      "WARNING",
      { expected: storedSession.fingerprint, actual: currentFingerprint }
    );
    // Optional: redirect("/api/auth/signin?error=session_changed");
  }

  // ✅ Success: Reset counters
  await db.update(users)
    .set({ failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return { session, user };
}

// ============================================
// OPTIONAL: Permission-Based Guard
// ============================================
export async function requirePermission(permission: string) {
  const { user } = await requireAdmin();

  // Define role permissions
  const rolePermissions: Record<string, string[]> = {
    ADMIN: ["*"], // All permissions
    MANAGER: ["read:users", "write:users", "read:reports"],
    USER: ["read:own"],
  };

  const userPermissions = rolePermissions[user.role] || [];

  if (!userPermissions.includes("*") && !userPermissions.includes(permission)) {
    await logSecurityEvent(
      user.id.toString(),
      "PERMISSION_DENIED",
      false,
      permission,
      "WARNING",
      { 
        requiredPermission: permission,
        userRole: user.role 
      }
    );
    throw new Error(`Permission denied: ${permission}`);
  }

  return { user };
}

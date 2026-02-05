import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Lock } from "lucide-react";

export async function AdminNavLink() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  // Check user role from database
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { role: true },
  });

  // Only show to admins
  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <Link 
      href="/dashboard/admin"
      className="flex items-center gap-2 px-2 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors text-sm font-medium"
    >
      <Lock className="h-4 w-4" />
      <span>Admin Panel</span>
    </Link>
  );
}

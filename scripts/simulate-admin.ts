import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { users, shopProfiles, auditLogs } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function simulateDashboard() {
  try {
    console.log("1. Fetching users...");
    const allUsers = await db.select().from(users).where(eq(users.role, 'USER'));
    console.log(`- Success: ${allUsers.length} users found.`);
    if (allUsers.length > 0) {
        console.log("- First user max_products:", allUsers[0].maxProducts);
    }

    console.log("2. Fetching shop profiles...");
    const allShops = await db.select().from(shopProfiles);
    console.log(`- Success: ${allShops.length} shops found.`);

    console.log("3. Fetching audit logs...");
    const recentLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(5);
    console.log(`- Success: ${recentLogs.length} logs found.`);

    console.log("ALL QUERIES SUCCESSFUL.");
  } catch (err: any) {
    console.error("SIMULATION FAILED 💥");
    console.error(err);
  }
}

simulateDashboard();

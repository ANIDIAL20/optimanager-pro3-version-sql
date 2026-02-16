import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    
    console.log("1. Testing raw SQL SELECT id...");
    try {
        const res = await db.execute(sql`SELECT id FROM users LIMIT 1`);
        console.log("✅ Raw SQL Success:", res.rows[0]);
    } catch (e: any) {
        console.error("❌ Raw SQL Failed:", e.message);
    }

    console.log("\n2. Testing Drizzle Query Builder SELECT id...");
    try {
        const { users } = await import('../src/db/schema');
        const res = await db.select({ id: users.id }).from(users).limit(1);
        console.log("✅ Query Builder Success:", res[0]);
    } catch (e: any) {
        console.error("❌ Query Builder Failed:", e.message);
    }

  } catch (error: any) {
    console.error("❌ Fatal:", error.message);
  } finally {
    process.exit();
  }
}

main();

import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    const { users } = await import('../src/db/schema');
    
    console.log("🔍 Diagnosing Drizzle ORM Query...");
    
    // 1. Try selecting a KNOWN good column
    try {
        console.log("1. Selecting just 'email'...");
        const res1 = await db.select({ email: users.email }).from(users).limit(1);
        console.log("✅ Success:", res1);
    } catch (e: any) {
        console.error("❌ Failed 'email':", e.message);
    }

    // 2. Try selecting a NEW column
    try {
        console.log("2. Selecting 'lockoutUntil'...");
        const res2 = await db.select({ val: users.lockoutUntil }).from(users).limit(1);
        console.log("✅ Success:", res2);
    } catch (e: any) {
        console.error("❌ Failed 'lockoutUntil':", e.message);
    }

    // 3. Try selecting ALL columns via Query Builder (Relational)
    try {
        console.log("3. Testing db.query.users.findFirst...");
        // Use a dummy email that effectively searches for nothing, just testing query generation execution
        const res3 = await db.query.users.findFirst({
            where: eq(users.email, "test@example.com")
        });
        console.log("✅ Success (Relational):", res3); // Might be undefined, that's fine
    } catch (e: any) {
        console.error("❌ Failed (Relational):");
        console.error(e); // printing full error
    }

  } catch (error: any) {
    console.error("❌ Fatal:", error.message);
  } finally {
    process.exit();
  }
}

main();

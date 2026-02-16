import * as dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    const { users } = await import('../src/db/schema');
    
    const emailLower = "ousayehamine3002@gmail.com";
    const emailUpper = "Ousayehamine3002@gmail.com";

    console.log(`1. Querying lower: ${emailLower}`);
    const u1 = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
    console.log(u1 ? "✅ Found" : "❌ Not Found");

    console.log(`2. Querying upper: ${emailUpper}`);
    const u2 = await db.query.users.findFirst({ where: eq(users.email, emailUpper) });
    console.log(u2 ? "✅ Found" : "❌ Not Found");

    // Check if we need ILIKE or lower()
    if (!u2 && u1) {
        console.log("⚠️ DB verify: Email lookup is CASE SENSITIVE.");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit();
  }
}

main();

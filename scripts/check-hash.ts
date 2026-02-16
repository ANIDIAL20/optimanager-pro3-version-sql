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
    
    // Replace with the email you are testing
    const email = "ousayehamine3002@gmail.com"; 

    console.log(`🔍 Checking user: ${email}`);

    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }

    console.log(`✅ User found (ID: ${user.id})`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Password Hash Prefix: ${user.password?.substring(0, 7)}...`);
    
    if (!user.password?.startsWith('$2')) {
        console.warn("⚠️ WARNING: Password hash does NOT start with standard bcrypt prefix ($2a$, $2b$, $2y$). Use reset script!");
    } else {
        console.log("✅ Password hash looks valid (bcrypt format).");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit();
  }
}

main();

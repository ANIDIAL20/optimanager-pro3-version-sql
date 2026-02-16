import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcryptjs';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    const { users } = await import('../src/db/schema');
    
    // Replace with the email you are testing
    const email = "ousayehamine3002@gmail.com"; 
    // Replace with the password you THIlNK is correct
    const password = "password123"; // You might not know this, but we can check the user state first.

    console.log(`🔍 Checking user: ${email}`);

    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (!user) {
        console.error("❌ User not found in database!");
        return;
    }

    console.log("✅ User found:");
    console.log(`- ID: ${user.id}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Status (isActive): ${user.isActive}`);
    console.log(`- Failed Attempts: ${user.failedLoginAttempts}`);
    console.log(`- Lockout Until: ${user.lockoutUntil}`);
    console.log(`- Password Hash Length: ${user.password?.length}`);

    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
        console.error("⛔ Account is TEMPORARILY LOCKED until " + user.lockoutUntil);
    }

    if (!user.isActive) {
        console.error("⛔ Account is DISABLED/SUSPENDED.");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit();
  }
}

main();

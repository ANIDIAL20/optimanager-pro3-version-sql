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
    
    // Replace with the email you want to reset
    const email = "ousayehamine3002@gmail.com"; 
    const newPassword = "123456"; // Standard simple password for testing

    console.log(`🔐 Resetting password for: ${email}`);
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔑 New Hash generated: ${hashedPassword.substring(0, 10)}...`);

    // Update DB
    await db.update(users)
        .set({ 
            password: hashedPassword,
            failedLoginAttempts: 0,
            lockoutUntil: null,
            updatedAt: new Date()
        })
        .where(eq(users.email, email));

    console.log("✅ Password has been reset successfully.");
    console.log(`👉 Please try logging in with: ${newPassword}`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit();
  }
}

main();

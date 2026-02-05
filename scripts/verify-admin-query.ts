import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function verifyQuery() {
  try {
    console.log("Attempting to select users with role 'USER'...");
    // Exact query from dashboard/admin/page.tsx
    const allUsers = await db.select().from(users).where(eq(users.role, 'USER'));
    console.log(`Success! Found ${allUsers.length} users.`);
    console.log("Sample user:", allUsers[0]);
  } catch (err: any) {
    console.error("Query Failed!");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    if (err.code) console.error("Error Code:", err.code);
    if (err.detail) console.error("Error Detail:", err.detail);
  }
}

verifyQuery();

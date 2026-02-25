import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL not found in .env.local");
    process.exit(1);
}

const { db } = require('../src/db');
const { clients } = require('../src/db/schema');
const { eq, and, desc } = require('drizzle-orm');

async function reproduceError() {
  const userId = "d7daf565-32ff-482d-b798-63120fd75e66";
  try {
    console.log("🔍 Attempting to query clients for userId:", userId);
    
    // Using the same query pattern as findByUserId
    const results = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.userId, userId),
        eq(clients.isActive, true)
      ))
      .orderBy(desc(clients.createdAt));
      
    console.log("✅ Success! Found", results.length, "clients.");
  } catch (err: any) {
    console.error("❌ Reproduction failed!");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Detail:", err.detail);
    console.error("Hint:", err.hint);
    console.error("Stack:", err.stack);
  }
}

reproduceError();

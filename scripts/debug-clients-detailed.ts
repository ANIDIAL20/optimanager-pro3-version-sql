import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL not found in .env.local");
    process.exit(1);
}

const { db } = require('../src/db');
const { clients } = require('../src/db/schema');
const { eq, and, desc, sql } = require('drizzle-orm');

async function debugDetailedError() {
  const userId = "d7daf565-32ff-482d-b798-63120fd75e66";
  try {
    console.log("🔍 Executing raw query to see exact error...");
    
    // Exact same query as in the error message
    const sqlQuery = sql`
      select "id", "firebase_id", "user_id", "full_name", "prenom", "nom", "email", "phone", "phone_2", "address", "city", "gender", "cin", "date_of_birth", "mutuelle", "notes", "balance", "credit_limit", "total_spent", "is_active", "last_visit", "created_at", "updated_at" 
      from "clients" 
      where ("clients"."user_id" = ${userId} and "clients"."is_active" = ${true}) 
      order by "clients"."created_at" desc
    `;
    
    const result = await db.execute(sqlQuery);
    console.log("✅ Raw query succeeded! Rows:", result.rows.length);

    console.log("🔍 Executing Drizzle query...");
    const drizzleResult = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.userId, userId),
        eq(clients.isActive, true)
      ))
      .orderBy(desc(clients.createdAt));
      
    console.log("✅ Drizzle query succeeded! Rows:", drizzleResult.length);
    
  } catch (err: any) {
    console.error("❌ ERROR DETECTED:");
    console.error("Name:", err.name);
    console.error("Message:", err.message);
    console.error("Code:", err.code); // Postgres Error Code
    console.error("Detail:", err.detail);
    console.error("Hint:", err.hint);
    console.error("Where:", err.where);
    console.error("Internal Query:", err.internalQuery);
    console.error("Stack:", err.stack);
  }
}

debugDetailedError();

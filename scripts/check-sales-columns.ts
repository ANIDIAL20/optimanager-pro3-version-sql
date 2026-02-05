
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function checkColumns() {
  console.log("Checking columns for 'sales' table...");
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sales'
    `);
    
    // Sort and print clearly
    const columns = result.rows.map((r: any) => r.column_name).sort();
    console.log("Columns explicitly found in DB:", JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error("Error checking columns:", error);
  }
  process.exit(0);
}

checkColumns();

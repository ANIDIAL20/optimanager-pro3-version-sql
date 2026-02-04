
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shop_profiles';
    `);
    
    // Sort and print simple list
    const columns = result.rows.map(r => r.column_name).sort();
    console.log("Columns:", JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error("Error checking columns:", error);
  } finally {
    process.exit(0);
  }
}

main();

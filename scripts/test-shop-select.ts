
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    // Try raw selection
    const result = await db.execute(sql`
      SELECT * FROM "shop_profiles" LIMIT 1;
    `);
    console.log("Raw SQL Success:", result.rows);
  } catch (error) {
    console.error("Raw SQL Error:", error);
  } finally {
    process.exit(0);
  }
}

main();

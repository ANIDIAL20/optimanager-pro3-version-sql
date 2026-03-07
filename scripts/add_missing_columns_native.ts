import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function addMissingColumns() {
  console.log("🔄 Adding missing columns to suppliers table...");
  
  try {
    await db.execute(sql`
      ALTER TABLE suppliers 
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
    `);

    console.log("\n✅ SUCCESS: Columns added to suppliers table.");
  } catch (error) {
    console.error("\n❌ Database Error:", error);
    process.exit(1);
  }
}

addMissingColumns()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

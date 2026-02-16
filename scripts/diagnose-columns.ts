import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    
    console.log("Checking columns for table 'users':");
    
    // Get all columns from information_schema
    const columnsResult = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
    `);
    
    const existingColumns = new Set(columnsResult.rows.map((row: any) => row.column_name));

    // List of columns defined in schema (based on schema.ts)
    const expectedColumns = [
        "id", "name", "email", "emailVerified", "image", "password", 
        "role", "is_active", "failed_login_attempts", "lockout_until", 
        "max_products", "max_clients", "max_suppliers", 
        "last_payment_date", "next_payment_date", "subscription_expiry", 
        "payment_mode", "billing_cycle", "agreed_price", 
        "training_price", "setup_price", "amount_paid", 
        "installments_count", "next_installment_date", 
        "last_login_at", "created_at", "updated_at"
    ];

    const missingColumns = expectedColumns.filter(col => !existingColumns.has(col));

    if (missingColumns.length > 0) {
        console.error("❌ MISSING COLUMNS DETECTED:");
        missingColumns.forEach(col => console.error(`   - ${col}`));
    } else {
        console.log("✅ All expected columns seem to be present!");
    }

    console.log("\nExisting columns in DB:");
    existingColumns.forEach(col => console.log(`   - ${col}`));

  } catch (error: any) {
    console.error("❌ Error during diagnosis:", error.message);
  } finally {
    process.exit();
  }
}

main();

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("🔥 Dropping problematic tables to fix UUID casting issues...");
  try {
    // Drop in order of dependency
    await db.execute(sql.raw(`DROP TABLE IF EXISTS supplier_order_payments CASCADE`));
    await db.execute(sql.raw(`DROP TABLE IF EXISTS supplier_order_items CASCADE`));
    await db.execute(sql.raw(`DROP TABLE IF EXISTS supplier_orders CASCADE`));
    console.log("✅ Tables dropped. Now run drizzle-kit push.");
  } catch (e: any) {
    console.error("❌ Error dropping tables:", e);
  }
  process.exit(0);
}

run();

import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Running manual migration...');
  try {
    await db.execute(sql`ALTER TABLE supplier_orders_v2 ADD COLUMN IF NOT EXISTS amount_paid numeric(15, 2) DEFAULT '0' NOT NULL`);
    await db.execute(sql`ALTER TABLE supplier_orders_v2 ADD COLUMN IF NOT EXISTS remaining_amount numeric(15, 2) DEFAULT '0' NOT NULL`);
    await db.execute(sql`ALTER TABLE supplier_orders_v2 ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' NOT NULL`);
    console.log('✅ Columns added or already exist.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

main().then(() => process.exit(0));

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  try {
    console.log('--- Migrating supplier_orders ---');
    await db.execute(sql`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS amount_paid numeric(15,2) DEFAULT 0 NOT NULL`);
    await db.execute(sql`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS remaining_amount numeric(15,2) DEFAULT 0 NOT NULL`);
    await db.execute(sql`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' NOT NULL`);
    await db.execute(sql`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone`);

    await db.execute(sql`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'`);
    await db.execute(sql`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'MAD'`);
    
    console.log('✅ Manual migration complete!');
  } catch (e: any) {
    console.error('❌ Migration error:', e.message);
  }
}

run().then(() => process.exit(0));

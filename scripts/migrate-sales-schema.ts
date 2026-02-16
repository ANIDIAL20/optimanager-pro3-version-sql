
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting Sales & Invoices Schema Migration...');
  // Dynamic import to ensure env vars are loaded first
  const { db } = await import('../src/db');

  try {
    // 1. Update SALES table
    console.log('📦 Updating Sales Table...');
    await db.execute(sql`
      ALTER TABLE sales 
        ADD COLUMN IF NOT EXISTS transaction_number TEXT,
        ADD COLUMN IF NOT EXISTS is_declared BOOLEAN DEFAULT FALSE;
        
      -- Ensure indexes
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_unique_transaction ON sales(user_id, transaction_number);
    `);

    // 2. Update SALE_ITEMS table
    console.log('📦 Updating Sale Items Table...');
    await db.execute(sql`
      ALTER TABLE sale_items 
        ADD COLUMN IF NOT EXISTS product_type TEXT,
        ADD COLUMN IF NOT EXISTS category TEXT,
        ADD COLUMN IF NOT EXISTS unit_price_ht DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS unit_price_tva DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS unit_price_ttc DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tva_rate DECIMAL(5,2) DEFAULT 20.00,
        ADD COLUMN IF NOT EXISTS line_total_ht DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS line_total_tva DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS line_total_ttc DECIMAL(10,2) DEFAULT 0;
    `);

    // 3. Ensure SALE_LENS_DETAILS table exists (it should via Drizzle, but adding safeguard if migrating from raw SQL)
    // We assume the table creation is handled by core migration or it exists. 
    // If we wanted to be safe we could create it if not exists, but for now we trust the schema matches previous state or will be created.
    // However, user said "Create/Update". If this is a new feature for some users, table might be missing.
    // Let's create it if missing to be robust.
    console.log('📦 Ensuring Lens Details Table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sale_lens_details (
        id SERIAL PRIMARY KEY,
        sale_item_id INTEGER NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
        eye TEXT NOT NULL,
        sphere TEXT,
        cylinder TEXT,
        axis TEXT,
        addition TEXT,
        index TEXT,
        diameter TEXT,
        material TEXT,
        treatment TEXT,
        lens_type TEXT,
        base_curve TEXT,
        prism TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS sale_lens_details_item_id_idx ON sale_lens_details(sale_item_id);
    `);

    console.log('✅ Sales Schema Migration Completed Successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

main();

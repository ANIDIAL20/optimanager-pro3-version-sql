
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Creating table supplier_credit_allocations...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "supplier_credit_allocations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL,
        "credit_id" uuid NOT NULL REFERENCES "supplier_credits"("id") ON DELETE CASCADE,
        "order_id" uuid NOT NULL REFERENCES "supplier_orders"("id") ON DELETE CASCADE,
        "amount" numeric(15, 2) NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);
    
    console.log('Creating index for supplier_credit_allocations...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_supplier_credit_allocations_order" ON "supplier_credit_allocations" ("order_id");
    `);

    console.log('Success!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

main();

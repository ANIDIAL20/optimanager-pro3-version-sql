
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function truncateSupplierOrders() {
  console.log('🧹 Truncating supplier_orders table...');
  try {
    await db.execute(sql`TRUNCATE TABLE supplier_orders CASCADE;`);
    console.log('✅ Supplier Orders table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating supplier_orders table:', error);
  } finally {
    process.exit();
  }
}

truncateSupplierOrders();

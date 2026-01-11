
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { stockMovements } from '../src/db/schema';

dotenv.config({ path: '.env.local' });

async function truncateStockMovements() {
  console.log('🧹 Truncating stock_movements table...');
  try {
    await db.execute(sql`TRUNCATE TABLE stock_movements CASCADE;`);
    console.log('✅ Stock Movements table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating stock_movements table:', error);
  } finally {
    process.exit();
  }
}

truncateStockMovements();

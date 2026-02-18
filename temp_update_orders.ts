import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Updating existing orders...');
  try {
    await db.execute(sql`UPDATE supplier_orders_v2 SET remaining_amount = total_amount WHERE remaining_amount = 0`);
    console.log('✅ Updated existing orders.');
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

main().then(() => process.exit(0));

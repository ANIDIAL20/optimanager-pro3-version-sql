
import { db } from '../src/db';
import { supplierOrders } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function countSupplierOrders() {
  console.log('🔍 Checking Supplier Orders...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing!');
    process.exit(1);
  }

  try {
    const result = await db.select({ count: count() }).from(supplierOrders);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL SUPPLIER ORDERS: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error counting supplier orders:', error);
  } finally {
    process.exit();
  }
}

countSupplierOrders();

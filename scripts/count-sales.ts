
import { db } from '../src/db';
import { sales } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function countSales() {
  console.log('🔍 Checking Sales...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing!');
    process.exit(1);
  }

  try {
    const result = await db.select({ count: count() }).from(sales);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL SALES: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error counting sales:', error);
  } finally {
    process.exit();
  }
}

countSales();

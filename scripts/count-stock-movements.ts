
import { db } from '../src/db';
import { stockMovements } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function countStockMovements() {
  console.log('🔍 Checking Stock Movements...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing!');
    process.exit(1);
  }

  try {
    const result = await db.select({ count: count() }).from(stockMovements);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL STOCK MOVEMENTS: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error counting stock movements:', error);
  } finally {
    process.exit();
  }
}

countStockMovements();

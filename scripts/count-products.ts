
import { db } from '../src/db';
import { products } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function countProducts() {
  console.log('🔍 Checking Produts...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing!');
    process.exit(1);
  }

  try {
    const result = await db.select({ count: count() }).from(products);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL PRODUCTS: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error counting products:', error);
  } finally {
    process.exit();
  }
}

countProducts();

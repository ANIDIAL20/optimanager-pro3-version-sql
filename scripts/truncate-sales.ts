
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sales } from '../src/db/schema';

dotenv.config({ path: '.env.local' });

async function truncateSales() {
  console.log('🧹 Truncating sales table...');
  try {
    await db.execute(sql`TRUNCATE TABLE sales CASCADE;`);
    console.log('✅ Sales table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating sales table:', error);
  } finally {
    process.exit();
  }
}

truncateSales();


import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function truncateProducts() {
  console.log('🧹 Truncating products table...');
  try {
    await db.execute(sql`TRUNCATE TABLE products CASCADE;`);
    console.log('✅ Products table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating products table:', error);
  } finally {
    process.exit();
  }
}

truncateProducts();

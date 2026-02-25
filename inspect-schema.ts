import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    console.log('Checking products table structure...');
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log('Columns in "products":', JSON.stringify(res, null, 2));
    
    console.log('\nChecking all tables:');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', JSON.stringify(tables, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    process.exit();
  }
}

check();

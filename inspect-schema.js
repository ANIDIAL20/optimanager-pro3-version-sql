const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function check() {
  try {
    console.log('Checking products table structure...');
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log('Columns in "products":', JSON.stringify(res.rows || res, null, 2));
    
    console.log('\nChecking all tables:');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', JSON.stringify(tables.rows || tables, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}

check();

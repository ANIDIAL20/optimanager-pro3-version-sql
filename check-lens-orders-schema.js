const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function check() {
  try {
    console.log('Checking lens_orders table structure...');
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lens_orders'
    `);
    const cols = res.rows || res;
    console.log('Columns in "lens_orders":', JSON.stringify(cols, null, 2));
    
    // Check if prescriptions_legacy exists
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'prescriptions_legacy'
    `);
    console.log('Table "prescriptions_legacy" exists:', tables.rows?.length > 0 || tables.length > 0);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}

check();

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function checkSchema() {
  try {
    console.log('--- TABLE: supplier_orders ---');
    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'supplier_orders';
    `);
    console.log('Columns:', cols.rows);
    
    console.log('\n--- SAMPLE DATA ---');
    const data = await db.execute(sql`SELECT * FROM supplier_orders LIMIT 1;`);
    console.log('Sample Row Keys:', data.rows.length > 0 ? Object.keys(data.rows[0]) : 'No data');
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

checkSchema();

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function test() {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sales';
    `);
    console.log('COLUMNS_START');
    console.log(JSON.stringify(result.rows.map((r) => r.column_name)));
    console.log('COLUMNS_END');
    process.exit(0);
  } catch (e) {
    console.error('Error testing DB:', e);
    process.exit(1);
  }
}

test();

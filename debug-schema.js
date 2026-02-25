const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function checkSchema() {
  try {
    const tables = ['products', 'clients', 'suppliers'];
    
    for (const table of tables) {
        console.log(`\n--- TABLE: ${table} ---`);
        const cols = await db.execute(sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = ${table}
          ORDER BY ordinal_position
        `);
        console.log(cols.rows || cols);
    }
    process.exit(0);
  } catch (e) {
    console.error('Error checking schema:', e);
    process.exit(1);
  }
}

checkSchema();

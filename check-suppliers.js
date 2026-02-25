const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function checkSuppliers() {
  try {
    const result = await db.execute(sql`SELECT id, name FROM suppliers LIMIT 5;`);
    console.log('SUPPLIERS:', result.rows);
    process.exit(0);
  } catch (e) {
    console.error('Error checking suppliers:', e);
    process.exit(1);
  }
}

checkSuppliers();

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL not found in .env.local");
    process.exit(1);
}

// Now we can safe-load the DB
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function inspectClientsTable() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    console.log("Columns in 'clients' table:");
    result.rows.forEach(r => {
      console.log(`- ${r.column_name}: ${r.data_type}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

inspectClientsTable();

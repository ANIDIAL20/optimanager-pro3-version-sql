import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL not found in .env.local");
    process.exit(1);
}

const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function checkNulls() {
  try {
    const result = await db.execute(sql`
      SELECT count(*) as total, 
             count(*) FILTER (WHERE created_at IS NULL) as null_created,
             count(*) FILTER (WHERE user_id IS NULL) as null_user
      FROM clients
    `);
    console.log("Null checks:", result.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}

checkNulls();

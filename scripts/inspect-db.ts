import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function listTables() {
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Existing Tables:", result.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error:", err);
  }
}

listTables();

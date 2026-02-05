import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const res = await db.execute(sql`SELECT max_products FROM users LIMIT 1`);
    console.log("Column exists. Rows:", res.rows);
  } catch (err: any) {
    console.error("Column check failed:", err.message);
  }
}

check();

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sales';
    `);
    console.log('COLUMNS_START');
    console.log(JSON.stringify(result.rows.map((r: any) => r.column_name)));
    console.log('COLUMNS_END');
    process.exit(0);
  } catch (e) {
    console.error('Error testing DB:', e);
    process.exit(1);
  }
}

test();

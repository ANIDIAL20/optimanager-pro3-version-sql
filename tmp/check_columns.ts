
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function test() {
  console.log('Checking columns for frame_reservations...');
  try {
    const results = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'frame_reservations'`);
    console.log('Columns:', results.rows);
    
    console.log('Testing a simple select...');
    const selectResult = await db.execute(sql`SELECT * FROM frame_reservations LIMIT 1`);
    console.log('Select Result:', selectResult.rows);

  } catch (error: any) {
    console.error('Failure:', error);
  }
}

test().then(() => process.exit(0));

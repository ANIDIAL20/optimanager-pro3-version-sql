import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function debug() {
  try {
    console.log('--- Database Check ---');
    
    // Check tables
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tables.rows.map((r: any) => r.table_name));

    // Check columns of clients
    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    console.log('Columns of clients:', cols.rows);

    // Try a simple count
    const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
    try {
        const countRes = await db.execute(sql`SELECT count(*) FROM clients WHERE user_id = ${userId}`);
        console.log('Manual count success:', countRes.rows);
    } catch (e: any) {
        console.error('Manual count failed:', e.message);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
      process.exit(0);
  }
}

debug();

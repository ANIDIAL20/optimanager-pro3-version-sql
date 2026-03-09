
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const result = await db.execute(sql`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
    console.log('Tables:', result.rows.map(r => r.tablename));
  } catch (e) {
    console.error('Error:', e);
  }
}

main();

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');
  let output = '';

  const log = (msg: string) => {
    console.log(msg);
    output += msg + '\n';
  };

  try {
    log('\n--- Unique Constraints Details ---');
    const details = await db.execute(sql`
      SELECT 
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indnullsnotdistinct
      FROM 
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE 
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = 'supplier_payments'
    `);
    log(JSON.stringify(details.rows, null, 2));

  } catch (e: any) {
    log(`❌ Script Error: ${e.message}`);
  }

  fs.writeFileSync('debug_output_indices.txt', output);
}

run().then(() => process.exit(0));

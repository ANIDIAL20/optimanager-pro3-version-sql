import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');
  let output = '';

  const log = (msg: string) => {
    output += msg + '\n';
  };

  const tables = ['suppliers', 'supplier_orders', 'supplier_payments'];
  for (const table of tables) {
    log(`--- ${table} ---`);
    const res = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `);
    res.rows.forEach(r => log(r.column_name));
  }

  fs.writeFileSync('table_columns.txt', output);
}

run().then(() => process.exit(0));

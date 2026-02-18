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
    log('\n--- Table Check Constraints ---');
    const constraints = await db.execute(sql`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'supplier_payments'::regclass AND contype = 'c'
    `);
    log(JSON.stringify(constraints.rows, null, 2));

  } catch (e: any) {
    log(`❌ Script Error: ${e.message}`);
  }

  fs.writeFileSync('debug_output_checks.txt', output);
}

run().then(() => process.exit(0));

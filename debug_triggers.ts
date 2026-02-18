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
    log('\n--- Table Triggers ---');
    const triggers = await db.execute(sql`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'supplier_payments'::regclass
    `);
    log(JSON.stringify(triggers.rows, null, 2));

  } catch (e: any) {
    log(`❌ Script Error: ${e.message}`);
  }

  fs.writeFileSync('debug_output_triggers.txt', output);
}

run().then(() => process.exit(0));

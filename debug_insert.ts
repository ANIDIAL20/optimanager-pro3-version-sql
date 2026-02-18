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
    log('--- Attempting Manual Insert to catch PG Error ---');
    try {
      await db.execute(sql`
        INSERT INTO supplier_payments (
          user_id, supplier_id, order_id, supplier_name, amount, date, method, created_by, created_at
        ) VALUES (
          'd7daf565-32ff-482d-b798-63120fd75e66', 
          'd1181135-9c6d-409b-aaf3-3e3f5421cacf'::uuid, 
          3, 
          'Verres Qualite Superieure', 
          100.00, 
          NOW(), 
          'Espèces', 
          'd7daf565-32ff-482d-b798-63120fd75e66', 
          NOW()
        )
      `);
      log('✅ Manual insert succeeded! (Unexpected?)');
    } catch (err: any) {
      log('❌ PG ERROR DETAILS:');
      log(`Message: ${err.message}`);
      log(`Detail: ${err.detail}`);
      log(`Code: ${err.code}`);
      log(`Constraint: ${err.constraint}`);
    }

    log('\n--- Table Constraints ---');
    const constraints = await db.execute(sql`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'supplier_payments'::regclass
    `);
    log(JSON.stringify(constraints.rows, null, 2));

  } catch (e: any) {
    log(`❌ Script Error: ${e.message}`);
  }

  fs.writeFileSync('debug_output.txt', output);
}

run().then(() => process.exit(0));

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  try {
    console.log('--- supplier_order_payments ---');
    const cols = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'supplier_order_payments'`);
    console.log(cols.rows.map((r: any) => `${r.column_name} (${r.data_type})`));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

run().then(() => process.exit(0));

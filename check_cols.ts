import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  try {
    console.log('--- supplier_orders ---');
    const colsOrders = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'supplier_orders'`);
    console.log(colsOrders.rows.map((r: any) => `${r.column_name} (${r.data_type})`));

    console.log('--- supplier_payments ---');
    const colsPayments = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'supplier_payments'`);
    console.log(colsPayments.rows.map((r: any) => `${r.column_name} (${r.data_type})`));

  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

run().then(() => process.exit(0));

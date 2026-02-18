import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  const supplierId = 'd1181135-9c6d-409b-aaf3-3e3f5421cacf';

  try {
    const res = await db.execute(sql`
      SELECT id, amount, date, supplier_id, deleted_at 
      FROM supplier_payments 
      WHERE supplier_id = ${supplierId}::uuid
    `);
    console.log('Payments:', JSON.stringify(res.rows, null, 2));

    const res3 = await db.execute(sql`
      SELECT id, montant_total, amount_paid, remaining_amount, supplier_id
      FROM supplier_orders
      WHERE supplier_id = ${supplierId}::uuid
    `);
    console.log('Orders:', JSON.stringify(res3.rows, null, 2));

  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run().then(() => process.exit(0));

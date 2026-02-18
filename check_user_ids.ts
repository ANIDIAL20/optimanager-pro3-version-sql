import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  const supplierId = 'd1181135-9c6d-409b-aaf3-3e3f5421cacf';

  try {
    const res = await db.execute(sql`
      SELECT user_id, COUNT(*) FROM supplier_payments GROUP BY user_id
    `);
    console.log('User IDs in Payments:', res.rows);

    const res2 = await db.execute(sql`
      SELECT id, user_id FROM users LIMIT 1
    `);
    console.log('Sample User:', res2.rows[0]);

  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run().then(() => process.exit(0));

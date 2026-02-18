import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'supplier_orders'
      ORDER BY ordinal_position LIMIT 10
    `);
    console.table(res.rows);
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run().then(() => process.exit(0));

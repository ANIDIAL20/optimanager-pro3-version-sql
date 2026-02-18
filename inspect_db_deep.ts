import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  try {
    const tables = ['suppliers', 'supplier_orders', 'supplier_payments', 'supplier_order_payments'];
    
    for (const table of tables) {
      const res = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `);
      console.log(`\n--- Table: ${table} ---`);
      res.rows.forEach(r => {
        console.log(`${r.column_name}: ${r.data_type} (${r.is_nullable})`);
      });
    }

  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run().then(() => process.exit(0));

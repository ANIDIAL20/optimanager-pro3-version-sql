import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function run() {
  const tables = ['suppliers', 'supplier_orders', 'supplier_order_items', 'supplier_order_payments', 'supplier_payments'];
  for (const table of tables) {
    try {
      const res = await db.execute(sql.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `));
      console.log(`Table: ${table}`);
      res.rows.forEach((row: any) => console.log(`  - ${row.column_name}: ${row.data_type}`));
    } catch(e: any) { 
      console.log(`Table ${table} error: ${e.message}`); 
    }
  }
  process.exit(0);
} 

run();

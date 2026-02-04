
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Checking sales table columns...');
  
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sales';
  `);


  console.log('Columns found in sales table:');
  const columns = result.rows.map((row: any) => row.column_name).sort();
  console.log(JSON.stringify(columns, null, 2));

  const expectedColumns = [
      'id', 'firebase_id', 'user_id', 'sale_number', 
      'client_id', 'client_name', 'client_phone', 'client_mutuelle', 'client_address',
      'total_ht', 'total_tva', 'total_ttc', 'total_net', 'total_paye', 'reste_a_payer',
      'status', 'payment_method', 'type', 
      'items', 'payment_history', 'prescription_snapshot', 
      'notes', 'date', 'last_payment_date', 
      'created_at', 'updated_at'
  ];

  const missing = expectedColumns.filter(col => !columns.includes(col));

  if (missing.length === 0) {
      console.log('✅ ALL expected columns exist.');
  } else {
      console.error('❌ MISSING columns:', missing.join(', '));
  }

  process.exit(0);
}

main().catch(console.error);

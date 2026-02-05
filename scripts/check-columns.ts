
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Checking clients table columns...');
  
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'clients';
  `);

  console.log('Columns found in clients table:');
  const columns = result.rows.map((row: any) => `${row.column_name} (${row.data_type})`);
  console.log(JSON.stringify(columns, null, 2));

  process.exit(0);
}

main().catch(console.error);

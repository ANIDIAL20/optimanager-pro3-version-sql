
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
  const columns = result.rows.map((row: any) => row.column_name);
  console.log(columns.join(', '));

  const requiredColumns = ['phone_2', 'prenom', 'nom', 'gender', 'cin', 'date_of_birth', 'mutuelle'];
  const missing = requiredColumns.filter(col => !columns.includes(col));

  if (missing.length === 0) {
    console.log('✅ ALL new columns (phone_2, prenom, nom, gender, cin, date_of_birth, mutuelle) exist!');
  } else {
    console.error('❌ MISSING columns:', missing.join(', '));
  }

  process.exit(0);
}

main().catch(console.error);

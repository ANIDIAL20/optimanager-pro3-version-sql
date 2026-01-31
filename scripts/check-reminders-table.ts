
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Checking reminders table...');
  
  const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'reminders';
  `);

  if (result.rows.length > 0) {
    console.log('✅ Reminders table exists!');
    
    // Check columns
    const cols = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reminders';
    `);
    console.log('Columns:', cols.rows.map((r: any) => r.column_name).join(', '));

  } else {
    console.error('❌ Reminders table DOES NOT exist!');
  }

  process.exit(0);
}

main().catch(console.error);

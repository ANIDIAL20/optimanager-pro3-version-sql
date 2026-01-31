
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Testing SELECT phone_2 FROM clients...');
  
  try {
    const result = await db.execute(sql`SELECT phone_2 FROM clients LIMIT 1`);
    console.log('✅ Success! Result:', result.rows);
  } catch (error: any) {
    console.error('❌ SELECT FAILED:', error.message);
  }

  process.exit(0);
}

main().catch(console.error);


import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkInsurances() {
  try {
    console.log('Checking insurances table...');
    // We can't easily guess the user_id without auth, so let's list all or check count
    const result = await db.execute(sql`SELECT * FROM insurances LIMIT 5`);
    console.log('Insurances found:', result.rows);
  } catch (error) {
    console.error('Error checking insurances:', error);
  }
  process.exit(0);
}

checkInsurances();


import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { prescriptions } from '../src/db/schema';

dotenv.config({ path: '.env.local' });

async function truncatePrescriptions() {
  console.log('🧹 Truncating prescriptions table...');
  try {
    await db.execute(sql`TRUNCATE TABLE prescriptions CASCADE;`);
    console.log('✅ Prescriptions table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating prescriptions table:', error);
  } finally {
    process.exit();
  }
}

truncatePrescriptions();

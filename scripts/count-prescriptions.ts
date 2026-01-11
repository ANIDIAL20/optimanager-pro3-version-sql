
import { db } from '../src/db';
import { prescriptions } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function countPrescriptions() {
  console.log('🔍 Checking Prescriptions...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing!');
    process.exit(1);
  }

  try {
    const result = await db.select({ count: count() }).from(prescriptions);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL PRESCRIPTIONS: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error counting prescriptions:', error);
  } finally {
    process.exit();
  }
}

countPrescriptions();

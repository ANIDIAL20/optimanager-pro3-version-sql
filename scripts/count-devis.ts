
import { db } from '../src/db';
import { devis } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function countDevis() {
  console.log('🔍 Checking Devis...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing!');
    process.exit(1);
  }

  try {
    const result = await db.select({ count: count() }).from(devis);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL DEVIS: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error counting devis:', error);
  } finally {
    process.exit();
  }
}

countDevis();

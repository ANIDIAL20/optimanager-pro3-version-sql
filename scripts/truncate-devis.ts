
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function truncateDevis() {
  console.log('🧹 Truncating devis table...');
  try {
    await db.execute(sql`TRUNCATE TABLE devis CASCADE;`);
    console.log('✅ Devis table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating devis table:', error);
  } finally {
    process.exit();
  }
}

truncateDevis();

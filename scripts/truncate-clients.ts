
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function truncateClients() {
  console.log('🧹 Truncating clients table...');
  try {
    await db.execute(sql`TRUNCATE TABLE clients CASCADE;`);
    console.log('✅ Clients table truncated successfully.');
  } catch (error) {
    console.error('❌ Error truncating clients table:', error);
  } finally {
    process.exit();
  }
}

truncateClients();

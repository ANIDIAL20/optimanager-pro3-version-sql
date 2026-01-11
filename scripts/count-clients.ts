
import { db } from '../src/db';
import { clients } from '../src/db/schema';
import { count } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function checkClients() {
  console.log('🔍 Checking DB connection...');
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing!');
    process.exit(1);
  } else {
    console.log(`✅ DATABASE_URL loaded (length: ${process.env.DATABASE_URL.length})`);
  }

  try {
    // Basic ping
    console.log('📡 Pinging DB...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ DB Ping successful.');

    console.log('📊 Counting clients...');
    const result = await db.select({ count: count() }).from(clients);
    console.log(`\n=============================`);
    console.log(`📊 TOTAL CLIENTS: ${result[0].count}`);
    console.log(`=============================\n`);
    
  } catch (error: any) {
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      severity: error.severity
    });
  } finally {
    process.exit();
  }
}

checkClients();

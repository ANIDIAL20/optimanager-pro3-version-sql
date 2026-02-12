require('dotenv').config({ path: '.env.local' });
const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function run() {
  try {
    console.log('🔄 Renaming table...');
    await db.execute(sql`ALTER TABLE prescriptions RENAME TO prescriptions_legacy`);
    console.log('✅ Table renamed to prescriptions_legacy successfully');
  } catch (err) {
    console.error('❌ Error renaming table:', err);
  }
  process.exit(0);
}

run();

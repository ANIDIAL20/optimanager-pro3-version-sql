const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('⏳ Applying migration 0005_add_extra_fees...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set! Check your .env.local file.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Add training_price column if it doesn't exist
    await client.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "training_price" numeric(10, 2) DEFAULT '0';
    `);
    console.log('✅ Added training_price column');
    
    // Add setup_price column if it doesn't exist
    await client.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "setup_price" numeric(10, 2) DEFAULT '0';
    `);
    console.log('✅ Added setup_price column');
    
    console.log('✅ Migration 0005 applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

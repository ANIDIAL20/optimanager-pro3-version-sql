import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Add columns
    console.log('Adding columns...');
    await client.query(`
      ALTER TABLE suppliers 
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
    `);
    
    console.log('✅ Added columns successfully.');
  } catch (err) {
    console.error('❌ Error adding columns:', err);
  } finally {
    await client.end();
  }
}

run();

import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL missing");
    process.exit(1);
  }

  const client = neon(process.env.DATABASE_URL);
  
  console.log("🚀 Creating backup_verification table...");
  
  try {
    await client(sql`
      CREATE TABLE IF NOT EXISTS backup_verification (
        id SERIAL PRIMARY KEY,
        checked_at TIMESTAMP DEFAULT NOW(),
        verified_by TEXT,
        notes TEXT
      );
    `);
    console.log("✅ Table created or already exists.");
  } catch (error) {
    console.error("❌ Error creating table:", error);
  }
}

setup();

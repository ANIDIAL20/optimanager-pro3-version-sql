import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';


// Load environment variables
import * as dotenvConf from 'dotenv';
dotenvConf.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Configurer WebSocket pour l'environnement Node (essentiel pour Neon Serverless driver)


const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('⏳ Applying migration 0003_add_payment_dates...');
  
  try {
    const migrationPath = path.join(process.cwd(), 'drizzle', '0003_add_payment_dates.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSql.split(';').filter(s => s.trim().length > 0);
    
    // Connect explicitly
    const client = await pool.connect();

    try {
        for (const statement of statements) {
            await client.query(statement);
        }
        console.log('✅ Migration 0003 applied successfully!');
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
      await pool.end();
  }
}

main();

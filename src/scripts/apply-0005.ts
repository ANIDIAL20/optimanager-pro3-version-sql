import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// Configure WebSocket for Neon
// neonConfig.fetchConnectionCache = true; // Deprecated and causing errors

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log('⏳ Applying migration 0005_add_extra_fees...');
  
  try {
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'drizzle', '0005_add_extra_fees.sql'),
      'utf-8'
    );
    
    // Execute the SQL directly using the neon client
    await sql(migrationSql);
    
    console.log('✅ Migration 0005 applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

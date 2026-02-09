import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const db = drizzle(neon(process.env.DATABASE_URL));

async function main() {
  const tables = ['clients', 'products', 'suppliers', 'users'];
  
  for (const table of tables) {
    console.log(`\n--- Checking ${table} table ---`);
    try {
      const result = await db.execute(sql.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}';
      `));
      
      if (result.rows.length === 0) {
        console.log(`Table ${table} NOT FOUND in information_schema!`);
        // Check if it's because of schema/catalog
        continue;
      }

      console.log(`Columns found in ${table}:`);
      result.rows.forEach((row: any) => {
        console.log(` - ${row.column_name} (${row.data_type})`);
      });
    } catch (err) {
      console.error(`Error checking ${table}:`, err);
    }
  }

  process.exit(0);
}

main().catch(console.error);

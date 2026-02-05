import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    const migrationSql = fs.readFileSync(path.join(process.cwd(), 'drizzle/0002_add_client_supplier_limits.sql'), 'utf8');
    const statements = migrationSql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Applying ${statements.length} migration statements...`);
    
    for (const stmt of statements) {
        console.log('Executing:', stmt.trim());
        await db.execute(sql.raw(stmt));
    }
    
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

main();

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    const migrationSql = fs.readFileSync(path.join(process.cwd(), 'drizzle/0001_add_max_products.sql'), 'utf8');
    console.log('Applying migration:', migrationSql);
    await db.execute(sql.raw(migrationSql));
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

main();

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔍 Investigating Expenses schema...');
  
  try {
    // Check table names
    const tablesQuery = sql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%expense%' OR table_name ILIKE '%charge%';
    `);
    const tables = await db.execute(tablesQuery);
    console.log('Relevant tables in DB:');
    console.table(tables.rows);

    // If expenses_v2 exists, check it. Also check other likely candidates.
    for (const row of tables.rows) {
      const tableName = (row as any).table_name;
      console.log(`\nColumns for table: ${tableName}`);
      const columnsQuery = sql.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}';
      `);
      const columns = await db.execute(columnsQuery);
      console.table(columns.rows);
    }
    
  } catch (error: any) {
    console.error('❌ Investigation failed:', error.message || error);
  } finally {
    process.exit(0);
  }
}

main();

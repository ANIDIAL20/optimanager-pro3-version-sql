import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔍 Deep Investigation of expenses_v2...');
  
  try {
    // Try to get one row to see what's in it
    const sampleQuery = sql.raw(`SELECT * FROM expenses_v2 LIMIT 1;`);
    const sample = await db.execute(sampleQuery);
    console.log('Sample row (keys only):');
    if (sample.rows.length > 0) {
      console.log(Object.keys(sample.rows[0]));
    } else {
      console.log('No rows found in expenses_v2.');
    }

    // Try another way to get columns
    const colsQuery = sql.raw(`
      SELECT 
          column_name, 
          data_type,
          is_nullable
      FROM 
          information_schema.columns 
      WHERE 
          table_name = 'expenses_v2'
      ORDER BY 
          ordinal_position;
    `);
    const cols = await db.execute(colsQuery);
    console.log('Columns from information_schema:');
    console.log(JSON.stringify(cols.rows, null, 2));

    // List all tables again just in case there is a case sensitivity issue or schema issue
    const allTablesQuery = sql.raw(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%expense%' OR table_name ILIKE '%charge%';
    `);
    const allTables = await db.execute(allTablesQuery);
    console.log('All matching tables and their schemas:');
    console.table(allTables.rows);
    
  } catch (error: any) {
    console.error('❌ Investigation failed:', error.message || error);
  } finally {
    process.exit(0);
  }
}

main();

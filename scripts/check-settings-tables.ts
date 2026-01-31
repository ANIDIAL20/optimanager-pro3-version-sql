import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkSettingsTables() {
  try {
    console.log('🔍 Checking if settings tables exist...\n');
    
    // Check all settings tables
    const tables = ['brands', 'categories', 'materials', 'colors', 'treatments', 'mounting_types', 'banks', 'insurances'];
    
    for (const tableName of tables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          );
        `);
        
        const exists = result.rows[0]?.exists;
        console.log(`${exists ? '✅' : '❌'} Table "${tableName}": ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
        
        // If table exists, count rows
        if (exists) {
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) FROM "${tableName}"`));
          console.log(`   → Rows: ${countResult.rows[0]?.count || 0}`);
        }
      } catch (error: any) {
        console.log(`❌ Table "${tableName}": ERROR - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    process.exit(0);
  }
}

checkSettingsTables();

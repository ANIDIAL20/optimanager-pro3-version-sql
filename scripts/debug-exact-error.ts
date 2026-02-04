
import { db } from '@/db';
import { sales } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: ".env.local" });

async function main() {
  console.log('🔍 Inspecting sales table schema...');
  
  // Check column types
  const schemaResult = await db.execute(sql`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns 
    WHERE table_name = 'sales'
    ORDER BY column_name;
  `);

  console.log('📋 Sales Table Columns:');
  console.table(schemaResult.rows.map((row: any) => ({
    name: row.column_name,
    type: row.data_type,
    udt: row.udt_name
  })));

  // Try the exact failing query
  console.log('\n🧪 Testing failing query...');
  const userId = 'd7daf565-32ff-482d-b798-63120fd75e66'; // From user error

  try {
      const result = await db.select().from(sales)
          .where(eq(sales.userId, userId))
          .orderBy(desc(sales.createdAt));
      
      console.log(`✅ Query successful! Retrieved ${result.length} rows.`);
      if (result.length > 0) {
        console.log('Sample ID:', result[0].id);
        console.log('Sample Sale Number:', result[0].saleNumber);
      }
  } catch (error: any) {
      console.error('❌ Query FAILED!');
      console.error('Message:', error.message);
      console.error('Detail:', error.detail);
      console.error('Hint:', error.hint);
      console.error('Position:', error.position);
      console.error('Full Error:', error);
  }

  process.exit(0);
}

main().catch(console.error);

import { db } from '@/db';
import { brands, categories, materials, colors } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function testGetSettings() {
  try {
    console.log('🔍 Testing getSettings logic...\n');
    
    const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
    
    // Test the exact tableMap approach used in settings-actions.ts
    const tableMap = {
      brands,
      categories,
      materials,
      colors,
    };
    
    for (const [type, table] of Object.entries(tableMap)) {
      console.log(`\n📋 Testing ${type}...`);
      try {
        const items = await db
          .select()
          .from(table)
          .where(eq(table.userId, userId))
          .orderBy(table.name);
        
        console.log(`✅ ${type}: Found ${items.length} items`);
        if (items.length > 0) {
          console.log('   First item:', items[0]);
        }
      } catch (error: any) {
        console.error(`❌ ${type} FAILED:`, error.message);
        console.error('   Error code:', error.code);
        console.error('   Error detail:', error.detail);
        console.error('   Error hint:', error.hint);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

testGetSettings();

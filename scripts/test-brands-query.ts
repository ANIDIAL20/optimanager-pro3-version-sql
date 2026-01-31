import { db } from '@/db';
import { brands } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function testBrandsQuery() {
  try {
    console.log('🔍 Testing brands query with userId...\n');
    
    // Try to get brands with a specific userId (from the error message)
    const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
    
    console.log(`Querying brands for userId: ${userId}`);
    
    const result = await db
      .select()
      .from(brands)
      .where(eq(brands.userId, userId))
      .orderBy(brands.name);
    
    console.log(`\n✅ Query successful! Found ${result.length} brands:`);
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error hint:', error.hint);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

testBrandsQuery();

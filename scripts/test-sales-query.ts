
import { db } from '@/db';
import { sales } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Testing simple sales query...');
  
  try {
      const result = await db.select().from(sales).limit(1);
      console.log('✅ Simple SELECT success. Rows:', result.length);
      if (result.length > 0) {
          console.log('Sample row:', result[0]);
      }
  } catch (e: any) {
      console.error('❌ Simple SELECT failed:', e.message);
  }

  console.log('Testing Relation Query API (findMany)...');
  try {
      const result = await db.query.sales.findMany({
          limit: 1
      });
      console.log('✅ Relation Query success. Rows:', result.length);
  } catch (e: any) {
      console.error('❌ Relation Query failed:', e.message);
      console.error(e);
  }

  process.exit(0);
}

main().catch(console.error);

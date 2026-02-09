import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, count } from 'drizzle-orm';
import * as schema from '../src/db/schema';

dotenv.config({ path: '.env.local' });

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  const uid = 'd7daf565-32ff-482d-b798-63120fd75e66';
  console.log(`Testing query for UID: ${uid}`);
  
  try {
    const productCountResult = await db.select({ count: count(schema.products.id) })
        .from(schema.products)
        .where(eq(schema.products.userId, uid));
    
    console.log('Success:', productCountResult);
  } catch (err) {
    console.error('Query Failed:', err);
  }
}

main();

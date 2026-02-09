import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../src/db/schema';

dotenv.config({ path: '.env.local' });

// Add logger
const db = drizzle(neon(process.env.DATABASE_URL!), { schema, logger: true });

async function main() {
  const uid = 'd7daf565-32ff-482d-b798-63120fd75e66';
  console.log(`Testing suppliers fetch for UID: ${uid}`);
  
  try {
    const results = await db.select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.userId, uid))
        .orderBy(desc(schema.suppliers.createdAt));
    
    console.log('Success, found:', results.length, 'suppliers');
  } catch (err: any) {
    console.error('Query Failed!');
    console.error('Message:', err.message);
  }
}

main();

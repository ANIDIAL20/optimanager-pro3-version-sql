import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../src/db/schema';

dotenv.config({ path: '.env.local' });

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  const uid = 'd7daf565-32ff-482d-b798-63120fd75e66';
  console.log(`Testing suppliers fetch for UID: ${uid}`);
  
  try {
    const results = await db.select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.userId, uid))
        .orderBy(desc(schema.suppliers.createdAt));
    
    console.log('Success, found:', results.length, 'suppliers');
    if (results.length > 0) {
        console.log('First supplier:', results[0].name);
    }
  } catch (err: any) {
    console.error('Query Failed!');
    console.error('Message:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  }
}

main();

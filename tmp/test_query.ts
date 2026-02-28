
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { frameReservations } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function test() {
  console.log('Testing query for clientId 33...');
  try {
    const results = await db.select().from(frameReservations).where(eq(frameReservations.clientId, 33)).limit(1);
    console.log('Success:', results);
  } catch (error: any) {
    console.error('Failure:', error);
    if (error.message) console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.detail) console.error('Detail:', error.detail);
  }
}

test().then(() => process.exit(0));

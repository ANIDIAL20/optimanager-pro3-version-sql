import { db } from './src/db';
import { reminders } from './src/db/schema.ts';
import { desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugMetadata() {
    try {
        const data = await db.select().from(reminders).orderBy(desc(reminders.createdAt)).limit(10);
        console.log('--- REMINDERS DEBUG ---');
        data.forEach(r => {
            console.log(`ID: ${r.id}, Title: ${r.title}`);
            console.log(`Metadata Type: ${typeof r.metadata}`);
            console.log(`Metadata Value:`, r.metadata);
            console.log('------------------------');
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

debugMetadata();

//test
import { db } from './src/db';
import { reminders } from './src/db/schema.ts';
import { sql, and, eq } from 'drizzle-orm';

async function testQuery() {
    try {
        const results = await db
            .select()
            .from(reminders)
            .where(sql`CAST(COALESCE(metadata->>'installmentAmount', '0') AS NUMERIC) >= 0`)
            .limit(1);
        console.log('Success:', results);
    } catch (e) {
        console.error('Error:', e);
    }
}

testQuery();

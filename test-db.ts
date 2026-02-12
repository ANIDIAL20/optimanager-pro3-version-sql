import { db } from './src/db';
import { auditLogs } from './src/db/schema';
import { count } from 'drizzle-orm';

async function test() {
    try {
        const result = await db.select({ value: count() }).from(auditLogs);
        console.log('✅ audit_logs table exists. Count:', result[0].value);
    } catch (e) {
        console.error('❌ audit_logs table error:', e.message);
    }
}

test();

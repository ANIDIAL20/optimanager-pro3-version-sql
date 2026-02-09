/**
 * Audit Log Cleanup Script
 * Cleans up logs older than 90 days to maintain performance.
 */

import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { sql, lt } from 'drizzle-orm';

export async function cleanupOldAuditLogs() {
    console.log('🧹 Starting Audit Log Cleanup...');
    
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        // Execute cleanup
        const result = await db.delete(auditLogs)
            .where(lt(auditLogs.createdAt, ninetyDaysAgo))
            .returning({ id: auditLogs.id });
        
        console.log(`✅ Cleaned up ${result.length} old audit logs (older than ${ninetyDaysAgo.toISOString()})`);
        return { success: true, deletedCount: result.length };
        
    } catch (error: any) {
        console.error('❌ Failed to cleanup audit logs:', error.message);
        return { success: false, error: error.message };
    }
}

// Support direct execution if needed
if (require.main === module) {
    cleanupOldAuditLogs()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

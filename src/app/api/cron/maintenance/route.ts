/**
 * Cron API - Scheduled Database Maintenance & Health Checks
 * Endpoint: /api/cron/maintenance
 */

import { cleanupOldAuditLogs } from '@/scripts/cleanup-audit-logs';
import { checkApplicationHealth } from '@/lib/health-check';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // 1. Verify Authorization (Vercel Cron Secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    console.log('⏰ Starting scheduled maintenance cron...');

    try {
        // 2. Perform Audit Log Cleanup
        const cleanupResult = await cleanupOldAuditLogs();
        
        // 3. Perform Proactive Health Check
        const healthResult = await checkApplicationHealth();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            maintenance: {
                auditCleanup: cleanupResult
            },
            health: {
                healthy: healthResult.healthy,
                issues: healthResult.issues
            }
        });
    } catch (error: any) {
        console.error('❌ Cron Job Failed:', error.message);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}

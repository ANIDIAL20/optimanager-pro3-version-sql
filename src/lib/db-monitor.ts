import { db } from '../db';
import { auditLogs } from '../db/schema';
import { sql, and, gte, eq, count } from 'drizzle-orm';

/**
 * DB Monitor - Performance & Reliability Tracking
 */

export async function logSlowQuery(query: string, duration: number) {
    if (duration > 500) { // 500ms threshold
        console.warn('🐌 Slow Query Detected', {
            query: query.substring(0, 150) + (query.length > 150 ? '...' : ''),
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        
        // In a real production app, we would push this to a monitoring service (Sentry, Axiom, etc.)
    }
}

/**
 * Track transaction failures for daily metrics
 */
export async function trackTransactionFailure(action: string, error: string, context?: any) {
    console.error(`🚨 Transaction Failed [${action}]`, {
        error,
        context,
        timestamp: new Date().toISOString()
    });
    
    // Increment a counter or log to a specific monitoring table if needed
}

/**
 * Measure Execution Duration
 */
export async function withTiming<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
        const result = await fn();
        const duration = Math.round(performance.now() - start);
        await logSlowQuery(name, duration);
        return result;
    } catch (error: any) {
        const duration = Math.round(performance.now() - start);
        await trackTransactionFailure(name, error.message, { duration });
        throw error;
    }
}

/**
 * Get count of failed transactions today
 */
export async function getFailedTransactionsToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
        .select({ value: count() })
        .from(auditLogs)
        .where(
            and(
                gte(auditLogs.createdAt, today),
                sql`${auditLogs.metadata}->>'errorMessage' IS NOT NULL`
            )
        );
        
    return result[0]?.value || 0;
}

/**
 * Metrics Aggregation Utility
 * Distills raw audit logs into actionable business insights.
 */

import { db } from '../db';
import { auditLogs, users } from '../db/schema';
import { sql, and, gte, lte, count, avg, max } from 'drizzle-orm';

export interface DailyMetrics {
    date: Date;
    totalTransactions: number;
    failedTransactions: number;
    errorRate: number;
    avgResponseTime: number;
    slowestQuery: number;
    activeUsers: number;
}

/**
 * Aggregate metrics for a specific date
 */
export async function getDailyMetrics(date: Date): Promise<DailyMetrics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Aggregated Metrics from Audit Logs
    const result = await db.select({
        total: sql<number>`count(*)`,
        failures: sql<number>`count(*) FILTER (WHERE ${auditLogs.metadata}->>'errorMessage' IS NOT NULL)`,
        avgDuration: sql<number>`avg(CAST(${auditLogs.metadata}->>'duration' AS INTEGER))`,
        maxDuration: sql<number>`max(CAST(${auditLogs.metadata}->>'duration' AS INTEGER))`
    })
    .from(auditLogs)
    .where(and(
        gte(auditLogs.createdAt, startOfDay),
        lte(auditLogs.createdAt, endOfDay)
    ));

    const stats = result[0] || { total: 0, failures: 0, avgDuration: 0, maxDuration: 0 };
    
    // Count distinct users active on this day
    const userCountResult = await db.select({ value: count() })
        .from(auditLogs)
        .where(and(
            gte(auditLogs.createdAt, startOfDay),
            lte(auditLogs.createdAt, endOfDay)
        ))
        .groupBy(auditLogs.userId);

    return {
        date,
        totalTransactions: Number(stats.total) || 0,
        failedTransactions: Number(stats.failures) || 0,
        errorRate: stats.total > 0 ? (Number(stats.failures) / Number(stats.total)) * 100 : 0,
        avgResponseTime: Math.round(Number(stats.avgDuration) || 0),
        slowestQuery: Number(stats.maxDuration) || 0,
        activeUsers: userCountResult.length
    };
}

/**
 * Get metrics for the last 7 days
 */
export async function getMetricsForLastWeek(): Promise<DailyMetrics[]> {
    const metrics: DailyMetrics[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        metrics.push(await getDailyMetrics(date));
    }
    return metrics;
}

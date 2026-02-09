/**
 * Application Health Check System
 * Evaluates system status against defined thresholds for proactive monitoring.
 */

import { getDailyMetrics } from './metrics';
import { sendAlert } from './alerting';

export interface HealthStatus {
    healthy: boolean;
    errorRate: number;
    slowQueries: number;
    avgResponseTime: number;
    timestamp: Date;
    issues: string[];
}

/**
 * Perform a comprehensive health check of the application
 */
export async function checkApplicationHealth(): Promise<HealthStatus> {
    console.log('🏥 Performing system health check...');
    
    // Get stats for today
    const metrics = await getDailyMetrics(new Date());
    const issues: string[] = [];

    // Threshold 1: Error Rate > 5%
    if (metrics.errorRate > 5) {
        issues.push(`High Error Rate: ${metrics.errorRate.toFixed(2)}%`);
    }

    // Threshold 2: Slowest Query > 2000ms
    if (metrics.slowestQuery > 2000) {
        issues.push(`Critical Performance Degradation: Slowest query took ${metrics.slowestQuery}ms`);
    }

    // Threshold 3: Average Response Time > 800ms
    if (metrics.avgResponseTime > 800) {
        issues.push(`Degraded Average Performance: ${metrics.avgResponseTime}ms`);
    }

    const healthy = issues.length === 0;

    // Send alert if not healthy
    if (!healthy) {
        await sendAlert({
            severity: metrics.errorRate > 10 ? 'critical' : 'high',
            title: 'System Health Check Failed',
            message: `The following health issues were detected:\n- ${issues.join('\n- ')}`,
            metadata: { metrics }
        });
    }

    return {
        healthy,
        errorRate: metrics.errorRate,
        slowQueries: metrics.slowestQuery, // Using max duration as a proxy for presence of slow queries
        avgResponseTime: metrics.avgResponseTime,
        timestamp: new Date(),
        issues
    };
}

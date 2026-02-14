import { logAudit } from './audit-log';

/**
 * Performance Monitoring Utility
 * Measures execution time and logs slow/failed operations to audit_logs
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  const userId = context?.userId || 'system';

  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    // ✅ Log performance metrics (Fire-and-forget)
    if (duration > 500) {
      console.warn(`⚠️ Slow operation: ${name} took ${duration}ms`);
      
      // Don't await - let it run in background
      logAudit({
        userId,
        entityType: 'performance',
        entityId: 'slow-query',
        action: 'slow_query_detected',
        success: true,
        metadata: {
          operationName: name,
          duration,
          threshold: 500,
          context,
          timestamp: new Date().toISOString()
        }
      }).catch(err => console.warn('Failed to log slow query', err));
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${name} completed in ${duration}ms`);
    }
    
    // ✅ Track all operations
    trackPerformanceMetric(name, duration).catch(() => {});
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error(`❌ ${name} failed after ${duration}ms`, error);
    
    // Log failure in background
    logAudit({
      userId,
      entityType: 'performance',
      entityId: 'operation-failure',
      action: 'operation_failed',
      success: false,
      errorMessage: error.message,
      metadata: {
        operationName: name,
        duration,
        error: error.message,
        context
      }
    }).catch(err => console.warn('Failed to log failure', err));
    
    throw error;
  }
}

/**
 * Placeholder for performance metrics tracking (e.g. Redis, InfluxDB, or a metrics table)
 */
async function trackPerformanceMetric(operation: string, duration: number) {
  // Logic for aggregating metrics (e.g., counters, average calculation)
  // [Aggregation Logic Here]
}

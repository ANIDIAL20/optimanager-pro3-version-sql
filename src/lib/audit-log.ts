import { db } from '../db';
import { auditLogs } from '../db/schema';
import { sql } from 'drizzle-orm';
import { logSlowQuery, trackTransactionFailure } from './db-monitor';

export interface AuditLogEntry {
  userId: string;
  entityType: string; // 'sale', 'product', 'client', 'lens_order'
  entityId: string;
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log an action to the structured audit trail
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to console for observability
    console.log(`[AUDIT] ${entry.action} on ${entry.entityType}:${entry.entityId} by ${entry.userId}`);
    
    // Save to PostgreSQL
    await db.insert(auditLogs).values({
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId.toString(),
      action: entry.action,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      metadata: { 
        ...entry.metadata,
        errorMessage: entry.errorMessage
      },
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });

    if (!entry.success) {
        await trackTransactionFailure(entry.action, entry.errorMessage || 'Unknown error', { entity: entry.entityType });
    }
  } catch (error: any) {
    // Don't fail the business operation if logging fails
    console.error('CRITICAL: Failed to save audit log:', error);
    await trackTransactionFailure('AUDIT_LOG_SAVE', error.message);
  }
}

/**
 * Helper to log successful operations
 */
export async function logSuccess(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | number,
  details?: Record<string, any>,
  oldValue?: any,
  newValue?: any,
  duration?: number
): Promise<void> {
  await logAudit({
    userId,
    action,
    entityType,
    entityId: entityId.toString(),
    metadata: { ...details, duration },
    oldValue,
    newValue,
    success: true,
  });
}

/**
 * Helper to log failed operations
 */
export async function logFailure(
  userId: string,
  action: string,
  entityType: string,
  error: string,
  entityId: string | number = 'unknown',
  duration?: number
): Promise<void> {
  await logAudit({
    userId,
    action,
    entityType,
    entityId: entityId.toString(),
    success: false,
    errorMessage: error,
    metadata: { duration }
  });
}

/**
 * Wrapper for legacy support or simpler use cases
 */
export function withAudit<TArgs extends any[], TReturn>(
  entityType: string,
  action: string,
  handler: (userId: string, ...args: TArgs) => Promise<TReturn>
) {
  return async (userId: string, ...args: TArgs): Promise<TReturn> => {
    try {
      const result = await handler(userId, ...args);
      await logSuccess(userId, action, entityType, 'wrapper');
      return result;
    } catch (error: any) {
      await logFailure(userId, action, entityType, error.message);
      throw error;
    }
  };
}

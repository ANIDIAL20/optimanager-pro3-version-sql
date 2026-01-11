/**
 * Audit Logging System
 * Tracks all database operations for security and debugging
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface AuditLogEntry {
  userId: string;
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'READ'
  resource: string; // 'products', 'sales', etc.
  resourceId?: string | number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * Log an action to the audit trail
 * This helps track who did what and when
 */
export async function logAudit(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  try {
    const logEntry = {
      ...entry,
      timestamp: new Date(),
    };
    
    // Log to console for now (can be extended to database)
    console.log('[AUDIT]', JSON.stringify(logEntry));
    
    // TODO: Optionally save to database
    // await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    // Don't fail the operation if logging fails
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Helper to log successful operations
 */
export async function logSuccess(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string | number,
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource,
    resourceId,
    details,
    success: true,
  });
}

/**
 * Helper to log failed operations
 */
export async function logFailure(
  userId: string,
  action: string,
  resource: string,
  error: string,
  resourceId?: string | number
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource,
    resourceId,
    success: false,
    errorMessage: error,
  });
}

/**
 * Wrapper to automatically log actions
 */
export function withAudit<TArgs extends any[], TReturn>(
  resource: string,
  action: string,
  handler: (userId: string, ...args: TArgs) => Promise<TReturn>
) {
  return async (userId: string, ...args: TArgs): Promise<TReturn> => {
    try {
      const result = await handler(userId, ...args);
      
      await logSuccess(userId, action, resource);
      
      return result;
    } catch (error: any) {
      await logFailure(userId, action, resource, error.message);
      throw error;
    }
  };
}

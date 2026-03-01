import { headers } from 'next/headers';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

interface AuditData {
  /** Maps to entityType in auditLogs schema */
  tableName: string;
  /** Maps to action in auditLogs schema */
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Maps to entityId in auditLogs schema */
  recordId: number;
  oldData?: any;
  newData?: any;
  userId: string;
}

/**
 * Enregistrer un log d'audit
 */
export async function logAudit(data: AuditData): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    await db.insert(auditLogs).values({
      userId:     data.userId,
      entityType: data.tableName,           // tableName → entityType
      entityId:   data.recordId.toString(), // recordId  → entityId
      action:     data.operation,           // operation → action
      oldValue:   data.oldData,
      newValue:   data.newData,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // On ne bloque pas l'exécution principale si l'audit échoue
    console.error('❌ Failed to log audit:', error);
  }
}

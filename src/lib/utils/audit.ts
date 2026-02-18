import { headers } from 'next/headers';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

interface AuditData {
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
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
      tableName: data.tableName,
      operation: data.operation,
      recordId: data.recordId.toString(),
      oldData: data.oldData,
      newData: data.newData,
      userId: data.userId,
      ipAddress,
      userAgent,
      changedAt: new Date(),
    });
  } catch (error) {
    // On ne bloque pas l'exécution principale si l'audit échoue
    console.error('❌ Failed to log audit:', error);
  }
}

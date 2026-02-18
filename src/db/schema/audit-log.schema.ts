import { pgTable, serial, text, timestamp, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const auditLogs = pgTable('audit_logs_v2', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  operation: varchar('operation', { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
  recordId: text('record_id').notNull(),
  
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  
  userId: text('user_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tableRecordIdx: index('idx_audit_table_record').on(table.tableName, table.recordId),
  userIdIdx: index('idx_audit_user').on(table.userId),
  dateIdx: index('idx_audit_date').on(table.changedAt),
}));

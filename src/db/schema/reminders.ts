import { pgTable, serial, text, timestamp, varchar, index, json } from 'drizzle-orm/pg-core';

export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(), // 'cheque', 'payment', 'stock', 'order', 'appointment', 'maintenance', 'admin'
  priority: text('priority').notNull().default('normal'), // 'urgent', 'important', 'normal', 'info'
  title: text('title').notNull(),
  message: text('message'),
  status: text('status').notNull().default('pending'), // 'pending', 'read', 'completed', 'ignored', 'snoozed'
  dueDate: timestamp('due_date'),
  relatedId: varchar('related_id', { length: 36 }), // Supports UUIDs
  relatedType: text('related_type'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
}, (table) => ({
  dashboardIdx: index('idx_reminders_dashboard').on(table.userId, table.status, table.dueDate),
  relatedIdx: index('idx_reminders_related').on(table.relatedType, table.relatedId)
}));

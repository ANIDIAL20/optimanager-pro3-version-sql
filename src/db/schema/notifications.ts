import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id'), // No foreign key constraint to avoid circular deps
  type: text('type')
    .$type<'RESERVATION_EXPIRING' | 'RESERVATION_EXPIRED' | 'LOW_STOCK' | 'OTHER'>()
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  priority: text('priority')
    .$type<'LOW' | 'MEDIUM' | 'HIGH'>()
    .notNull()
    .default('MEDIUM'),
  relatedEntityType: text('related_entity_type'),
  relatedEntityId: integer('related_entity_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  readAt: timestamp('read_at', { mode: 'date' }),
});

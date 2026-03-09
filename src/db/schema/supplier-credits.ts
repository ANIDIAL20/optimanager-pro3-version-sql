import { pgTable, text, timestamp, numeric, index, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { suppliers, supplierOrders } from './suppliers.schema';

export const supplierCredits = pgTable('supplier_credits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: uuid('supplier_id')
    .references(() => suppliers.id, { onDelete: 'restrict' })
    .notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  remainingAmount: numeric('remaining_amount', { precision: 15, scale: 2 }).notNull(),
  status: text('status').default('open'), // 'open' | 'partial' | 'closed'
  sourceType: text('source_type'), // 'return' | 'overcharge' | 'manual'
  reference: text('reference'),
  notes: text('notes'),
  relatedReceiptId: uuid('related_receipt_id'), // FK vers goods_receipts (optionnel)
  relatedOrderId: uuid('related_order_id')
    .references(() => supplierOrders.id, { onDelete: 'set null' }), // FK vers supplier_orders (optionnel)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  supplierIdx: index('idx_supplier_credits_supplier').on(table.supplierId),
  statusIdx: index('idx_supplier_credits_status').on(table.status),
}));

export const supplierCreditAllocations = pgTable('supplier_credit_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  creditId: uuid('credit_id').notNull().references(() => supplierCredits.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => supplierOrders.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const supplierCreditsRelations = relations(supplierCredits, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierCredits.supplierId],
    references: [suppliers.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierCredits.relatedOrderId],
    references: [supplierOrders.id],
  }),
  allocations: many(supplierCreditAllocations),
}));

export const supplierCreditAllocationsRelations = relations(supplierCreditAllocations, ({ one }) => ({
  credit: one(supplierCredits, {
    fields: [supplierCreditAllocations.creditId],
    references: [supplierCredits.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierCreditAllocations.orderId],
    references: [supplierOrders.id],
  }),
}));

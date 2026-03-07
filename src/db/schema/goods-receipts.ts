import { pgTable, text, timestamp, integer, numeric, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { suppliers, supplierOrders, supplierOrderItems } from './suppliers.schema';

export const goodsReceipts = pgTable('goods_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
  deliveryNoteRef: text('delivery_note_ref'),
  status: text('status').default('draft'), // 'draft' | 'validated' | 'cancelled'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  validatedAt: timestamp('validated_at'),
});

export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptId: uuid('receipt_id')
    .references(() => goodsReceipts.id, { onDelete: 'cascade' })
    .notNull(),
  orderItemId: integer('order_item_id')
    .references(() => supplierOrderItems.id, { onDelete: 'set null' }), // Relation vers la ligne de commande
  productId: integer('product_id').notNull(),
  qtyOrdered: integer('qty_ordered').default(0),
  qtyReceived: integer('qty_received').default(0).notNull(),
  qtyRejected: integer('qty_rejected').default(0),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }),
});

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [goodsReceipts.supplierId],
    references: [suppliers.id],
  }),
  items: many(goodsReceiptItems),
}));

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  receipt: one(goodsReceipts, {
    fields: [goodsReceiptItems.receiptId],
    references: [goodsReceipts.id],
  }),
  orderItem: one(supplierOrderItems, {
    fields: [goodsReceiptItems.orderItemId],
    references: [supplierOrderItems.id],
  }),
}));

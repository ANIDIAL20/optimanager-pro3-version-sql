import { pgTable, serial, text, timestamp, numeric, integer, index, check, uuid, boolean, json, jsonb } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// 1. SUPPLIERS
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  category: text('category'),
  ice: text('ice'),
  if: text('if'),
  rc: text('rc'),
  taxId: text('tax_id'),
  paymentTerms: text('payment_terms'),
  paymentMethod: text('payment_method'),
  bank: text('bank'),
  rib: text('rib'),
  notes: text('notes'),
  status: text('status'),
  contactPerson: text('contact_person'),
  creditLimit: numeric('credit_limit', { precision: 15, scale: 2 }),
  currentBalance: numeric('current_balance', { precision: 15, scale: 2 }),
  rating: text('rating'),
  isActive: boolean('is_active').default(true).notNull(),
  defaultTaxMode: text('default_tax_mode'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  nameIdx: index('idx_suppliers_name').on(table.name),
  activeIdx: index('idx_suppliers_active').on(table.isActive),
}));

// 2. SUPPLIER ORDERS
export const supplierOrders = pgTable('supplier_orders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'restrict' }),
  firebaseId: text('firebase_id'),
  fournisseur: text('fournisseur'),
  items: json('items'),
  montantTotal: numeric('montant_total', { precision: 15, scale: 2 }),
  montantPaye: numeric('montant_paye', { precision: 15, scale: 2 }).default('0'),
  resteAPayer: numeric('reste_a_payer', { precision: 15, scale: 2 }),
  statut: text('statut').default('pending'),
  orderDate: timestamp('date_commande').defaultNow(),
  dateReception: timestamp('date_reception'),
  notes: text('notes'),
  dueDate: timestamp('due_date'),
  orderReference: text('order_reference'),
  subTotal: numeric('sub_total', { precision: 15, scale: 2 }),
  tva: numeric('tva', { precision: 15, scale: 2 }),
  discount: numeric('discount', { precision: 15, scale: 2 }),
  shippingCost: numeric('shipping_cost', { precision: 15, scale: 2 }),
  deliveryStatus: text('delivery_status'),
  orderNumber: text('order_number'),
  supplierPhone: text('supplier_phone'),
  expectedDelivery: timestamp('expected_delivery'),
  createdBy: text('created_by'),
  templateVersionUsed: integer('template_version_used'),
  templateSnapshot: jsonb('template_snapshot'),
  amountPaid: numeric('amount_paid', { precision: 15, scale: 2 }).default('0').notNull(),
  remainingAmount: numeric('remaining_amount', { precision: 15, scale: 2 }).default('0').notNull(),
  paymentStatus: text('payment_status').$type<'unpaid' | 'partial' | 'paid'>().default('unpaid').notNull(),
  status: text('status').default('pending'),
  currency: text('currency').default('MAD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  supplierDateIdx: index('idx_orders_supplier_date').on(table.supplierId, table.orderDate, table.deletedAt),
}));

// 3. SUPPLIER PAYMENTS
export const supplierPayments = pgTable('supplier_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  orderId: integer('order_id').references(() => supplierOrders.id, { onDelete: 'set null' }),
  firebaseId: text('firebase_id'),
  supplierName: text('supplier_name').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  method: text('method').notNull(),
  reference: text('reference'), 
  bankName: text('bank'),
  checkDueDate: timestamp('due_date', { withTimezone: true }),
  status: text('status'),
  paymentDate: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
  paymentNumber: text('payment_number'),
  chequeNumber: text('cheque_number'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  supplierPaymentIdx: index('idx_payments_supplier_date').on(table.supplierId, table.paymentDate, table.deletedAt),
}));

// 4. PIVOT TABLE
export const supplierOrderPayments = pgTable('supplier_order_payments', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  paymentId: uuid('payment_id').references(() => supplierPayments.id, { onDelete: 'cascade' }),
  orderId: integer('order_id').references(() => supplierOrders.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// RELATIONS
// ========================================

// Relations moved to main schema.ts to avoid circularity with lensOrders

export const supplierOrdersRelations = relations(supplierOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierOrders.supplierId],
    references: [suppliers.id],
  }),
  allocations: many(supplierOrderPayments),
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierPayments.supplierId],
    references: [suppliers.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierPayments.orderId],
    references: [supplierOrders.id],
  }),
  allocations: many(supplierOrderPayments),
}));

export const supplierOrderPaymentsRelations = relations(supplierOrderPayments, ({ one }) => ({
  payment: one(supplierPayments, {
    fields: [supplierOrderPayments.paymentId],
    references: [supplierPayments.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierOrderPayments.orderId],
    references: [supplierOrders.id],
  }),
}));

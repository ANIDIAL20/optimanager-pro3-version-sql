import { pgTable, pgView, serial, text, varchar, timestamp, numeric, integer, index, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { products } from './products';

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
  // ✅ Real-time balance — updated atomically in every order/payment transaction
  currentBalance: numeric('current_balance', { precision: 15, scale: 2 }).default('0').notNull(),
  rating: text('rating'),
  isActive: boolean('is_active').default(true).notNull(),
  defaultTaxMode: text('default_tax_mode'),
  // âœ… Ã‰tape 1 â€” Contact columns (migrated from serialized notes JSON)
  contactName:  varchar('contact_name',  { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50  }),
  contactEmail: varchar('contact_email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  nameIdx: index('idx_suppliers_name').on(table.name),
  activeIdx: index('idx_suppliers_active').on(table.isActive),
}));

// âœ… Ã‰tape 2 â€” supplier_balance_view (Drizzle declaration)
// Calcule automatiquement le solde rÃ©el depuis les commandes et paiements.
// Utiliser supplierBalanceView.soldeReel au lieu de suppliers.currentBalance (@deprecated).
export const supplierBalanceView = pgView('supplier_balance_view', {
  supplierId:     uuid('supplier_id'),
  userId:         text('user_id'),
  totalAchats:    numeric('total_achats',    { precision: 15, scale: 2 }),
  totalPaiements: numeric('total_paiements', { precision: 15, scale: 2 }),
  soldeReel:      numeric('solde_reel',      { precision: 15, scale: 2 }),
}).existing();

// 2. SUPPLIER ORDERS
export const supplierOrders = pgTable('supplier_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'restrict' }),
  firebaseId: text('firebase_id'),
  fournisseur: text('fournisseur'),
  montantTotal: numeric('montant_total', { precision: 15, scale: 2 }),
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

// ✅ Relational items table — replaces deprecated JSON items column
export const supplierOrderItems = pgTable('supplier_order_items', {
  id:        serial('id').primaryKey(),       // (internal item id remains serial)
  orderId:   uuid('order_id').notNull()
             .references(() => supplierOrders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  reference: varchar('reference', { length: 100 }),
  label:     varchar('label',     { length: 255 }).notNull(),
  quantity:  integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  qtyReceived: integer('qty_received').default(0).notNull(),
  total:     numeric('total',      { precision: 15, scale: 2 }).notNull(),
});

// 3. SUPPLIER PAYMENTS
export const supplierPayments = pgTable('supplier_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  orderId: uuid('order_id').references(() => supplierOrders.id, { onDelete: 'set null' }),
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
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  paymentId: uuid('payment_id').references(() => supplierPayments.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => supplierOrders.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// RELATIONS
// ========================================

// Relations moved to main schema.ts / relations.ts to avoid circularity with lensOrders

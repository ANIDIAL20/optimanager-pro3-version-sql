import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
import { clients } from './clients';
import { products } from './products';
import { users } from './auth-core';
// ========================================
// 3. SALES TABLE
// ========================================
// ========================================
// 3. SALES TABLE
// ========================================
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  saleNumber: text('sale_number'), // Internal Ref / Display Ref
  transactionNumber: text('transaction_number'), // 🆕 Official Fiscal Number (Unique Sequence)

  // Client info
  clientId: integer('client_id').references(() => clients.id),
  clientName: text('client_name'),
  clientPhone: text('client_phone'),
  clientMutuelle: text('client_mutuelle'),
  clientAddress: text('client_address'),

  // Financial
  totalHT: decimal('total_ht', { precision: 10, scale: 2 }),
  totalTVA: decimal('total_tva', { precision: 10, scale: 2 }),
  totalTTC: decimal('total_ttc', { precision: 10, scale: 2 }).notNull(),
  totalNet: decimal('total_net', { precision: 10, scale: 2 }),
  totalPaye: decimal('total_paye', { precision: 10, scale: 2 }).default('0'),
  resteAPayer: decimal('reste_a_payer', { precision: 10, scale: 2 }),

  // Status
  status: text('status').$type<'impaye' | 'partiel' | 'paye' | 'brouillon' | 'annule'>().default('impaye'),
  deliveryStatus: text('delivery_status').$type<'en_attente' | 'en_cours' | 'pret' | 'livre'>().default('en_attente'),
  paymentMethod: text('payment_method'),
  type: text('type').$type<'INVOICE' | 'QUOTE' | 'COMMANDE' | 'VENTE'>().default('VENTE'),

  isDeclared: boolean('is_declared').default(false), // 🆕 Dual-Mode Logic
  isOfficialInvoice: boolean('is_official_invoice').notNull().default(true), // 🆕 Official Invoice Flag
  comptabiliteStatus: text('comptabilite_status').$type<'PENDING' | 'POSTED' | 'EXCLUDED'>().notNull().default('PENDING'), // 🆕 Accounting Status

  // Complex data (stored as JSON)
  items: json('items').$type<any[]>().notNull(), // Legacy/Denormalized Fallback
  paymentHistory: json('payment_history').$type<any[]>(),
  prescriptionSnapshot: json('prescription_snapshot'),
  lastPaymentDate: timestamp('last_payment_date'),

  // 🆕 Document Customization Snapshot
  templateVersionUsed: integer('template_version_used'),

  templateSnapshot: jsonb('template_snapshot'),
  // 🆕 Document Customization Snapshot (User Requested)
  documentSettingsSnapshot: jsonb('document_settings_snapshot'),

  notes: text('notes'),
  date: timestamp('date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('sales_user_id_idx').on(table.userId),
  saleNumberIdx: index('sales_sale_number_idx').on(table.saleNumber),
  transactionNumberIdx: index('sales_transaction_number_idx').on(table.transactionNumber),
  clientIdIdx: index('sales_client_id_idx').on(table.clientId),
  idx_sales_user_date: index('idx_sales_user_date').on(table.userId, table.createdAt),
  uniqueSaleNumber: uniqueIndex('idx_sales_unique_number').on(table.userId, table.saleNumber),
  // Fiscal number should be explicitly unique per user (or global if single fiscal entity, but here multi-tenant)
  uniqueTransactionNumber: uniqueIndex('idx_sales_unique_transaction').on(table.userId, table.transactionNumber),
}));

// ========================================
// 3b. SALE ITEMS (Normalized)
// ========================================
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id),

  // Snapshots from Product (Historical Invariance)
  brand: text('brand'),
  category: text('category'),
  productType: text('product_type').$type<'frame' | 'lens' | 'contact_lens' | 'accessory' | 'service'>(),

  // Label on document
  label: text('label').notNull(),

  // Quantities
  qty: integer('qty').notNull().default(1),

  // Financial Snapshot (Unit)
  unitPriceHT: decimal('unit_price_ht', { precision: 10, scale: 2 }).notNull().default('0'),
  unitPriceTVA: decimal('unit_price_tva', { precision: 10, scale: 2 }).notNull().default('0'),
  unitPriceTTC: decimal('unit_price_ttc', { precision: 10, scale: 2 }).notNull().default('0'),
  tvaRate: decimal('tva_rate', { precision: 5, scale: 2 }).notNull().default('20'),

  // Financial Totals (Line)
  lineTotalHT: decimal('line_total_ht', { precision: 10, scale: 2 }).notNull().default('0'),
  lineTotalTVA: decimal('line_total_tva', { precision: 10, scale: 2 }).notNull().default('0'),
  lineTotalTTC: decimal('line_total_ttc', { precision: 10, scale: 2 }).notNull().default('0'),

  // Metadata
  isDiscountLine: boolean('is_discount_line').default(false),
  metadata: json('metadata'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  saleIdIdx: index('sale_items_sale_id_idx').on(table.saleId),
  productIdIdx: index('sale_items_product_id_idx').on(table.productId),
}));

// ========================================
// 3c. LENS DETAILS (Per Eye)
// ========================================
export const saleLensDetails = pgTable('sale_lens_details', {
  id: serial('id').primaryKey(),
  saleItemId: integer('sale_item_id').notNull().references(() => saleItems.id, { onDelete: 'cascade' }),

  eye: text('eye').$type<'OD' | 'OG'>().notNull(),

  // Optical Params
  sphere: text('sphere'),
  cylinder: text('cylinder'),
  axis: text('axis'),
  addition: text('addition'),
  index: text('index'),
  diameter: text('diameter'),
  material: text('material'),
  treatment: text('treatment'),
  lensType: text('lens_type'), // 'single_vision', 'progressive'
  baseCurve: text('base_curve'),
  prism: text('prism'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  saleLensDetailsItemIdIdx: index('sale_lens_details_item_id_idx').on(table.saleItemId),
}));

// ========================================
// 3d. CONTACT LENS DETAILS
// ========================================
export const saleContactLensDetails = pgTable('sale_contact_lens_details', {
  id: serial('id').primaryKey(),
  saleItemId: integer('sale_item_id').notNull().references(() => saleItems.id, { onDelete: 'cascade' }),

  eye: text('eye').$type<'OD' | 'OG' | 'BOTH'>().notNull(),

  // Params
  power: text('power'),
  baseCurve: text('base_curve'),
  diameter: text('diameter'),
  duration: text('duration'), // 'daily', 'monthly'
  cylinder: text('cylinder'), // Toric params
  axis: text('axis'),
  addition: text('addition'), // Multifocal

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  saleContactItemIdIdx: index('sale_contact_lens_details_item_id_idx').on(table.saleItemId),
}));

// ========================================
// 4. DEVIS TABLE
// ========================================
export const devis = pgTable('devis', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),

  // Client
  clientId: integer('client_id').references(() => clients.id),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone'),

  // Items (JSON array)
  items: json('items').$type<any[]>().notNull(),

  // Totals
  totalHT: decimal('total_ht', { precision: 10, scale: 2 }).notNull(),
  totalTTC: decimal('total_ttc', { precision: 10, scale: 2 }).notNull(),

  // Status
  status: text('status').default('EN_ATTENTE'), // EN_ATTENTE, VALIDE, REFUSE, TRANSFORME
  saleId: integer('sale_id').references(() => sales.id),
  validUntil: timestamp('valid_until'), // 🆕 Added field
  
  // 🆕 Document Customization Snapshot
  templateVersionUsed: integer('template_version_used'),
  templateSnapshot: jsonb('template_snapshot'),
  documentSettingsSnapshot: jsonb('document_settings_snapshot'),


  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 4b. RESERVATIONS TABLE
// ========================================
export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),

  // Client info
  clientId: integer('client_id').references(() => clients.id),
  clientName: text('client_name').notNull(),

  // Items 
  items: json('items').$type<any[]>().notNull(), // ReservationItem[]

  // Financial
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }).default('0'),
  remainingAmount: decimal('remaining_amount', { precision: 10, scale: 2 }),

  // Status & Metadata
  status: text('status').default('PENDING'), // PENDING, CONFIRMED, COMPLETED, CANCELLED, EXPIRED
  notes: text('notes'),

  // Link to Sale (when converted)
  saleId: integer('sale_id').references(() => sales.id),

  // Expiry
  expiryDate: timestamp('expiry_date'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('reservations_user_id_idx').on(table.userId),
  clientIdIdx: index('reservations_client_id_idx').on(table.clientId),
  statusIdx: index('reservations_status_idx').on(table.status),
}));

export const frameReservations = pgTable('frame_reservations', {
  id: serial('id').primaryKey(),

  // Note: storeId references users.id as 'stores' table doesn't exist in this project
  storeId: text('store_id').notNull().references(() => users.id),
  clientId: integer('client_id').notNull().references(() => clients.id),
  clientName: text('client_name').notNull(),

  status: text('status')
    .$type<'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'>()
    .notNull()
    .default('PENDING'),

  items: json('items').$type<{
    productId: number;
    productName: string;
    reference: string | null;
    quantity: number;
    unitPrice: number;
  }[]>().notNull(),

  reservationDate: timestamp('reservation_date', { mode: 'date' })
    .notNull()
    .defaultNow(),

  expiryDate: timestamp('expiry_date', { mode: 'date' }).notNull(),
  
  // Financial info 🆕
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).default('0'),
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }).default('0'),
  remainingAmount: decimal('remaining_amount', { precision: 10, scale: 2 }).default('0'),

  completedAt: timestamp('completed_at', { mode: 'date' }),

  saleId: integer('sale_id').references(() => sales.id),

  notes: text('notes'),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});


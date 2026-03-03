import {
    pgTable,
    serial,
    text,
    timestamp,
    numeric,
    integer,
    boolean,
    uuid,
    json,
    index,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// 1. market_supplier_profiles
//    Extends `users` (role: SUPPLIER) with business-specific fields.
// ─────────────────────────────────────────────────────────────────────────────
export const marketSupplierProfiles = pgTable('market_supplier_profiles', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().unique(), // FK → users.id (1:1)

    // Company info
    companyName: text('company_name').notNull(),
    logoUrl: text('logo_url'),
    description: text('description'),

    // Contact
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    city: text('city'),

    // Legal / Financial
    ice: text('ice'),
    rc: text('rc'),
    rib: text('rib'),

    // Commercial terms
    paymentTerms: text('payment_terms').default('30'), // jours
    minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }).default('0'),
    shippingInfo: text('shipping_info'),

    // Lifecycle
    status: text('status', { enum: ['PENDING', 'APPROVED', 'SUSPENDED'] })
        .default('PENDING')
        .notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: text('verified_by'), // FK → users.id (admin)

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
    userIdIdx: index('msp_user_id_idx').on(t.userId),
    statusIdx: index('msp_status_idx').on(t.status),
}));

export type MarketSupplierProfile = typeof marketSupplierProfiles.$inferSelect;
export type NewMarketSupplierProfile = typeof marketSupplierProfiles.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 2. market_categories
//    Global product categories managed by platform admin.
// ─────────────────────────────────────────────────────────────────────────────
export const marketCategories = pgTable('market_categories', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    nameAr: text('name_ar'),
    slug: text('slug').notNull().unique(),
    icon: text('icon'), // Lucide icon name
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type MarketCategory = typeof marketCategories.$inferSelect;
export type NewMarketCategory = typeof marketCategories.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 3. market_products
//    The shared catalog: suppliers publish here, opticians browse.
// ─────────────────────────────────────────────────────────────────────────────
export const marketProducts = pgTable('market_products', {
    id: uuid('id').defaultRandom().primaryKey(),
    supplierId: uuid('supplier_id').notNull(), // FK → market_supplier_profiles.id
    categoryId: integer('category_id'),        // FK → market_categories.id

    // Identification
    name: text('name').notNull(),
    description: text('description'),
    reference: text('reference'), // Supplier's internal ref/SKU
    brand: text('brand'),

    // Classification
    type: text('type', {
        enum: ['MONTURE', 'VERRE', 'LENTILLE', 'ACCESSOIRE', 'AUTRE'],
    }).default('AUTRE').notNull(),
    material: text('material'),
    color: text('color'),

    // Pricing
    unitPriceHt: numeric('unit_price_ht', { precision: 10, scale: 2 }).notNull(),
    tvaRate: numeric('tva_rate', { precision: 5, scale: 2 }).default('20'),
    unitPriceTtc: numeric('unit_price_ttc', { precision: 10, scale: 2 }),

    // Stock
    stockQuantity: integer('stock_quantity').default(0).notNull(),
    reservedQuantity: integer('reserved_quantity').default(0).notNull(),
    minOrderQty: integer('min_order_qty').default(1).notNull(),

    // Visibility
    isActive: boolean('is_active').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    status: text('status', {
        enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'],
    }).default('DRAFT').notNull(),

    // Extra
    tags: text('tags').array(),
    specs: json('specs'), // Free-form technical specs JSON

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
    supplierIdx: index('mp_supplier_id_idx').on(t.supplierId),
    categoryIdx: index('mp_category_id_idx').on(t.categoryId),
    statusIdx: index('mp_status_idx').on(t.status),
    typeIdx: index('mp_type_idx').on(t.type),
    brandIdx: index('mp_brand_idx').on(t.brand),
}));

export type MarketProduct = typeof marketProducts.$inferSelect;
export type NewMarketProduct = typeof marketProducts.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 4. market_product_images
//    Multiple images per product (stored via UploadThing).
// ─────────────────────────────────────────────────────────────────────────────
export const marketProductImages = pgTable('market_product_images', {
    id: serial('id').primaryKey(),
    productId: uuid('product_id').notNull(), // FK → market_products.id
    url: text('url').notNull(),
    altText: text('alt_text'),
    sortOrder: integer('sort_order').default(0),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    productIdx: index('mpi_product_id_idx').on(t.productId),
}));

export type MarketProductImage = typeof marketProductImages.$inferSelect;
export type NewMarketProductImage = typeof marketProductImages.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 5. market_orders
//    B2B orders placed by an optician to a supplier via OptiMarket.
// ─────────────────────────────────────────────────────────────────────────────
export const marketOrders = pgTable('market_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: text('order_number').notNull().unique(), // e.g. MKT-2026-00042

    // Parties
    opticianId: text('optician_id').notNull(), // FK → users.id
    supplierId: uuid('supplier_id').notNull(), // FK → market_supplier_profiles.id

    // ERP link — auto-created when order is confirmed
    erpOrderId: integer('erp_order_id'), // FK → supplier_orders.id

    // Lifecycle
    status: text('status', {
        enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    }).default('PENDING').notNull(),

    // Financials
    subTotalHt: numeric('sub_total_ht', { precision: 10, scale: 2 }).notNull(),
    tvaAmount: numeric('tva_amount', { precision: 10, scale: 2 }).default('0'),
    shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).default('0'),
    totalTtc: numeric('total_ttc', { precision: 10, scale: 2 }).notNull(),

    // Payment
    paymentMethod: text('payment_method', {
        enum: ['CREDIT', 'VIREMENT', 'CHEQUE', 'ESPECES'],
    }).default('CREDIT'),
    paymentStatus: text('payment_status', {
        enum: ['UNPAID', 'PARTIAL', 'PAID'],
    }).default('UNPAID').notNull(),
    amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0'),

    // Delivery
    shippingAddress: text('shipping_address'),
    expectedDelivery: timestamp('expected_delivery'),

    // Notes
    notes: text('notes'),

    // Timestamps for each status change
    confirmedAt: timestamp('confirmed_at'),
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
    cancelledAt: timestamp('cancelled_at'),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
    opticianIdx: index('mo_optician_id_idx').on(t.opticianId),
    supplierIdx: index('mo_supplier_id_idx').on(t.supplierId),
    statusIdx: index('mo_status_idx').on(t.status),
    orderNumberIdx: uniqueIndex('mo_order_number_idx').on(t.orderNumber),
}));

export type MarketOrder = typeof marketOrders.$inferSelect;
export type NewMarketOrder = typeof marketOrders.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 6. market_order_items
//    Line items for each market order.
// ─────────────────────────────────────────────────────────────────────────────
export const marketOrderItems = pgTable('market_order_items', {
    id: serial('id').primaryKey(),
    orderId: uuid('order_id').notNull(),   // FK → market_orders.id
    productId: uuid('product_id').notNull(), // FK → market_products.id

    // Snapshot of product at the time of order (prices/name may change later)
    productSnapshot: json('product_snapshot').notNull(),

    // Quantities
    quantity: integer('quantity').notNull(),
    receivedQuantity: integer('received_quantity').default(0).notNull(),

    // Pricing (locked at order time)
    unitPriceHt: numeric('unit_price_ht', { precision: 10, scale: 2 }).notNull(),
    totalPriceHt: numeric('total_price_ht', { precision: 10, scale: 2 }).notNull(),

    // ERP stock sync
    erpProductId: integer('erp_product_id'), // FK → products.id (in optician's stock)
    stockSynced: boolean('stock_synced').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    orderIdx: index('moi_order_id_idx').on(t.orderId),
    productIdx: index('moi_product_id_idx').on(t.productId),
}));

export type MarketOrderItem = typeof marketOrderItems.$inferSelect;
export type NewMarketOrderItem = typeof marketOrderItems.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 7. market_order_messages
//    Per-order messaging thread between optician and supplier.
// ─────────────────────────────────────────────────────────────────────────────
export const marketOrderMessages = pgTable('market_order_messages', {
    id: serial('id').primaryKey(),
    orderId: uuid('order_id').notNull(), // FK → market_orders.id
    senderId: text('sender_id').notNull(), // FK → users.id
    senderRole: text('sender_role', { enum: ['OPTICIAN', 'SUPPLIER', 'ADMIN'] }).notNull(),

    content: text('content').notNull(),
    attachmentUrl: text('attachment_url'),

    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    orderIdx: index('mom_order_id_idx').on(t.orderId),
    senderIdx: index('mom_sender_id_idx').on(t.senderId),
}));

export type MarketOrderMessage = typeof marketOrderMessages.$inferSelect;
export type NewMarketOrderMessage = typeof marketOrderMessages.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 8. market_credit_accounts
//    Credit relationship between a supplier and a specific optician.
//    Each pair (supplier, optician) has exactly ONE credit account.
// ─────────────────────────────────────────────────────────────────────────────
export const marketCreditAccounts = pgTable('market_credit_accounts', {
    id: serial('id').primaryKey(),
    supplierId: uuid('supplier_id').notNull(), // FK → market_supplier_profiles.id
    opticianId: text('optician_id').notNull(), // FK → users.id

    creditLimit: numeric('credit_limit', { precision: 10, scale: 2 }).default('0').notNull(),
    currentBalance: numeric('current_balance', { precision: 10, scale: 2 }).default('0').notNull(), // debt
    // availableCredit = creditLimit - currentBalance (computed in app)

    paymentTerms: text('payment_terms'), // overrides supplier default if set
    isBlocked: boolean('is_blocked').default(false).notNull(),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
    // One account per supplier-optician pair
    uniquePair: uniqueIndex('mca_supplier_optician_idx').on(t.supplierId, t.opticianId),
    supplierIdx: index('mca_supplier_id_idx').on(t.supplierId),
    opticianIdx: index('mca_optician_id_idx').on(t.opticianId),
}));

export type MarketCreditAccount = typeof marketCreditAccounts.$inferSelect;
export type NewMarketCreditAccount = typeof marketCreditAccounts.$inferInsert;

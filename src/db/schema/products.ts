import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
// ========================================
// 2. PRODUCTS TABLE
// ========================================
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(), // Store owner
  clientId: integer('client_id'),   // 🔖 BUG-3 FIX: links VERRE product to its specific client

  // Product info
  reference: text('reference'),
  nom: text('nom').notNull(),
  designation: text('designation'),
  categorie: text('categorie'),
  marque: text('marque'),
  modele: text('modele'), // Model number/name
  couleur: text('couleur'), // Color (Legacy)
  matiereId: integer('matiere_id').references(() => materials.id),
  couleurId: integer('couleur_id').references(() => colors.id),
  fournisseur: text('fournisseur'),

  // Pricing
  prixAchat: decimal('prix_achat', { precision: 10, scale: 2 }),
  prixVente: decimal('prix_vente', { precision: 10, scale: 2 }).notNull(),
  prixGros: decimal('prix_gros', { precision: 10, scale: 2 }),

  // ✅ SMART TVA SYSTEM
  hasTva: boolean('has_tva').default(true),
  priceType: text('price_type').$type<'HT' | 'TTC'>().default('TTC'),
  salePriceHT: decimal('sale_price_ht', { precision: 10, scale: 2 }),
  salePriceTVA: decimal('sale_price_tva', { precision: 10, scale: 2 }),
  salePriceTTC: decimal('sale_price_ttc', { precision: 10, scale: 2 }),
  exemptionNote: text('exemption_note'),

  // Stock
  quantiteStock: integer('quantite_stock').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  seuilAlerte: integer('seuil_alerte').default(5),

  // Type of product
  type: text('type').$type<'MONTURE' | 'VERRE' | 'ACCESSOIRE' | 'AUTRE'>().notNull().default('AUTRE'),

  // Metadata
  description: text('description'),
  details: text('details'), // Simple string storage inherited from legacy structure
  isActive: boolean('is_active').default(true),
  version: integer('version').default(0).notNull(), // 🆕 Optimistic Locking
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
  deletedAt: timestamp('deleted_at'), // 🆕 Soft Delete

  // 🆕 New Architecture Fields (Part 1 Implementation)
  brand: text('brand'),
  category: text('category').default('OPTIQUE'),
  productType: text('product_type').$type<'frame' | 'lens' | 'contact_lens' | 'accessory' | 'service'>().default('accessory'),
  tvaRate: decimal('tva_rate', { precision: 5, scale: 2 }).default('20.00'),
  isMedical: boolean('is_medical').default(false),
  isStockManaged: boolean('is_stock_managed').default(true),
}, (table) => ({
  userIdIdx: index('products_user_id_idx').on(table.userId),
  referenceIdx: index('products_reference_idx').on(table.reference),
  nomIdx: index('products_nom_idx').on(table.nom),
  idx_products_user_marque: index('idx_products_user_marque').on(table.userId, table.marque), // Legacy ID index
  searchIdx: index('products_search_idx').on(table.marque, table.fournisseur),

  // 🆕 Optimizations
  brandIdx: index('idx_products_brand').on(table.brand),
  productTypeIdx: index('idx_products_type').on(table.productType),
  // 🔒 BUG-2 FIX: Unique (reference, userId) prevents duplicate VERRE- on retry/double-click
  // uniqueReferencePerUser: uniqueIndex('unique_product_reference_user').on(table.reference, table.userId),
  idx_products_not_deleted: index('idx_products_not_deleted').on(table.userId, table.deletedAt),
  idx_products_category: index('idx_products_category').on(table.category),
  idx_products_client: index('idx_products_client').on(table.clientId), // 🔖 BUG-3
}));

// ========================================
// 2b. INVOICE IMPORTS (Idempotency & Tracking)
// ========================================
export const invoiceImports = pgTable('invoice_imports', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  supplierId: text('supplier_id'),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: timestamp('invoice_date'),

  status: text('status').default('completed'), // 'completed', 'reverted'
  totalItems: integer('total_items'),

  revertedAt: timestamp('reverted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userInvoiceIdx: index('idx_user_invoice').on(table.userId, table.invoiceNumber),
  uniqueImport: uniqueIndex('idx_unique_import').on(
    table.userId,
    table.supplierId,
    table.invoiceNumber,
    table.invoiceDate
  ),
}));

// ========================================
// 4. REFERENCE TABLES (SETTINGS)
// ========================================
export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category'), // Preserve existing data
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const colors = pgTable('colors', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  code: text('code'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const treatments = pgTable('treatments', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  price: decimal('price', { precision: 10, scale: 2 }).default('0'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const mountingTypes = pgTable('mounting_types', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const banks = pgTable('banks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  rib: text('rib'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const insurances = pgTable('insurances', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});


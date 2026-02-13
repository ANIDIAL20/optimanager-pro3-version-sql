import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';

// ========================================
// 1. CLIENTS TABLE (Déjà migré)
// ========================================
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(), // ⚠️ CRITICAL: Store owner
  
  // Full name (kept for backwards compatibility)
  fullName: text('full_name').notNull(),
  
  // 🆕 Separate name fields
  prenom: text('prenom'),
  nom: text('nom'),
  
  // Contact info
  email: text('email'),
  phone: text('phone'),
  phone2: text('phone_2'), // Optional secondary phone
  address: text('address'),
  city: text('city'),
  
  // 🆕 Personal info
  gender: text('gender'), // 'Homme' | 'Femme'
  cin: text('cin'), // ID card number
  dateOfBirth: timestamp('date_of_birth'),
  mutuelle: text('mutuelle'), // Insurance/Mutuelle
  
  notes: text('notes'),
  
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).default('5000'), // 🆕 Max credit allowed
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0'),
  
  isActive: boolean('is_active').default(true),
  lastVisit: timestamp('last_visit'), // Legacy field preserved for safety
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('clients_user_id_idx').on(table.userId),
  fullNameIdx: index('clients_full_name_idx').on(table.fullName),
  phoneIdx: index('clients_phone_idx').on(table.phone),
  // ✅ GIN index for full-text search (Requires raw SQL usually, or custom in Drizzle)
  // We'll add standard index for now, GIN often needs a database migration script
  idx_clients_fullname_search: index('idx_clients_fullname_search').on(table.fullName),
}));

// ✅ NEW: Client Interactions (Timeline/Chat History)
export const clientInteractions = pgTable('client_interactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  
  type: text('type').notNull().default('note'), // 'note', 'call', 'visit', 'whatsapp'
  content: text('content').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('interactions_user_id_idx').on(table.userId),
  clientIdIdx: index('interactions_client_id_idx').on(table.clientId),
}));

export const clientInteractionsRelations = relations(clientInteractions, ({ one }) => ({
  client: one(clients, {
    fields: [clientInteractions.clientId],
    references: [clients.id],
  }),
}));

// ========================================
// 2. PRODUCTS TABLE
// ========================================
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(), // Store owner
  
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
}, (table) => ({
  userIdIdx: index('products_user_id_idx').on(table.userId),
  referenceIdx: index('products_reference_idx').on(table.reference),
  nomIdx: index('products_nom_idx').on(table.nom),
  idx_products_user_marque: index('idx_products_user_marque').on(table.userId, table.marque), // ✅ Composite
  searchIdx: index('products_search_idx').on(table.marque, table.fournisseur),
  // unique_user_reference: uniqueIndex('idx_unique_user_reference').on(table.userId, table.reference),
  idx_products_not_deleted: index('idx_products_not_deleted').on(table.userId, table.deletedAt), // ✅ Performance for soft delete
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
// 3. SALES TABLE
// ========================================
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  saleNumber: text('sale_number'), // 🆕 Added field
  
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
  status: text('status').default('impaye'), // impaye, partiel, paye
  paymentMethod: text('payment_method'),
  type: text('type'), // 'commande', 'vente', etc.
  
  // Complex data (stored as JSON)
  items: json('items').$type<any[]>().notNull(),
  paymentHistory: json('payment_history').$type<any[]>(),
  prescriptionSnapshot: json('prescription_snapshot'),
  lastPaymentDate: timestamp('last_payment_date'), // Preserve legacy field for safety
  
  notes: text('notes'),
  date: timestamp('date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('sales_user_id_idx').on(table.userId),
  saleNumberIdx: index('sales_sale_number_idx').on(table.saleNumber),
  clientIdIdx: index('sales_client_id_idx').on(table.clientId),
  idx_sales_user_date: index('idx_sales_user_date').on(table.userId, table.createdAt), // ✅ Composite
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

// ========================================

// ========================================
// 6. STOCK MOVEMENTS TABLE
// ========================================
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  // Product reference (keep both for migration)
  produitId: text('produit_id'), // Firebase product ID
  productId: integer('product_id').references(() => products.id),
  
  // Movement details
  quantite: integer('quantite').notNull(), // Negative for sales, positive for purchases
  type: text('type').notNull(), // 'Vente', 'Achat', 'Ajustement', 'Retour'
  ref: text('ref'), // Reference to sale/order ID
  
  date: timestamp('date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// 7. SETTINGS TABLE
// ========================================
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  settingKey: text('setting_key').notNull(), // 'shop', 'global_banner', etc.
  
  // Store as JSON for flexibility
  value: json('value').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 7b. SHOP PROFILES TABLE
// ========================================
export const shopProfiles = pgTable('shop_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  
  shopName: text('shop_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  ice: text('ice'),
  rib: text('rib'),
  logoUrl: text('logo_url'),
  
  // Missing columns restored to prevent data loss
  paymentMethods: text('payment_methods'),
  rc: text('rc'),
  if: text('if'),
  patente: text('patente'),
  tvaRate: text('tva_rate'),
  paymentTerms: text('payment_terms'),
  
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 8. LEGACY PRESCRIPTIONS TABLE
// ========================================
export const prescriptionsLegacy = pgTable('prescriptions_legacy', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  // Client reference
  clientId: integer('client_id').references(() => clients.id),
  
  // Prescription data (store full prescription as JSON)
  prescriptionData: json('prescription_data').notNull(),
  
  // Metadata
  date: timestamp('date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 9. CONTACT LENS PRESCRIPTIONS TABLE
// ========================================
export const contactLensPrescriptions = pgTable('contact_lens_prescriptions', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  // Client reference
  clientId: integer('client_id').references(() => clients.id),
  
  // Contact lens prescription data (store as JSON)
  prescriptionData: json('prescription_data').notNull(),
  
  // Metadata
  date: timestamp('date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 10. LENS ORDERS TABLE
// ========================================
export const lensOrders = pgTable('lens_orders', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  // References
  clientId: integer('client_id').references(() => clients.id),
  prescriptionId: integer('prescription_id').references(() => prescriptionsLegacy.id),
  saleId: integer('sale_id').references(() => sales.id), // Link to the sale when billed
  
  // Order details
  orderType: text('order_type').notNull(), // 'progressive', 'bifocal', 'unifocal', 'contact'
  lensType: text('lens_type').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierOrderId: integer('supplier_order_id').references(() => supplierOrders.id),
  treatment: text('treatment'),
  supplierName: text('supplier_name').notNull(),
  
  // Explicit Prescription Details (Replacing JSON)
  sphereR: text('sphere_r'),
  cylindreR: text('cylindre_r'),
  axeR: text('axe_r'),
  additionR: text('addition_r'),
  hauteurR: text('hauteur_r'),
  
  sphereL: text('sphere_l'),
  cylindreL: text('cylindre_l'),
  axeL: text('axe_l'),
  additionL: text('addition_l'),
  hauteurL: text('hauteur_l'),
  
  // Keep legacy JSON fields to prevent data loss 🛡️
  rightEye: json('right_eye'),
  leftEye: json('left_eye'),
  
  matiere: text('matiere'),
  indice: text('indice'),
  
  // ========================================
  // PROFESSIONAL PRICING WORKFLOW
  // ========================================
  
  // Prix de Vente Client (fixé à la commande - OBLIGATOIRE)
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Prix d'Achat Estimé (depuis catalogue - optionnel à la commande)
  estimatedBuyingPrice: decimal('estimated_buying_price', { precision: 10, scale: 2 }),
  
  // Prix d'Achat Final (validé à la réception du BL)
  finalBuyingPrice: decimal('final_buying_price', { precision: 10, scale: 2 }),
  
  // Référence BL/Facture Fournisseur
  supplierInvoiceRef: text('supplier_invoice_ref'),
  
  // Marges calculées
  estimatedMargin: decimal('estimated_margin', { precision: 10, scale: 2 }), // sellingPrice - estimatedBuyingPrice
  finalMargin: decimal('final_margin', { precision: 10, scale: 2 }),         // sellingPrice - finalBuyingPrice
  
  // Legacy pricing (kept for backwards compatibility)
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  
  // Status tracking
  status: text('status').default('pending').notNull(), // 'pending', 'ordered', 'received', 'delivered'
  orderDate: timestamp('order_date').defaultNow(),
  receivedDate: timestamp('received_date'),
  deliveredDate: timestamp('delivered_date'),
  
  // Additional info
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('lens_orders_user_id_idx').on(table.userId),
  clientIdIdx: index('lens_orders_client_id_idx').on(table.clientId),
  saleIdIdx: index('lens_orders_sale_id_idx').on(table.saleId),
  supplierIdIdx: index('lens_orders_supplier_id_idx').on(table.supplierId),
  sphereRIdx: index('lens_orders_sphere_r_idx').on(table.sphereR),
  sphereLIdx: index('lens_orders_sphere_l_idx').on(table.sphereL),
  // ✅ Partial index for pending orders
  idx_lens_orders_pending: index('idx_lens_orders_pending')
    .on(table.userId, table.createdAt)
    .where(sql`status = 'pending'`),
}));

// ========================================
// RELATIONS (for Drizzle Relational Queries)
// ========================================

export const clientsRelations = relations(clients, ({ many }) => ({
  prescriptionsLegacy: many(prescriptionsLegacy),
  prescriptions: many(prescriptions),
  contactLensPrescriptions: many(contactLensPrescriptions),
  lensOrders: many(lensOrders),
  sales: many(sales),
  devis: many(devis),
  reservations: many(reservations),
}));

export const prescriptionsLegacyRelations = relations(prescriptionsLegacy, ({ one, many }) => ({
  client: one(clients, {
    fields: [prescriptionsLegacy.clientId],
    references: [clients.id],
  }),
  lensOrders: many(lensOrders),
}));

export const contactLensPrescriptionsRelations = relations(contactLensPrescriptions, ({ one }) => ({
  client: one(clients, {
    fields: [contactLensPrescriptions.clientId],
    references: [clients.id],
  }),
}));

export const lensOrdersRelations = relations(lensOrders, ({ one }) => ({
  client: one(clients, {
    fields: [lensOrders.clientId],
    references: [clients.id],
  }),
  prescriptionLegacy: one(prescriptionsLegacy, {
    fields: [lensOrders.prescriptionId],
    references: [prescriptionsLegacy.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
}));

export const devisRelations = relations(devis, ({ one }) => ({
  client: one(clients, {
    fields: [devis.clientId],
    references: [clients.id],
  }),
  sale: one(sales, {
    fields: [devis.saleId],
    references: [sales.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  client: one(clients, {
    fields: [reservations.clientId],
    references: [clients.id],
  }),
  sale: one(sales, {
    fields: [reservations.saleId],
    references: [sales.id],
  }),
}));

// ========================================
// REMINDERS TABLE
// ========================================
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Data isolation
  type: text('type').notNull(), // 'cheque', 'payment', 'stock', 'order', 'appointment', 'maintenance', 'admin'
  priority: text('priority').notNull().default('normal'), // 'urgent', 'important', 'normal', 'info'
  title: text('title').notNull(),
  message: text('message'),
  status: text('status').notNull().default('pending'), // 'pending', 'read', 'completed', 'ignored'
  dueDate: timestamp('due_date'),
  relatedId: integer('related_id'), // Generic FK
  relatedType: text('related_type'), // Table name for FK
  metadata: json('metadata'), // Extra data (amount, action link, etc.)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// AUTH.JS TABLES (ENHANCED SECURITY)
// ========================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  
  // 🔐 ROLE-BASED ACCESS CONTROL
  role: text("role").$type<"ADMIN" | "USER">()
    .default("USER")
    .notNull(),
  
  // 🔐 ACCOUNT STATUS
  isActive: boolean("is_active")
    .default(true)
    .notNull(),
  
  // 🔐 ACCOUNT LOCKOUT (Native DB Anti-Brute Force)
  failedLoginAttempts: integer("failed_login_attempts")
    .default(0)
    .notNull(), // Count of consecutive failures
  lockoutUntil: timestamp("lockout_until"), // Time until unlock

  // 🛡️ QUOTAS & LIMITS
  maxProducts: integer("max_products").default(500).notNull(),
  maxClients: integer("max_clients").default(200).notNull(),
  maxSuppliers: integer("max_suppliers").default(100).notNull(),

  // 💰 SUBSCRIPTION DATES
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  subscriptionExpiry: timestamp("subscription_expiry"),

  // 💳 FINANCIAL TRACKING
  paymentMode: text("payment_mode").$type<"subscription" | "lifetime">().default("subscription"), 
  billingCycle: text("billing_cycle").$type<"monthly" | "yearly">().default("monthly"),
  agreedPrice: decimal("agreed_price", { precision: 10, scale: 2 }),
  trainingPrice: decimal("training_price", { precision: 10, scale: 2 }).default("0"),
  setupPrice: decimal("setup_price", { precision: 10, scale: 2 }).default("0"),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  installmentsCount: integer("installments_count").default(1),
  nextInstallmentDate: timestamp("next_installment_date"),
  
  // 📅 ACTIVITY TRACKING
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()).notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  
  // 🔍 SESSION SECURITY (New fields)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"), // SHA-256(IP + UA)
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

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

// ========================================
// ========================================
// 5. SUPPLIERS TABLE
// ========================================

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic Info
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  
  // Legal & Fiscal
  ice: text('ice'),
  if: text('if'),
  rc: text('rc'),
  taxId: text('tax_id'),
  
  // Financial
  category: text('category'),
  paymentTerms: text('payment_terms').default('30'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).default('0'),
  currentBalance: decimal('current_balance', { precision: 10, scale: 2 }).default('0'),
  paymentMethod: text('payment_method'),
  bank: text('bank'),
  rib: text('rib'),

  // Metadata
  notes: text('notes'),
  rating: text('rating'),
  isActive: boolean('is_active').default(true),
  status: text('status').default('Actif'),
  defaultTaxMode: text('default_tax_mode').default('HT'), // 'HT' or 'TTC'
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ========================================
// 6. SUPPLIER ORDERS TABLE
// ========================================
export const supplierOrders = pgTable('supplier_orders', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  // Identity
  orderNumber: text('order_number').unique(), // 🆕 BC-2026-XXXXXX
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  fournisseur: text('fournisseur').notNull(),
  supplierPhone: text('supplier_phone'),
  
  // Items 
  items: json('items').$type<any[]>(),
  
  // Financial
  subTotal: decimal('sub_total', { precision: 10, scale: 2 }),
  tva: decimal('tva', { precision: 10, scale: 2 }),
  discount: decimal('discount', { precision: 10, scale: 2 }),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }),
  
  montantTotal: decimal('montant_total', { precision: 10, scale: 2 }).notNull(),
  montantPaye: decimal('montant_paye', { precision: 10, scale: 2 }).default('0'),
  resteAPayer: decimal('reste_a_payer', { precision: 10, scale: 2 }),
  
  // Status
  statut: text('statut').default('pending'),
  deliveryStatus: text('delivery_status').default('pending'),
  
  // Dates
  dateCommande: timestamp('date_commande'),
  expectedDelivery: timestamp('expected_delivery'),
  dateReception: timestamp('date_reception'),
  dueDate: timestamp('due_date'),
  
  notes: text('notes'),
  orderReference: text('order_reference'),
  
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 7. SUPPLIER ORDER ITEMS
// ========================================
export const supplierOrderItems = pgTable('supplier_order_items', {
  id: serial('id').primaryKey(),
  supplierOrderId: integer('supplier_order_id').references(() => supplierOrders.id, { onDelete: 'cascade' }),
  
  productType: text('product_type'),
  productName: text('product_name'),
  description: text('description'),
  
  // Specific specs
  lensType: text('lens_type'),
  lensMaterial: text('lens_material'),
  lensIndex: text('lens_index'),
  coating: text('coating'),
  
  // Specific specs (Explicit)
  sphere: text('sphere'),
  cylindre: text('cylindre'),
  axe: text('axe'),
  addition: text('addition'),
  hauteur: text('hauteur'),
  
  quantity: integer('quantity').notNull(),
  receivedQuantity: integer('received_quantity').default(0),
  
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// 8. SUPPLIER PAYMENTS
// ========================================
export const supplierPayments = pgTable('supplier_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  paymentNumber: text('payment_number').unique(),
  
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierName: text('supplier_name').notNull(),
  
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  method: text('method').notNull(),
  
  // Details
  reference: text('reference'),
  chequeNumber: text('cheque_number'),
  bank: text('bank'),
  
  dueDate: timestamp('due_date'),
  status: text('status').default('COMPLETED'),
  
  date: timestamp('date').defaultNow(),
  notes: text('notes'),
  
  createdBy: text('created_by'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Link Payments to Orders
export const supplierOrderPayments = pgTable('supplier_order_payments', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  
  paymentId: uuid('payment_id').references(() => supplierPayments.id, { onDelete: 'cascade' }),
  orderId: integer('order_id').references(() => supplierOrders.id, { onDelete: 'cascade' }),
  
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
});












// 3. Client Transactions Ledger (Compte Client Détaillé)
export const clientTransactions = pgTable('client_transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  
  type: text('type').notNull(), // 'SALE', 'PAYMENT', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE'
  referenceId: text('reference_id'), // Sale ID, Payment Ref
  
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), 
  // Convention: 
  // + Positive = Debit (Client uses credit/buys) -> Increases Balance
  // - Negative = Credit (Client pays) -> Decreases Balance
  
  previousBalance: decimal('previous_balance', { precision: 10, scale: 2 }).notNull(),
  newBalance: decimal('new_balance', { precision: 10, scale: 2 }).notNull(),
  
  date: timestamp('date').defaultNow(),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================
// RELATIONS UPDATES
// ========================================

export const supplierPaymentsRelations = relations(supplierPayments, ({ one, many }) => ({
    supplier: one(suppliers, {
        fields: [supplierPayments.supplierId],
        references: [suppliers.id],
    }),
    allocations: many(supplierOrderPayments),
})); // End of relations

// ========================================
// 9. LEGACY TABLES (Preserved for Data Safety)
// ========================================

export const auditLog = pgTable("audit_log", {
  id: serial('id').primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  resource: text("resource"),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
  severity: text("severity").default('INFO'),
  metadata: text("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ✅ Structured Audit Logs (NEW)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  entityType: text('entity_type').notNull(), // 'sale', 'product', 'client'
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'login'
  oldValue: json('old_value'),
  newValue: json('new_value'),
  metadata: json('metadata'), // { saleNumber, totalAmount, etc }
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: serial('id').primaryKey(),
  firebaseId: text("firebase_id"),
  userId: text("user_id").notNull(),
  supplierId: uuid("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  type: text("type").notNull(),
  reference: text("reference"),
  totalAmount: decimal("total_amount", { precision: 10, scale:  2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale:  2 }).default('0'),
  status: text("status").default('UNPAID').notNull(),
  date: timestamp("date"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});


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

export const supplierOrdersRelations = relations(supplierOrders, ({ one, many }) => ({
    supplier: one(suppliers, {
        fields: [supplierOrders.supplierId],
        references: [suppliers.id],
    }),
    payments: many(supplierOrderPayments),
}));

export const clientTransactionsRelations = relations(clientTransactions, ({ one }) => ({
    client: one(clients, {
        fields: [clientTransactions.clientId],
        references: [clients.id],
    }),
}));

// ========================================
// 12. EXPENSES (CHARGES) TABLE
// ========================================
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Multi-tenancy
  
  title: text('title').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  
  // 'EAU', 'ELECTRICITE', 'LOYER', 'INTERNET', 'SALAIRE', 'AUTRE', 'IMPOT', 'TRANSPORT'
  category: text('category').notNull().default('AUTRE'), 
  
  status: text('status').default('PAYE'), // 'PAYE', 'IMPAYE'
  date: timestamp('date').defaultNow().notNull(),
  
  // Metadata
  proofUrl: text('proof_url'), // Link to receipt/invoice image
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('expenses_user_id_idx').on(table.userId),
  dateIdx: index('expenses_date_idx').on(table.date),
  categoryIdx: index('expenses_category_idx').on(table.category),
}));

// 📋 Prescriptions (Ordonnances)
export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  
  // Ordonnance metadata
  prescriptionDate: timestamp('prescription_date'),
  doctorName: text('doctor_name'),
  imageUrl: text('image_url'),
  
  // OD (Œil Droit / Right Eye)
  odSph: real('od_sph'),        // Sphere: -20.00 to +20.00
  odCyl: real('od_cyl'),        // Cylinder: -6.00 to +6.00
  odAxis: integer('od_axis'),   // Axis: 0 to 180
  odAdd: real('od_add'),        // Addition: 0 to +4.00
  
  // OS (Œil Gauche / Left Eye)
  osSph: real('os_sph'),
  osCyl: real('os_cyl'),
  osAxis: integer('os_axis'),
  osAdd: real('os_add'),
  
  // Pupillary Distance
  pd: real('pd'),               // 50-80 mm typical
  
  // Notes & Status
  notes: text('notes'),
  status: text('status').default('pending'), // pending | approved | completed
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  client: one(clients, {
    fields: [prescriptions.clientId],
    references: [clients.id],
  }),
}));

// ========================================
// 13. FRAME RESERVATIONS TABLE
// ========================================
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
  }[]>().notNull(),
  
  reservationDate: timestamp('reservation_date', { mode: 'date' })
    .notNull()
    .defaultNow(),
  
  expiryDate: timestamp('expiry_date', { mode: 'date' }).notNull(),
  
  completedAt: timestamp('completed_at', { mode: 'date' }),
  saleId: integer('sale_id').references(() => sales.id),
  
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const frameReservationsRelations = relations(frameReservations, ({ one }) => ({
  client: one(clients, {
    fields: [frameReservations.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [frameReservations.storeId],
    references: [users.id],
  }),
  sale: one(sales, {
    fields: [frameReservations.saleId],
    references: [sales.id],
  }),
}));


// ========================================
// NOTIFICATIONS TABLE
// ========================================
export * from './schema/notifications';
import { notifications } from './schema/notifications';

// ========================================
// NOTIFICATIONS RELATIONS
// ========================================
export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Types
export type Prescription = typeof prescriptions.$inferSelect;
export type PrescriptionInsert = typeof prescriptions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;


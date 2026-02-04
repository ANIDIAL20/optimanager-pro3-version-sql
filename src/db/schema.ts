import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, primaryKey, uuid } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations } from 'drizzle-orm';

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
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0'),
  
  isActive: boolean('is_active').default(true),
  
  lastVisit: timestamp('last_visit'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

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
  couleur: text('couleur'), // Color
  fournisseur: text('fournisseur'),
  
  // Pricing
  prixAchat: decimal('prix_achat', { precision: 10, scale: 2 }),
  prixVente: decimal('prix_vente', { precision: 10, scale: 2 }).notNull(),
  prixGros: decimal('prix_gros', { precision: 10, scale: 2 }),
  
  // Stock
  quantiteStock: integer('quantite_stock').default(0),
  seuilAlerte: integer('seuil_alerte').default(5),
  
  // Metadata
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

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
  
  notes: text('notes'),
  date: timestamp('date'),
  lastPaymentDate: timestamp('last_payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

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
// 5. SUPPLIER ORDERS TABLE
// ========================================
export const supplierOrders = pgTable('supplier_orders', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  
  // Supplier
  fournisseur: text('fournisseur').notNull(),
  
  // Items (JSON array)
  items: json('items').$type<any[]>().notNull(),
  
  // Financial
  montantTotal: decimal('montant_total', { precision: 10, scale: 2 }).notNull(),
  montantPaye: decimal('montant_paye', { precision: 10, scale: 2 }).default('0'),
  resteAPayer: decimal('reste_a_payer', { precision: 10, scale: 2 }),
  
  // Status
  statut: text('statut').default('EN_COURS'), // EN_COURS, REÇU, ANNULÉ
  
  // Dates
  dateCommande: timestamp('date_commande'),
  dateReception: timestamp('date_reception'),
  
  notes: text('notes'),
  dueDate: timestamp('due_date'), // Date d'échéance calculée

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

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
// 8. PRESCRIPTIONS TABLE
// ========================================
export const prescriptions = pgTable('prescriptions', {
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
  prescriptionId: integer('prescription_id').references(() => prescriptions.id),
  
  // Order details
  orderType: text('order_type').notNull(), // 'progressive', 'bifocal', 'unifocal', 'contact'
  lensType: text('lens_type').notNull(),
  treatment: text('treatment'),
  supplierName: text('supplier_name').notNull(),
  
  // Prescription details (stored as JSON if needed)
  rightEye: json('right_eye'),
  leftEye: json('left_eye'),
  
  // Pricing
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
  
  // Audit
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// RELATIONS (for Drizzle Relational Queries)
// ========================================

export const clientsRelations = relations(clients, ({ many }) => ({
  prescriptions: many(prescriptions),
  contactLensPrescriptions: many(contactLensPrescriptions),
  lensOrders: many(lensOrders),
  sales: many(sales),
  devis: many(devis),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  client: one(clients, {
    fields: [prescriptions.clientId],
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
  prescription: one(prescriptions, {
    fields: [lensOrders.prescriptionId],
    references: [prescriptions.id],
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

// ========================================
// REMINDERS TABLE (Removed duplicate)
// ========================================


// ========================================
// AUTH.JS TABLES
// ========================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: text("role").default("user"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const accounts = pgTable(
  "account",
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

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
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
// SUPPLIERS TABLE
// ========================================


export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic Info
  name: text('name').notNull(),
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
  paymentTerms: text('payment_terms'), // 'Comptant', '30 jours', etc.
  paymentMethod: text('payment_method'), // 'Virement', 'Chèque', etc.
  bank: text('bank'),
  rib: text('rib'),

  // Metadata
  notes: text('notes'),
  status: text('status').default('Actif'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ========================================
// SHOP PROFILES TABLE
// ========================================

export const shopProfiles = pgTable('shop_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(), // One profile per user
  
  // Basic info
  shopName: text('shop_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  
  // Business info
  ice: text('ice'), // Identifiant Commun de l'Entreprise (Morocco)
  rc: text('rc'), // Registre de Commerce
  if: text('if'), // Identifiant Fiscal
  patente: text('patente'), // Patente
  rib: text('rib'), // Relevé d'Identité Bancaire
  
  // VAT Settings
  tvaRate: decimal('tva_rate', { precision: 5, scale: 2 }).default('20.00'),
  
  // Payment Information
  paymentTerms: text('payment_terms'), // e.g., "Paiement comptant à réception"
  paymentMethods: json('payment_methods').$type<string[]>(), // Array of accepted payment methods
  
  // Logo (stored as base64 or URL)
  logoUrl: text('logo_url'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// SETTINGS TABLES (Generic structure)
// ========================================

// Brands (Marques)
export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category'), // Premium, Populaire, Française, Autre
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Categories (Catégories de produits)
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Materials (Matières)
export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category'), // Monture, Verre, Lentille
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Colors (Couleurs)
export const colors = pgTable('colors', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Treatments (Traitements)
export const treatments = pgTable('treatments', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Mounting Types (Types de montage)
export const mountingTypes = pgTable('mounting_types', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Banks (Banques)
export const banks = pgTable('banks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Insurances/Mutuelles (Assurances)
export const insurances = pgTable('insurances', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Reminder System (Système de Rappels)
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


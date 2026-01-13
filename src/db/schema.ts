import { pgTable, serial, text, timestamp, boolean, decimal, integer, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ========================================
// 1. CLIENTS TABLE (Déjà migré)
// ========================================
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(), // ⚠️ CRITICAL: Store owner
  
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
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
// REMINDERS TABLE (Shop Owner Feature)
// ========================================
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // 🔒 CRITICAL: Shop Owner ID (data isolation)
  
  // Basic Info
  title: text('title').notNull(),
  description: text('description'),
  reminderType: text('reminder_type').notNull(), // 'ONE_TIME', 'RECURRING', 'MANUAL'
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'COMPLETED', 'DISMISSED', 'EXPIRED'
  
  // Timing Configuration
  targetDate: timestamp('target_date').notNull(), // When the event is due
  notificationDate: timestamp('notification_date').notNull(), // When to send notification
  notificationOffsetDays: integer('notification_offset_days'), // Days before target to notify
  
  // Recurrence Configuration
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceInterval: integer('recurrence_interval'), // e.g., 1, 4, 12
  recurrenceUnit: text('recurrence_unit'), // 'DAYS', 'WEEKS', 'MONTHS', 'YEARS'
  parentReminderId: integer('parent_reminder_id'), // Points to original recurring template
  nextReminderId: integer('next_reminder_id'), // Points to next occurrence (linked list)
  
  // Polymorphic Relationship (link to any entity)
  relatedEntityType: text('related_entity_type'), // 'SUPPLIER', 'CHECK', 'CONTRACT', 'CLIENT', etc.
  relatedEntityId: text('related_entity_id'), // ID of the related entity
  
  // Notification Tracking
  notificationSent: boolean('notification_sent').notNull().default(false),
  notificationSentAt: timestamp('notification_sent_at'),
  notificationChannels: json('notification_channels').$type<string[]>(), // ['EMAIL', 'IN_APP', 'SMS']
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  completedAt: timestamp('completed_at'),
  dismissedAt: timestamp('dismissed_at'),
});

// Reminder Relations (self-referencing for linked list)
export const remindersRelations = relations(reminders, ({ one }) => ({
  parent: one(reminders, {
    fields: [reminders.parentReminderId],
    references: [reminders.id],
    relationName: 'reminder_parent',
  }),
  next: one(reminders, {
    fields: [reminders.nextReminderId],
    references: [reminders.id],
    relationName: 'reminder_next',
  }),
}));

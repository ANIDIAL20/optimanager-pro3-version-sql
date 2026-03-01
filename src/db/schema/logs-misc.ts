import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
import { users } from './auth-core';
import { products } from './products';
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


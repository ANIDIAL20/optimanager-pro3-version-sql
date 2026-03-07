import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
import { clients } from './clients';
import { sales } from './sales';
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
// 12.5 CASH SESSIONS & MOVEMENTS (CAISSE)
// ========================================
export const cashSessions = pgTable('cash_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
  openingBalance: decimal('opening_balance', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  closingBalance: decimal('closing_balance', { precision: 10, scale: 2 }),
  expectedBalance: decimal('expected_balance', { precision: 10, scale: 2 }),
  difference: decimal('difference', { precision: 10, scale: 2 }),
  status: text('status').notNull().default('open'),
  notes: text('notes'),
  closedBy: text('closed_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('cash_sessions_user_id_idx').on(table.userId),
  statusIdx: index('cash_sessions_status_idx').on(table.status),
  openedAtIdx: index('cash_sessions_opened_at_idx').on(table.openedAt),
}));

export const cashMovements = pgTable('cash_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => cashSessions.id),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  referenceId: text('reference_id'),
  referenceType: text('reference_type'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('cash_movements_user_id_idx').on(table.userId),
  sessionIdIdx: index('cash_movements_session_id_idx').on(table.sessionId),
  createdAtIdx: index('cash_movements_created_at_idx').on(table.createdAt),
}));

// ========================================
// 14. COMPTABILITE JOURNAL TABLE
// ========================================
export const comptabiliteJournal = pgTable('comptabilite_journal', {
  id: serial('id').primaryKey(),
  userId: text('user_id'), // Multi-tenancy
  saleId: integer('sale_id').references(() => sales.id, { onDelete: 'cascade' }),
  
  montantHT: decimal('montant_ht', { precision: 10, scale: 2 }).notNull(),
  tva: decimal('tva', { precision: 10, scale: 2 }).notNull(),
  montantTTC: decimal('montant_ttc', { precision: 10, scale: 2 }).notNull(),
  
  statut: text('statut').$type<'BROUILLON' | 'VALIDE' | 'CLOTURE'>().default('BROUILLON'),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  saleIdIdx: index('journal_sale_id_idx').on(table.saleId),
  userIdIdx: index('journal_user_id_idx').on(table.userId),
}));

export const purchases = pgTable("purchases", {
  id: serial('id').primaryKey(),
  firebaseId: text("firebase_id"),
  userId: text("user_id").notNull(),
  supplierId: uuid("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  type: text("type").notNull(),
  reference: text("reference"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default('0'),
  status: text("status").default('UNPAID').notNull(),
  date: timestamp("date"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});


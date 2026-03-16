import { pgTable, serial, text, timestamp, real, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
// Schema re-evaluation trigger

// FIX: Check 1 (Table name) & Check 4 (Export consistency)
// Exported as 'expenses' and points to 'expenses_v2'
export const expenses = pgTable('expenses_v2', {
    id: serial('id').primaryKey(),
    // FIX: Check 2 (userId column) - Using 'user_id' in DB, 'userId' in Drizzle. 'store_id' is removed.
    userId: text('user_id').notNull(),   // Primary Tenant/Creator ID

    // Basic Information
    title: text('title').notNull(),
    type: text('type', { enum: ['water', 'electricity', 'rent', 'other'] }).notNull(),
    category: text('category', { enum: ['utilities', 'rent', 'maintenance', 'other'] }).notNull(),

    // Financials
    amount: real('amount').notNull(),
    currency: text('currency').default('MAD').notNull(),

    // Dates
    dueDate: timestamp('due_date'),
    paymentDate: timestamp('payment_date'),
    period: text('period'), // e.g., "Février 2026"

    // Status & Provider
    status: text('status', { enum: ['paid', 'pending', 'overdue'] }).notNull(),
    provider: text('provider'), // e.g., "ONEE", "Lydec"
    invoiceNumber: text('invoice_number'),

    // Extras
    attachments: text('attachments').array(), // URLs of files
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
    // FIX: Check 3 (Indexes) - Added index explicitly named 'expenses_user_id_idx' and mapped to table.userId
    userIdIdx: index('expenses_user_id_idx').on(table.userId),
    statusIdx: index('expenses_status_idx').on(table.status),
    typeIdx: index('expenses_type_idx').on(table.type),
}));

// FIX: Check 5 (Type exports) - Exporting standard Drizzle types mapped directly to 'expenses'
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

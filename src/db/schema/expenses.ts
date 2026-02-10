import { pgTable, serial, text, timestamp, real, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const expenses = pgTable('expenses_v2', {
    id: serial('id').primaryKey(),
    storeId: text('store_id').notNull(), // Link to the shop/store
    userId: text('user_id').notNull(),   // Creator ID

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
    storeIdIdx: index('expenses_v2_store_id_idx').on(table.storeId),
    userIdIdx: index('expenses_v2_user_id_idx').on(table.userId),
    statusIdx: index('expenses_v2_status_idx').on(table.status),
    typeIdx: index('expenses_v2_type_idx').on(table.type),
}));

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

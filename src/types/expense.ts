import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { expenses } from '@/db/schema/expenses';

/**
 * Types of expenses available in the system
 */
export type ExpenseType = 'water' | 'electricity' | 'rent' | 'other';

/**
 * Status of an expense payment
 */
export type ExpenseStatus = 'paid' | 'pending' | 'overdue';

/**
 * Categories for expense classification
 */
export type ExpenseCategory = 'utilities' | 'rent' | 'maintenance' | 'other';

/**
 * Main Expense Interface (matches the database record)
 */
export type Expense = InferSelectModel<typeof expenses>;

/**
 * Data required to create a new expense
 */
export type NewExpense = InferInsertModel<typeof expenses>;

/**
 * Form data for creating or updating an expense
 * Omits system-generated fields
 */
export type ExpenseFormData = Omit<NewExpense, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'storeId'>;

/**
 * Filters for listing and searching expenses
 */
export interface ExpenseFilters {
    /** Search in title, provider, or invoice number */
    search?: string;
    /** Filter by expense type */
    type?: ExpenseType;
    /** Filter by payment status */
    status?: ExpenseStatus;
    /** Filter by category */
    category?: ExpenseCategory;
    /** Start date for filtering by dueDate or createdAt */
    startDate?: Date;
    /** End date for filtering by dueDate or createdAt */
    endDate?: Date;
    /** Filter by billing period (e.g., "Février 2026") */
    period?: string;
}

/**
 * Statistical data for the expenses dashboard
 */
export interface ExpenseStats {
    /** Total amount of all expenses in the current context */
    totalAmount: number;
    /** Total count of expenses */
    count: number;
    /** Breakdown of totals by type */
    totalsByType: Record<ExpenseType, number>;
    /** Breakdown of totals by status */
    totalsByStatus: Record<ExpenseStatus, number>;
    /** Amount currently pending payment */
    pendingAmount: number;
    /** Amount overdue */
    overdueAmount: number;
}

/**
 * Monthly comparison data for analytics
 */
export interface ComparisonData {
    currentMonth: {
        month: string;
        total: number;
    };
    previousMonth: {
        month: string;
        total: number;
    };
    percentageChange: number;
    trend: 'up' | 'down' | 'stable';
}

/**
 * Example Usage:
 * 
 * const myExpense: Expense = {
 *   id: 1,
 *   title: "Facture Lydec Mars",
 *   amount: 450.50,
 *   type: 'water',
 *   status: 'pending',
 *   // ...
 * };
 * 
 * const filters: ExpenseFilters = {
 *   status: 'pending',
 *   type: 'electricity'
 * };
 */

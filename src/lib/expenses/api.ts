'use server';

import { db } from '@/db';
import { expenses as expensesTable } from '@/db/schema/expenses';
// no cash sessions
import {
    Expense,
    ExpenseFormData,
    ExpenseFilters,
    ExpenseStats,
    ExpenseType,
    ExpenseStatus,
    ExpenseCategory,
    ComparisonData
} from '@/types/expense';
import { eq, and, or, ilike, gte, lte, desc, sql, between } from 'drizzle-orm';
import { z } from 'zod';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const expenseSchema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    amount: z.number().positive("Le montant doit être positif"),
    type: z.enum(['water', 'electricity', 'rent', 'other'] as const),
    category: z.enum(['utilities', 'rent', 'maintenance', 'other'] as const),
    currency: z.string().default('MAD'),
    dueDate: z.date().optional().nullable(),
    paymentDate: z.date().optional().nullable(),
    period: z.string().optional().nullable(),
    status: z.enum(['paid', 'pending', 'overdue'] as const),
    provider: z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
    attachments: z.array(z.string()).optional().nullable(),
    notes: z.string().optional().nullable(),
});

// ========================================
// CREATE & UPDATE
// ========================================

/**
 * Créer une nouvelle charge
 */
export const createExpense = secureAction(async (userId, user, data: ExpenseFormData) => {
    console.log(`💰 [START] Création charge pour User: ${userId}`);
    console.log('📦 Data reçue:', JSON.stringify(data, null, 2));

    try {
        console.log('🔍 Validation des données...');
        const validatedData = expenseSchema.parse(data);
        console.log('✅ Données validées:', JSON.stringify(validatedData, null, 2));

        console.log('💾 Insertion en base de données...');
        const [newExpense] = await db.insert(expensesTable).values({
            ...validatedData,
            storeId: userId, // On utilise l'ID de l'utilisateur comme ID de magasin (tenant principal)
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        // 🔥 CAISSE INTEGRATION REMOVED

        console.log(`✅ Charge créée avec ID: ${newExpense.id}`);
        await logSuccess(userId, 'CREATE', 'expenses', newExpense.id.toString(), { title: data.title });

        console.log('🔄 Revalidation du path /expenses...');
        revalidatePath('/expenses');

        return { success: true, data: newExpense };
    } catch (error: any) {
        console.error('💥 Erreur création charge:', error);
        if (error instanceof z.ZodError) {
            console.error('Validation Error Details:', error.errors);
            return { success: false, error: "Données invalides: " + error.errors.map(e => e.message).join(", ") };
        }
        await logFailure(userId, 'CREATE', 'expenses', error.message);
        return { success: false, error: error.message || 'Erreur lors de la création' };
    }
});

/**
 * Mettre à jour une charge existante
 */
export const updateExpense = secureAction(async (userId, user, id: string, data: Partial<ExpenseFormData>) => {
    console.log(`🔄 Mise à jour charge: ${id}`);

    try {
        const idNum = parseInt(id);

        const [updatedExpense] = await db.update(expensesTable)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(and(
                eq(expensesTable.id, idNum),
                eq(expensesTable.storeId, userId)
            ))
            .returning();

        if (!updatedExpense) throw new Error('Charge non trouvée');

        await logSuccess(userId, 'UPDATE', 'expenses', id, { title: updatedExpense.title });
        revalidatePath('/expenses');
        revalidatePath(`/expenses/${id}`);

        return { success: true, data: updatedExpense };
    } catch (error: any) {
        await logFailure(userId, 'UPDATE', 'expenses', error.message, id);
        return { success: false, error: error.message };
    }
});

/**
 * Marquer une charge comme payée
 */
export const markAsPaid = secureAction(async (userId, user, id: string, paymentDate: Date) => {
    return await updateExpense(id, {
        status: 'paid',
        paymentDate: paymentDate
    });
});

// ========================================
// READ
// ========================================

/**
 * Récupérer les charges avec filtres
 */
export const getExpenses = secureAction(async (userId, user, filters?: ExpenseFilters) => {
    try {
        const conditions = [eq(expensesTable.storeId, userId)];

        if (filters) {
            if (filters.search) {
                conditions.push(or(
                    ilike(expensesTable.title, `%${filters.search}%`),
                    ilike(expensesTable.provider, `%${filters.search}%`),
                    ilike(expensesTable.invoiceNumber, `%${filters.search}%`)
                ) as any);
            }
            if (filters.type) conditions.push(eq(expensesTable.type, filters.type));
            if (filters.status) conditions.push(eq(expensesTable.status, filters.status));
            if (filters.category) conditions.push(eq(expensesTable.category, filters.category));
            if (filters.period) conditions.push(eq(expensesTable.period, filters.period));

            if (filters.dateRange?.from && filters.dateRange?.to) {
                conditions.push(between(expensesTable.createdAt, filters.dateRange.from, filters.dateRange.to));
            }
        }

        const expenses = await db.select()
            .from(expensesTable)
            .where(and(...conditions))
            .orderBy(desc(expensesTable.createdAt));

        return { success: true, data: expenses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Récupérer une charge par son ID
 */
export const getExpenseById = secureAction(async (userId, user, id: string) => {
    try {
        const idNum = parseInt(id);
        const expense = await db.query.expenses.findFirst({
            where: and(
                eq(expensesTable.id, idNum),
                eq(expensesTable.storeId, userId)
            )
        });

        if (!expense) return { success: false, error: 'Non trouvé' };
        return { success: true, data: expense as Expense };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Récupérer les charges par période (mois/année)
 */
export const getExpensesByPeriod = secureAction(async (userId, user, month: number, year: number) => {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const expenses = await db.select()
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                between(expensesTable.createdAt, startDate, endDate)
            ))
            .orderBy(desc(expensesTable.createdAt));

        return { success: true, data: expenses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Récupérer les charges en attente
 */
export const getPendingExpenses = secureAction(async (userId, user) => {
    return await getExpenses({ status: 'pending' });
});

/**
 * Récupérer les charges en retard
 */
export const getOverdueExpenses = secureAction(async (userId, user) => {
    return await getExpenses({ status: 'overdue' });
});

// ========================================
// DELETE
// ========================================

/**
 * Supprimer une charge et ses fichiers attachés
 */
export const deleteExpense = secureAction(async (userId, user, id: string) => {
    try {
        const idNum = parseInt(id);

        // 1. Get the expense to check for attachments
        const expense = await db.query.expenses.findFirst({
            where: and(
                eq(expensesTable.id, idNum),
                eq(expensesTable.storeId, userId)
            )
        });

        if (!expense) throw new Error('Charge non trouvée');

        // 2. Delete from database
        await db.delete(expensesTable)
            .where(and(
                eq(expensesTable.id, idNum),
                eq(expensesTable.storeId, userId)
            ));

        // 3. Delete attachments from UploadThing if any
        if (expense.attachments && expense.attachments.length > 0) {
            try {
                // Extract keys from UploadThing URLs if possible
                const fileKeys = expense.attachments.map((url: string) => {
                    const parts = url.split('/');
                    return parts[parts.length - 1];
                });
                await utapi.deleteFiles(fileKeys);
            } catch (utError) {
                console.warn('⚠️ Échec de la suppression des fichiers UploadThing:', utError);
            }
        }

        await logSuccess(userId, 'DELETE', 'expenses', id);
        revalidatePath('/expenses');

        return { success: true, message: 'Charge supprimée avec succès' };
    } catch (error: any) {
        await logFailure(userId, 'DELETE', 'expenses', error.message, id);
        return { success: false, error: error.message };
    }
});

// ========================================
// STATS & ANALYTICS
// ========================================

/**
 * Récupérer les statistiques des charges pour un mois donné
 */
export const getExpenseStats = secureAction(async (userId, user, month: number, year: number): Promise<any> => {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);

        // 1. Total Amount & Count
        const totalStats = await db.select({
            totalAmount: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`,
            count: sql<number>`COUNT(*)`
        })
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                between(expensesTable.createdAt, startDate, endDate)
            ));

        // 2. Pending Amount
        const pendingStats = await db.select({
            amount: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`
        })
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                eq(expensesTable.status, 'pending'),
                between(expensesTable.createdAt, startDate, endDate)
            ));

        // 3. Overdue Amount
        const overdueStats = await db.select({
            amount: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`
        })
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                eq(expensesTable.status, 'overdue'),
                between(expensesTable.createdAt, startDate, endDate)
            ));

        // 4. Group by Type (for distribution by Amount)
        const typeStats = await db.select({
            type: expensesTable.type,
            amount: sql<number>`SUM(${expensesTable.amount})`
        })
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                between(expensesTable.createdAt, startDate, endDate)
            ))
            .groupBy(expensesTable.type);

        // 5. Group by Status (for distribution by Amount)
        const statusStats = await db.select({
            status: expensesTable.status,
            amount: sql<number>`SUM(${expensesTable.amount})`
        })
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                between(expensesTable.createdAt, startDate, endDate)
            ))
            .groupBy(expensesTable.status);

        // Transform results
        const totalsByType = typeStats.reduce((acc: any, curr: any) => {
            acc[curr.type] = Number(curr.amount || 0);
            return acc;
        }, {} as Record<ExpenseType, number>);

        const totalsByStatus = statusStats.reduce((acc: any, curr: any) => {
            acc[curr.status] = Number(curr.amount || 0);
            return acc;
        }, {} as Record<ExpenseStatus, number>);

        const stats: ExpenseStats = {
            totalAmount: Number(totalStats[0]?.totalAmount || 0),
            count: Number(totalStats[0]?.count || 0),
            totalsByType,
            totalsByStatus,
            pendingAmount: Number(pendingStats[0]?.amount || 0),
            overdueAmount: Number(overdueStats[0]?.amount || 0),
        };

        return { success: true, data: stats };
    } catch (error: any) {
        console.error("Error calculating expense stats:", error);
        return { success: false, error: error.message };
    }
});

/**
 * Récupérer le total par type de charge
 */
export const getTotalByType = secureAction(async (userId, user, type: ExpenseType) => {
    try {
        const result = await db.select({
            total: sql<number>`sum(${expensesTable.amount})`
        })
            .from(expensesTable)
            .where(and(
                eq(expensesTable.storeId, userId),
                eq(expensesTable.type, type)
            ));

        return { success: true, data: Number(result[0]?.total || 0) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Comparaison mensuelle des charges
 */
export const getMonthlyComparison = secureAction(async (userId, user): Promise<any> => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Get current month total
        const currentRes = await getExpenseStats(currentMonth, currentYear);
        const lastRes = await getExpenseStats(lastMonth, lastMonthYear);

        const currentTotal = currentRes.success ? (currentRes.data as ExpenseStats).totalAmount : 0;
        const lastTotal = lastRes.success ? (lastRes.data as ExpenseStats).totalAmount : 0;

        let percentageChange = 0;
        if (lastTotal > 0) {
            percentageChange = ((currentTotal - lastTotal) / lastTotal) * 100;
        }

        const comparison: ComparisonData = {
            currentMonth: {
                month: today.toLocaleString('fr-FR', { month: 'long' }),
                total: currentTotal
            },
            previousMonth: {
                month: new Date(lastMonthYear, lastMonth - 1).toLocaleString('fr-FR', { month: 'long' }),
                total: lastTotal
            },
            percentageChange: Math.abs(percentageChange),
            trend: currentTotal > lastTotal ? 'up' : currentTotal < lastTotal ? 'down' : 'stable'
        };

        return { success: true, data: comparison };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

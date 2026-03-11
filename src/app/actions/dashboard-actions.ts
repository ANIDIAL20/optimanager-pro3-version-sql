'use server';

import { db } from '@/db';
import { sales, products, devis, frameReservations, expensesV2, supplierOrders } from '@/db/schema';
import { eq, gte, desc, and, lte, asc, sql, inArray, notInArray } from 'drizzle-orm';
import { startOfMonth, endOfMonth } from 'date-fns';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

export interface DashboardStats {
    globalRevenue: number;       // Total invoiced this month (CA)
    totalCollected: number;      // Cash actually received (total_paye)
    todaySalesCount: number;
    totalSalesCount: number;
    stockAlerts: number;
    stockAlertItems: Array<{
        id: string;
        nom: string;
        reference: string;
        quantite: number;
    }>;
    recentActivity: Array<{
        id: string;
        type: 'sale' | 'devis';
        description: string;
        amount: number;
        date: string;
        status: string;
        resteAPayer?: number;
    }>;
    pendingPaymentsCount: number;
    pendingReservations: any[]; // List of PENDING frame reservations
    totalExpenses: number;
    totalPurchases: number;
    netProfit: number;
}

/**
 * Get comprehensive dashboard statistics
 */
export const getDashboardStats = secureAction(async (userId, user) => {
    try {
        console.log(`📊 Generating dashboard stats (Drizzle) for user: ${userId}`);
        
        // 1. Get Date Ranges
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        // Current month range
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // 2. Fetch Data (Drizzle ORM) - Optimized Aggregations
        const [revenueResults, collectedResults, todaySalesResults, qLowStock, qDevis, qReservations, qRecentSales, expensesResults, purchasesResults] = await Promise.all([
            // Global Revenue (CA) — total invoiced this month, excl. cancelled/draft
            db.select({
                total: sql<string>`COALESCE(sum(COALESCE(total_net, total_ttc)), 0)`
            })
            .from(sales)
            .where(and(
                eq(sales.userId, userId),
                notInArray(sales.status, ['annule', 'brouillon']),
                gte(sales.date, monthStart),
                lte(sales.date, monthEnd)
            )),

            // Total Collected — cash actually received this month
            db.select({
                total: sql<string>`COALESCE(sum(total_paye), 0)`
            })
            .from(sales)
            .where(and(
                eq(sales.userId, userId),
                notInArray(sales.status, ['annule', 'brouillon']),
                gte(sales.date, monthStart),
                lte(sales.date, monthEnd)
            )),
            
            // Today's Sales Count
            db.select({ 
                count: sql<number>`count(*)` 
            }).from(sales).where(and(
                eq(sales.userId, userId),
                sql`date >= ${startOfDay} AND date <= ${endOfDay}`
            )),

            // Low Stock Items (Limited for dashboard)
            db.select().from(products)
                .where(and(
                    eq(products.userId, userId), 
                    lte(products.quantiteStock, sql`COALESCE(${products.seuilAlerte}, 5)`),
                    sql`NOT (${products.type} = 'VERRE' AND ${products.clientId} IS NOT NULL)`
                ))
                .orderBy(asc(products.quantiteStock))
                .limit(10),

            // Recent Devis
            db.select().from(devis).where(eq(devis.userId, userId)).orderBy(desc(devis.createdAt)).limit(5),

            // Pending Reservations
            // Pending Reservations - with Error Fallback
            db.select().from(frameReservations).where(and(
                eq(frameReservations.storeId, userId),
                eq(frameReservations.status, 'PENDING')
            )).catch((err: any) => {
                console.warn("⚠️ Dashboard: Missing frame_reservations table, skipping."); 
                return []; 
            }),

            // Recent Sales for Activity Feed (Limit to 5)
            db.select().from(sales)
                .where(eq(sales.userId, userId))
                .orderBy(desc(sales.createdAt))
                .limit(5),

            // Total Expenses (paid expenses only, current month, use paymentDate or fallback to createdAt)
            db.select({
                total: sql<string>`COALESCE(sum(amount), 0)`
            })
            .from(expensesV2)
            .where(and(
                eq(expensesV2.storeId, userId),
                eq(expensesV2.status, 'paid'),
                gte(sql`COALESCE(${expensesV2.paymentDate}, ${expensesV2.createdAt})`, monthStart),
                lte(sql`COALESCE(${expensesV2.paymentDate}, ${expensesV2.createdAt})`, monthEnd)
            )),

            // Total Purchases (supplier orders, paid or partial, current month by orderDate)
            db.select({
                total: sql<string>`COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN montant_total WHEN payment_status = 'partial' THEN amount_paid ELSE 0 END), 0)`
            })
            .from(supplierOrders)
            .where(and(
                eq(supplierOrders.userId, userId),
                inArray(supplierOrders.paymentStatus, ['paid', 'partial']),
                gte(supplierOrders.orderDate, monthStart),
                lte(supplierOrders.orderDate, monthEnd),
                sql`${supplierOrders.deletedAt} IS NULL`
            )),
        ]);

        const globalRevenue = parseFloat(revenueResults[0]?.total || '0');
        const totalCollected = parseFloat(collectedResults[0]?.total || '0');
        const todaySalesCount = Number(todaySalesResults[0]?.count || 0);
        const totalExpenses = parseFloat(expensesResults[0]?.total || '0');
        const totalPurchases = parseFloat(purchasesResults[0]?.total || '0');
        const netProfit = totalCollected - totalExpenses - totalPurchases;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/30be8363-95ff-4f7c-bb27-635fbf08c469', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': '146942',
            },
            body: JSON.stringify({
                sessionId: '146942',
                runId: 'pre-fix',
                hypothesisId: 'H1',
                location: 'src/app/actions/dashboard-actions.ts:106',
                message: 'Monthly net profit components',
                data: { globalRevenue, totalExpenses, totalPurchases, netProfit, monthStart, monthEnd },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion agent log
        
        // Total count (Quickly count without fetching)
        const totalSalesCountResult = await db.select({ count: sql`count(*)` }).from(sales).where(eq(sales.userId, userId));
        const totalSalesCount = Number(totalSalesCountResult[0]?.count || 0);

        // Count Pending Payments (Sales where reste_a_payer > 0)
        const pendingPaymentsResult = await db.select({ count: sql`count(*)` })
            .from(sales)
            .where(and(
                eq(sales.userId, userId),
                sql`CAST(reste_a_payer AS NUMERIC) > 0.01`
            ));
        const pendingPaymentsCount = Number(pendingPaymentsResult[0]?.count || 0);

        // 4. Process Stock Alerts
        const stockAlertItems = qLowStock.map((p: any) => ({
            id: p.id.toString(),
            nom: p.nom || 'Produit sans nom',
            reference: p.reference || 'REF-???',
            quantite: p.quantiteStock || 0
        }));

        // 5. Build Unified Recent Activity
        const mappedSales = qRecentSales.map((s: any) => {
            const reste = parseFloat(s.resteAPayer || '0');
            return {
                id: s.id.toString(),
                type: 'sale' as const,
                description: s.clientName || 'Client Inconnu',
                amount: parseFloat(s.totalTTC || '0'),
                date: s.createdAt ? (typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString()) : new Date().toISOString(),
                status: reste > 0 ? 'Impayé' : 'Payé',
                resteAPayer: reste
            };
        });

        const mappedDevis = qDevis.map((d: any) => ({
            id: d.id.toString(),
            type: 'devis' as const,
            description: `Devis: ${d.clientName}`,
            amount: parseFloat(d.totalTTC || '0'),
            date: d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt : d.createdAt.toISOString()) : new Date().toISOString(),
            status: d.status || 'EN_ATTENTE',
        }));

        const recentActivity = [...mappedSales, ...mappedDevis]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        const dashboardData: DashboardStats = {
            globalRevenue,
            totalCollected,
            todaySalesCount,
            totalSalesCount,
            pendingPaymentsCount,
            stockAlerts: qLowStock.length, // Rough estimate based on limit/results
            stockAlertItems,
            recentActivity,
            pendingReservations: qReservations as any || [],
            totalExpenses,
            totalPurchases,
            netProfit
        };

        await logSuccess(userId, 'READ', 'dashboard_stats', 'REFRESH');
        return { success: true, data: dashboardData };

    } catch (error: any) {
        console.error('❌ DASHBOARD_STATS_ERROR (Drizzle):', error);
        await logFailure(userId, 'READ', 'dashboard_stats', error.message);
        return {
            success: false,
            error: 'Erreur lors du calcul des statistiques',
            data: null
        };
    }
});

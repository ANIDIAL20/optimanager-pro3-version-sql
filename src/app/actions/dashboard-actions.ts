'use server';

import { db } from '@/db';
import { sales, products, devis, frameReservations } from '@/db/schema';
import { eq, gte, desc, and, lte, asc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

export interface DashboardStats {
    globalRevenue: number;
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
}

/**
 * Get comprehensive dashboard statistics
 */
export const getDashboardStats = secureAction(async (userId, user) => {
    try {
        console.log(`📊 Generating dashboard stats (Drizzle) for user: ${userId}`);
        
        // 1. Get Today's Date Range (Timezone aware-ish)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        // 2. Fetch Data (Drizzle ORM) - Optimized Aggregations
        const [revenueResults, todaySalesResults, qLowStock, qDevis, qReservations, qRecentSales] = await Promise.all([
            // Global Revenue (Total Net/TTC)
            db.select({ 
                total: sql<string>`sum(COALESCE(total_net, total_ttc, '0'))` 
            }).from(sales).where(eq(sales.userId, userId)),
            
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
                    lte(products.quantiteStock, sql`COALESCE(${products.seuilAlerte}, 5)`)
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
                .limit(5)
        ]);

        const globalRevenue = parseFloat(revenueResults[0]?.total || '0');
        const todaySalesCount = Number(todaySalesResults[0]?.count || 0);
        
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
                amount: parseFloat(s.totalTtc || '0'),
                date: s.createdAt ? (typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString()) : new Date().toISOString(),
                status: reste > 0 ? 'Impayé' : 'Payé',
                resteAPayer: reste
            };
        });

        const mappedDevis = qDevis.map((d: any) => ({
            id: d.id.toString(),
            type: 'devis' as const,
            description: `Devis: ${d.clientName}`,
            amount: parseFloat(d.totalTtc || '0'),
            date: d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt : d.createdAt.toISOString()) : new Date().toISOString(),
            status: d.status || 'EN_ATTENTE',
        }));

        const recentActivity = [...mappedSales, ...mappedDevis]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        const dashboardData: DashboardStats = {
            globalRevenue,
            todaySalesCount,
            totalSalesCount,
            pendingPaymentsCount,
            stockAlerts: qLowStock.length, // Rough estimate based on limit/results
            stockAlertItems,
            recentActivity,
            pendingReservations: qReservations as any || []
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

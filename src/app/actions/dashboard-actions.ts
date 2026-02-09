'use server';

import { db } from '@/db';
import { sales, products, devis } from '@/db/schema';
import { eq, gte, desc, sql, and } from 'drizzle-orm';
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
}

/**
 * Get comprehensive dashboard statistics
 */
export const getDashboardStats = secureAction(async (userId, user) => {
    try {
        console.log(`📊 Generating dashboard stats for user: ${userId}`);
        
        // 1. Get Today's Date Range (Timezone aware-ish)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // 2. Fetch Sales Data (Parallel)
        const [allSales, lowStockItems, recentDevis] = await Promise.all([
            db.select().from(sales)
                .where(eq(sales.userId, userId))
                .orderBy(desc(sales.createdAt)),
            
            // Get all low stock items (no limit for count, but we slice for UI)
            db.select().from(products)
                .where(and(
                    eq(products.userId, userId),
                    sql`${products.quantiteStock} <= ${products.seuilAlerte}`
                )),

            db.select().from(devis)
                .where(eq(devis.userId, userId))
                .orderBy(desc(devis.createdAt))
                .limit(5)
        ]);

        // 3. Process Revenue & Today's Counts
        let globalRevenue = 0;
        let todaySalesCount = 0;

        allSales.forEach(sale => {
            // ✅ Revenue Fix: Strict priority for totalNet (actual collection target)
            // Handle as numeric strings from DB
            const revenueValue = parseFloat(sale.totalNet || sale.totalTTC || '0');
            globalRevenue += isNaN(revenueValue) ? 0 : revenueValue;

            // ✅ Today's Sales Fix: Precise date comparison
            const saleDate = sale.date || sale.createdAt;
            if (saleDate && saleDate >= startOfDay && saleDate <= endOfDay) {
                todaySalesCount++;
            }
        });

        const totalSalesCount = allSales.length;

        // 4. Process Stock Alerts
        const stockAlerts = lowStockItems.length;
        const stockAlertItems = lowStockItems.slice(0, 5).map(p => ({
            id: p.id.toString(),
            nom: p.nom || 'Produit sans nom',
            reference: p.reference || 'REF-???',
            quantite: p.quantiteStock || 0
        }));

        // 5. Build Unified Recent Activity (Sales + Devis)
        const mappedSales = allSales.slice(0, 5).map(s => {
            const reste = parseFloat(s.resteAPayer || '0');
            return {
                id: s.id.toString(),
                type: 'sale' as const,
                description: s.clientName || 'Client Inconnu',
                amount: parseFloat(s.totalTTC || '0'),
                date: (s.createdAt || new Date()).toISOString(),
                status: reste > 0 ? 'Impayé' : 'Payé',
                resteAPayer: reste
            };
        });

        const mappedDevis = recentDevis.map(d => ({
            id: d.id.toString(),
            type: 'devis' as const,
            description: `Devis: ${d.clientName}`,
            amount: parseFloat(d.totalTTC || '0'),
            date: (d.createdAt || new Date()).toISOString(),
            status: d.status || 'EN_ATTENTE',
        }));

        // Combine and sort by date descending
        const recentActivity = [...mappedSales, ...mappedDevis]
            // @ts-ignore
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        const dashboardData: DashboardStats = {
            globalRevenue,
            todaySalesCount,
            totalSalesCount,
            stockAlerts,
            stockAlertItems,
            recentActivity
        };

        await logSuccess(userId, 'READ', 'dashboard_stats', 'REFRESH');
        return { success: true, data: dashboardData };

    } catch (error: any) {
        console.error('❌ DASHBOARD_STATS_ERROR:', error);
        await logFailure(userId, 'READ', 'dashboard_stats', error.message);
        return {
            success: false,
            error: 'Erreur lors du calcul des statistiques',
            data: null
        };
    }
});

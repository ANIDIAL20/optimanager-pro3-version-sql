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
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 1. Get ALL Sales for global revenue and counts
        const allSales = await db.query.sales.findMany({
            where: eq(sales.userId, userId),
            orderBy: [desc(sales.createdAt)]
        });

        // Calculate stats
        let globalRevenue = 0;
        let todaySalesCount = 0;

        allSales.forEach(sale => {
            // Global revenue
            const revenue = Number(sale.totalNet || sale.totalTTC || 0);
            globalRevenue += revenue;

            // Today's sales count
            const saleDate = sale.date || sale.createdAt;
            if (saleDate) {
                const saleDateObj = new Date(saleDate);
                saleDateObj.setHours(0, 0, 0, 0);
                if (saleDateObj.toISOString() === todayISO) {
                    todaySalesCount++;
                }
            }
        });

        const totalSalesCount = allSales.length;

        // 2. Get Stock Alerts (low stock products)
        const lowStockProducts = await db.query.products.findMany({
            where: and(
                eq(products.userId, userId),
                sql`${products.quantiteStock} <= 5`
            ),
            limit: 5
        });

        const stockAlertItems = lowStockProducts.map(p => ({
            id: p.id.toString(),
            nom: p.nom || 'Produit sans nom',
            reference: p.reference || 'REF-???',
            quantite: p.quantiteStock || 0
        }));

        const stockAlerts = stockAlertItems.length;

        // 3. Recent Activity (last 5 sales)
        const recentSales = allSales.slice(0, 5);
        
        const recentActivity = recentSales.map(sale => {
            const reste = Number(sale.resteAPayer || 0);
            const status = reste > 0 ? 'Impayé' : 'Payé';

            return {
                id: sale.id.toString(),
                type: 'sale' as const,
                description: sale.clientName || 'Client Inconnu',
                amount: Number(sale.totalTTC || 0),
                date: (sale.createdAt || new Date()).toISOString(),
                status,
                resteAPayer: reste
            };
        });

        const dashboardData: DashboardStats = {
            globalRevenue,
            todaySalesCount,
            totalSalesCount,
            stockAlerts,
            stockAlertItems,
            recentActivity
        };

        await logSuccess(userId, 'READ', 'dashboard_stats', undefined);
        return { success: true, data: dashboardData };

    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        await logFailure(userId, 'READ', 'dashboard_stats', error.message);
        return {
            success: false,
            error: 'Erreur lors du chargement des statistiques',
            data: null
        };
    }
});

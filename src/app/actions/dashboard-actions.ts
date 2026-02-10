'use server';

import { db } from '@/db';
import { sales, products, devis } from '@/db/schema';
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

        // 2. Fetch Data (Drizzle ORM)
        const [qSales, qLowStock, qDevis] = await Promise.all([
            db.select().from(sales).where(eq(sales.userId, userId)).orderBy(desc(sales.createdAt)),
            db.select().from(products)
                .where(and(
                    eq(products.userId, userId), 
                    lte(products.quantiteStock, sql`COALESCE(${products.seuilAlerte}, 5)`)
                ))
                .orderBy(asc(products.quantiteStock))
                .limit(10),
            db.select().from(devis).where(eq(devis.userId, userId)).orderBy(desc(devis.createdAt)).limit(5)
        ]);

        // 3. Process Revenue & Today's Counts
        let globalRevenue = 0;
        let todaySalesCount = 0;

        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        qSales.forEach((sale: any) => {
            const revenueValue = parseFloat(sale.totalNet || sale.totalTtc || '0');
            globalRevenue += isNaN(revenueValue) ? 0 : revenueValue;

            const saleDate = sale.date ? new Date(sale.date) : (sale.createdAt ? new Date(sale.createdAt) : null);
            if (saleDate && saleDate >= dStart && saleDate <= dEnd) {
                todaySalesCount++;
            }
        });

        const totalSalesCount = qSales.length;

        // 4. Process Stock Alerts
        const stockAlertItems = qLowStock.map((p: any) => ({
            id: p.id.toString(),
            nom: p.nom || 'Produit sans nom',
            reference: p.reference || 'REF-???',
            quantite: p.quantiteStock || 0
        }));

        // 5. Build Unified Recent Activity
        const mappedSales = qSales.slice(0, 5).map((s: any) => {
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
            stockAlerts: qLowStock.length, // Rough estimate based on limit/results
            stockAlertItems,
            recentActivity
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

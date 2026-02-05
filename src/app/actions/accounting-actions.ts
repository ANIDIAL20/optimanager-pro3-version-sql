
'use server';

import { db } from '@/db';
import { sales, clients, products } from '@/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

// ==========================================
// Types
// ==========================================

export interface AccountingMetrics {
    totalRevenue: number;
    salesCount: number;
    averageCart: number;
    chartData: { date: string; amount: number }[];
}

// ==========================================
// Helpers
// ==========================================

const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
        case 'today':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'yesterday': {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
        }
        case 'thisMonth':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'lastMonth': {
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        }
        case 'thisYear':
            return { start: startOfYear(now), end: endOfYear(now) };
        default:
            return { start: startOfMonth(now), end: endOfMonth(now) };
    }
};

// ==========================================
// Actions
// ==========================================

/**
 * Get Accounting Metrics
 */
export const getAccountingMetrics = secureAction(async (userId, user, range: string) => {
    try {
        const { start, end } = getDateRange(range);
        
        // Fetch sales within date range
        const results = await db
            .select({
                totalTTC: sales.totalTTC,
                createdAt: sales.createdAt,
            })
            .from(sales)
            .where(and(
                eq(sales.userId, userId),
                gte(sales.createdAt, start),
                lte(sales.createdAt, end)
            ))
            .orderBy(sales.createdAt);

        const totalRevenue = results.reduce((sum, s) => sum + Number(s.totalTTC || 0), 0);
        const salesCount = results.length;
        const averageCart = salesCount > 0 ? totalRevenue / salesCount : 0;

        // Group by Date for Chart
        const dataMap = new Map<string, number>();
        
        results.forEach(s => {
            if (!s.createdAt) return;
            // Format DD/MM or DD/MM/YYYY depending on range? 
            // Let's stick to DD/MM for simplicity in charts
            const dateKey = s.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            dataMap.set(dateKey, (dataMap.get(dateKey) || 0) + Number(s.totalTTC || 0));
        });

        const chartData = Array.from(dataMap.entries()).map(([date, amount]) => ({
            date,
            amount
        }));

        return {
            success: true,
            data: {
                totalRevenue,
                salesCount,
                averageCart,
                chartData
            } as AccountingMetrics
        };

    } catch (error: any) {
        console.error('Error fetching accounting metrics:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Export Sales Data (CSV)
 */
export const exportSalesData = secureAction(async (userId, user) => {
    try {
        const allSales = await db
            .select()
            .from(sales)
            .where(eq(sales.userId, userId))
            .orderBy(desc(sales.createdAt));

        const headers = ['ID', 'Date', 'Client', 'Total TTC', 'Statut', 'Paiement'];
        const rows = allSales.map(s => [
            s.saleNumber || s.id,
            s.createdAt ? s.createdAt.toLocaleString('fr-FR') : '',
            s.clientName || 'Inconnu',
            Number(s.totalTTC).toFixed(2),
            s.status,
            s.paymentMethod || '-'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return { success: true, data: csvContent, filename: `ventes_export_${new Date().toISOString().split('T')[0]}.csv` };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Export Clients Data (CSV)
 */
export const exportClientsData = secureAction(async (userId, user) => {
    try {
        const allClients = await db
            .select()
            .from(clients)
            .where(eq(clients.userId, userId));

        const headers = ['ID', 'Nom', 'Prénom', 'Téléphone', 'Email', 'Ville', 'Total Dépensé'];
        const rows = allClients.map(c => [
            c.id,
            c.nom || '',
            c.prenom || '',
            c.phone || '',
            c.email || '',
            c.city || '',
            Number(c.totalSpent || 0).toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return { success: true, data: csvContent, filename: `clients_export_${new Date().toISOString().split('T')[0]}.csv` };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Export Stock Data (CSV)
 */
export const exportStockData = secureAction(async (userId, user) => {
    try {
        const allProducts = await db
            .select()
            .from(products)
            .where(eq(products.userId, userId));

        const headers = ['Référence', 'Nom', 'Marque', 'Catégorie', 'Prix Achat', 'Prix Vente', 'Stock'];
        const rows = allProducts.map(p => [
            p.reference || '',
            p.nom,
            p.marque || '',
            p.categorie || '',
            Number(p.prixAchat || 0).toFixed(2),
            Number(p.prixVente || 0).toFixed(2),
            p.quantiteStock || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return { success: true, data: csvContent, filename: `stock_export_${new Date().toISOString().split('T')[0]}.csv` };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

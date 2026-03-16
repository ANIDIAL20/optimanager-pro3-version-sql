'use server';

import { db } from '@/db';
import { sales, clients, products } from '@/db/schema';
import { eq, and, desc, gte, lte, sql, gt } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { getDateRange } from '@/lib/date-utils';
import type { SaleRow, DateRange, AccountingMetrics } from '@/types/accounting';

// Shared types are imported from @/types/accounting
// No longer re-exporting them here to avoid Turbopack build errors with "use server"

// ==========================================
// Helpers
// ==========================================



// ==========================================
// Accounting Metrics (for KPIs + Chart)
// ==========================================

export const getAccountingMetrics = secureAction(async (userId: string, _user: unknown, range: string) => {
    try {
        const { from, to } = getDateRange(range);

        const results = await db
            .select({
                totalTTC: sales.totalTTC,
                createdAt: sales.createdAt,
            })
            .from(sales)
            .where(and(
                eq(sales.userId, userId),
                gte(sales.createdAt, from),
                lte(sales.createdAt, to)
            ))
            .orderBy(sales.createdAt);

        const totalRevenue = results.reduce((sum: number, s: { totalTTC: string | null; createdAt: Date | null }) => sum + Number(s.totalTTC ?? 0), 0);
        const salesCount = results.length;
        const averageCart = salesCount > 0 ? totalRevenue / salesCount : 0;

        const dataMap = new Map<string, number>();
        results.forEach((s: { totalTTC: string | null; createdAt: Date | null }) => {
            if (!s.createdAt) return;
            const dateKey = s.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            dataMap.set(dateKey, (dataMap.get(dateKey) ?? 0) + Number(s.totalTTC ?? 0));
        });

        const chartData = Array.from(dataMap.entries()).map(([date, amount]) => ({ date, amount }));

        return {
            success: true,
            data: { totalRevenue, salesCount, averageCart, chartData } as AccountingMetrics,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('getAccountingMetrics error:', message);
        return { success: false, error: message };
    }
});

// ==========================================
// Shared select shape + mapper
// ==========================================

const salesSelect = {
    id: sales.id,
    saleNumber: sales.saleNumber,
    transactionNumber: sales.transactionNumber,
    createdAt: sales.createdAt,
    clientName: sales.clientName,
    totalTTC: sales.totalTTC,
    totalPaye: sales.totalPaye,
    resteAPayer: sales.resteAPayer,
    paymentMethod: sales.paymentMethod,
    status: sales.status,
    isOfficialInvoice: sales.isOfficialInvoice,
} as const;

type RawRow = {
    id: number;
    saleNumber: string | null;
    transactionNumber: string | null;
    createdAt: Date | null;
    clientName: string | null;
    totalTTC: string | null;
    totalPaye: string | null;
    resteAPayer: string | null;
    paymentMethod: string | null;
    status: string | null;
    isOfficialInvoice: boolean;
};

function mapRow(s: RawRow): SaleRow {
    return {
        id: s.id,
        saleNumber: s.saleNumber,
        transactionNumber: s.transactionNumber,
        date: s.createdAt ? s.createdAt.toLocaleDateString('fr-FR') : '',
        clientName: s.clientName ?? 'Inconnu',
        totalTTC: Number(s.totalTTC ?? 0),
        totalPaye: Number(s.totalPaye ?? 0),
        resteAPayer: Number(s.resteAPayer ?? 0),
        paymentMethod: s.paymentMethod,
        status: s.status ?? '',
        isOfficialInvoice: s.isOfficialInvoice,
    };
}

function buildWhere(userId: string, range?: DateRange) {
    // FIX: BUG 1 - Filter out zero-value sales
    const conditions = [
        eq(sales.userId, userId),
        gt(sql`CAST(${sales.totalTTC} AS NUMERIC)`, 0)
    ];
    if (range) {
        conditions.push(gte(sales.createdAt, range.from));
        conditions.push(lte(sales.createdAt, range.to));
    }
    return and(...conditions);
}

// ==========================================
// Split Queries
// ==========================================

/**
 * Official sales only (isOfficialInvoice = true)
 */
export async function getOfficialSales(userId: string, range?: DateRange): Promise<SaleRow[]> {
    const rows = await db
        .select(salesSelect)
        .from(sales)
        .where(and(buildWhere(userId, range), eq(sales.isOfficialInvoice, true)))
        .orderBy(sales.createdAt);

    return rows.map(mapRow);
}

export const getOfficialSalesAction = secureAction(async (userId: string, _user: any, rangeString: string) => {
    const range = getDateRange(rangeString);
    const data = await getOfficialSales(userId, range);
    return { success: true, data };
});

/**
 * Hors-Bilan sales only (isOfficialInvoice = false)
 */
export async function getHorsbilanSales(userId: string, range?: DateRange): Promise<SaleRow[]> {
    const rows = await db
        .select(salesSelect)
        .from(sales)
        .where(and(buildWhere(userId, range), eq(sales.isOfficialInvoice, false)))
        .orderBy(sales.createdAt);

    return rows.map(mapRow);
}

export const getHorsbilanSalesAction = secureAction(async (userId: string, _user: any, rangeString: string) => {
    const range = getDateRange(rangeString);
    const data = await getHorsbilanSales(userId, range);
    return { success: true, data };
});

/**
 * All sales (backward-compatible)
 */
export async function getAllSales(userId: string, range?: DateRange): Promise<SaleRow[]> {
    const rows = await db
        .select(salesSelect)
        .from(sales)
        .where(buildWhere(userId, range))
        .orderBy(sales.createdAt);

    return rows.map(mapRow);
}

export const getAllSalesAction = secureAction(async (userId: string, _user: any, rangeString: string) => {
    const range = getDateRange(rangeString);
    const data = await getAllSales(userId, range);
    return { success: true, data };
});

// ==========================================
// Legacy CSV Exports (unchanged)
// ==========================================

export const exportSalesData = secureAction(async (userId: string) => {
    try {
        const allSales = await db
            .select()
            .from(sales)
            .where(and(
                eq(sales.userId, userId),
                gt(sql`CAST(${sales.totalTTC} AS NUMERIC)`, 0)
            ))
            .orderBy(desc(sales.createdAt));

        const headers = ['ID', 'Date', 'Client', 'Total TTC', 'Statut', 'Paiement'];
        const rows = allSales.map((s: typeof allSales[number]) => [
            s.saleNumber || String(s.id),
            s.createdAt ? s.createdAt.toLocaleString('fr-FR') : '',
            s.clientName || 'Inconnu',
            Number(s.totalTTC).toFixed(2),
            s.status,
            s.paymentMethod || '-',
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number | null)[]) => row.map((cell: string | number | null) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        return { success: true, data: csvContent, filename: `ventes_export_${new Date().toISOString().split('T')[0]}.csv` };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return { success: false, error: message };
    }
});

export const exportClientsData = secureAction(async (userId: string) => {
    try {
        const allClients = await db
            .select()
            .from(clients)
            .where(eq(clients.userId, userId));

        const headers = ['ID', 'Nom', 'Prénom', 'Téléphone', 'Email', 'Ville', 'Total Dépensé'];
        const rows = allClients.map((c: typeof allClients[number]) => [
            c.id,
            c.nom || '',
            c.prenom || '',
            c.phone || '',
            c.email || '',
            c.city || '',
            Number(c.totalSpent || 0).toFixed(2),
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        return { success: true, data: csvContent, filename: `clients_export_${new Date().toISOString().split('T')[0]}.csv` };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return { success: false, error: message };
    }
});

export const exportStockData = secureAction(async (userId: string) => {
    try {
        const allProducts = await db
            .select()
            .from(products)
            .where(eq(products.userId, userId));

        const headers = ['Référence', 'Nom', 'Marque', 'Catégorie', 'Prix Achat', 'Prix Vente', 'Stock'];
        const rows = allProducts.map((p: typeof allProducts[number]) => [
            p.reference || '',
            p.nom,
            p.marque || '',
            p.categorie || '',
            Number(p.prixAchat || 0).toFixed(2),
            Number(p.prixVente || 0).toFixed(2),
            p.quantiteStock || 0,
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        return { success: true, data: csvContent, filename: `stock_export_${new Date().toISOString().split('T')[0]}.csv` };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return { success: false, error: message };
    }
});

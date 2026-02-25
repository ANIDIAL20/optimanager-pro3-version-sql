'use server';

import { db } from '@/db';
import { sales, comptabiliteJournal } from '@/db/schema';
import { eq, and, gte, lte, sql, desc, ne } from 'drizzle-orm';
import { secureActionWithResponse } from '@/lib/secure-action';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * Get all official sales for accounting review
 */
export const getVentesComptabilite = secureActionWithResponse(async (userId) => {
    return await db.select()
        .from(sales)
        .where(
            and(
                eq(sales.userId, userId),
                eq(sales.isOfficialInvoice, true),
                ne(sales.comptabiliteStatus, 'EXCLUDED')
            )
        )
        .orderBy(desc(sales.createdAt));
});

/**
 * Get Official Financial Stats for a given month
 */
export const getChiffreAffairesOfficiel = secureActionWithResponse(async (userId, user, month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    const stats = await db.select({
        totalTTC: sql<string>`SUM(total_ttc)`,
        totalHT: sql<string>`SUM(total_ht)`,
        totalTVA: sql<string>`SUM(total_tva)`,
        count: sql<number>`COUNT(*)`
    })
    .from(sales)
    .where(
        and(
            eq(sales.userId, userId),
            eq(sales.isOfficialInvoice, true),
            gte(sales.createdAt, start),
            lte(sales.createdAt, end)
        )
    );

    const result = stats[0];
    return {
        totalTTC: parseFloat(result.totalTTC || '0'),
        totalHT: parseFloat(result.totalHT || '0'),
        totalTVA: parseFloat(result.totalTVA || '0'),
        count: Number(result.count || 0)
    };
});

/**
 * Stock Movements Actions - Neon/Drizzle Version
 * Read-only access to stock history
 */

'use server';

import { db } from '@/db';
import { stockMovements, products } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface StockMovement {
    id: string;
    productId?: string;
    productName?: string;
    quantity: number;
    type: string;
    ref?: string;
    date: string;
    notes?: string;
}

// ========================================
// ACTIONS
// ========================================

/**
 * Get stock movements (all or by product)
 */
export const getStockMovements = secureAction(async (userId, user, productId?: string) => {
    try {
        const query = db.query.stockMovements.findMany({
            where: and(
                eq(stockMovements.userId, userId),
                productId ? eq(stockMovements.productId, parseInt(productId)) : undefined
            ),
            with: {
                product: true
            },
            orderBy: [desc(stockMovements.date)]
        });

        const results = await query;

        const mapped: StockMovement[] = results.map((m: any) => ({
            id: m.id.toString(),
            productId: m.productId?.toString(),
            productName: m.product?.nom,
            quantity: m.quantite,
            type: m.type,
            ref: m.ref || '',
            date: m.date?.toISOString() || '',
            notes: m.notes || ''
        }));

        await logSuccess(userId, 'READ', 'stock_movements', 'list', { count: mapped.length });
        return { success: true, movements: mapped };

    } catch (error: any) {
        await logFailure(userId, 'READ', 'stock_movements', error.message);
        return { success: false, error: 'Erreur récupération mouvements', movements: [] };
    }
});

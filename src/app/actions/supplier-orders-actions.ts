/**
 * Supplier Orders Actions - Neon/Drizzle Version
 * Secure management of supplier orders
 */

'use server';


import { db } from '@/db';
import { supplierOrders, suppliers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface SupplierOrderItem {
    type: 'monture' | 'verre' | 'lentille' | 'divers';
    marque?: string;
    reference?: string;
    couleur?: string;
    description?: string;
    sphCyl?: string;
    typeLentille?: string;
    rayon?: string;
    nomProduit?: string;
    quantity: number;
    unitPrice: number;
}

export interface SupplierOrder {
    id: string;
    supplierId?: string; // Schema says 'fournisseur' text, logic implies name or ID? Schema has `fournisseur` column.
                        // Legacy used `supplierId` and `supplierName`.
                        // Schema `fournisseur` likely stores name.
                        // I will map `supplierName` to `fournisseur`.
    supplierName: string;
    date: string;
    items: SupplierOrderItem[];
    subtotal?: number;
    discount?: number;
    totalAmount: number;
    amountPaid: number;
    paymentStatus: 'paye' | 'impaye' | 'partiel';
    status: 'pending' | 'received'; // Schema: 'statut' (EN_COURS, REÇU, ANNULÉ) -> Map these.
    createdAt: string;
    receivedAt?: string;
    invoiceRef?: string;
    note?: string;
}

// ========================================
// ACTIONS
// ========================================

/**
 * Get all supplier orders
 */
export const getSupplierOrders = secureAction(async (userId, user) => {
    try {
        const results = await db.query.supplierOrders.findMany({
            where: eq(supplierOrders.userId, userId),
            orderBy: [desc(supplierOrders.createdAt)]
        });

        // Map Drizzle result to SupplierOrder interface
        const mapped: SupplierOrder[] = results.map(o => ({
            id: o.id.toString(),
            supplierId: '', // Schema doesn't have strict supplier ID FK, just 'fournisseur' text
            supplierName: o.fournisseur,
            date: o.dateCommande?.toISOString() || '',
            items: (o.items as SupplierOrderItem[]) || [],
            totalAmount: Number(o.montantTotal),
            amountPaid: Number(o.montantPaye),
            paymentStatus: (Number(o.montantPaye) >= Number(o.montantTotal)) ? 'paye' : (Number(o.montantPaye) > 0 ? 'partiel' : 'impaye'),
            status: o.statut === 'REÇU' ? 'received' : 'pending',
            createdAt: o.createdAt?.toISOString() || '',
            receivedAt: o.dateReception?.toISOString(),
            note: o.notes || ''
        }));

        await logSuccess(userId, 'READ', 'supplier_orders', undefined, { count: mapped.length });
        return { success: true, orders: mapped };

    } catch (error: any) {
        await logFailure(userId, 'READ', 'supplier_orders', error.message);
        return { success: false, error: 'Erreur récupération commandes', orders: [] };
    }
});

/**
 * Confirm Reception
 */
export const confirmOrderReception = secureAction(async (userId, user, orderId: string) => {
    console.log(`📦 Confirming reception for order: ${orderId}`);

    try {
        const id = parseInt(orderId);
        
        const existing = await db.query.supplierOrders.findFirst({
            where: and(eq(supplierOrders.id, id), eq(supplierOrders.userId, userId))
        });

        if (!existing) return { success: false, error: 'Commande introuvable' };
        if (existing.statut === 'REÇU') return { success: false, error: 'Déjà réceptionnée' };

        await db.update(supplierOrders)
            .set({
                statut: 'REÇU',
                dateReception: new Date(),
                updatedAt: new Date()
            })
            .where(eq(supplierOrders.id, id));

        revalidatePath('/dashboard/fournisseurs');
        await logSuccess(userId, 'UPDATE_STATUS', 'supplier_orders', orderId, { status: 'REÇU' });
        return { success: true, message: 'Commande réceptionnée.' };

    } catch (error: any) {
        await logFailure(userId, 'UPDATE_STATUS', 'supplier_orders', error.message, orderId);
        return { success: false, error: error.message };
    }
});

/**
 * Create Supplier Order
 */

import { suppliers } from '@/db/schema'; // Add this import

// ...

/**
 * Create Supplier Order
 */
export const createSupplierOrder = secureAction(async (userId, user, data: any) => {
    try {
        const paid = data.amountPaid || 0;
        
        // 1. Find Supplier to get Payment Terms
        const supplier = await db.query.suppliers.findFirst({
            where: and(
                eq(suppliers.userId, userId),
                eq(suppliers.name, data.supplierName)
            )
        });

        // 2. Calculate Due Date
        let dueDate: Date | null = null;
        if (supplier?.paymentTerms) {
            const terms = supplier.paymentTerms.toLowerCase();
            const date = new Date(data.date); // Order date

            if (terms.includes('30')) {
                date.setDate(date.getDate() + 30);
                dueDate = date;
            } else if (terms.includes('60')) {
                date.setDate(date.getDate() + 60);
                dueDate = date;
            } else if (terms.includes('90')) {
                date.setDate(date.getDate() + 90);
                dueDate = date;
            } else if (terms.includes('comptant')) {
                dueDate = new Date(data.date); // Due immediately
            }
            // Add more logic if needed
        }
        
        const newOrder = {
            userId,
            fournisseur: data.supplierName,
            items: data.items,
            montantTotal: data.totalAmount.toString(),
            montantPaye: paid.toString(),
            resteAPayer: (data.totalAmount - paid).toString(),
            statut: 'EN_COURS',
            dateCommande: new Date(data.date),
            dueDate: dueDate, // Insert calculated due date
            notes: data.note,
            createdAt: new Date()
        };

        const result = await db.insert(supplierOrders).values(newOrder).returning();

        revalidatePath('/dashboard/fournisseurs');
        await logSuccess(userId, 'CREATE', 'supplier_orders', result[0].id.toString());
        return { success: true, id: result[0].id.toString(), message: 'Commande créée avec succès' };

    } catch (error: any) {
        await logFailure(userId, 'CREATE', 'supplier_orders', error.message);
        return { success: false, error: 'Erreur création commande' };
    }
});

/**
 * Delete Supplier Order
 */
export const deleteSupplierOrder = secureAction(async (userId, user, orderId: string) => {
    try {
        const id = parseInt(orderId);

        const result = await db.delete(supplierOrders)
            .where(and(eq(supplierOrders.id, id), eq(supplierOrders.userId, userId)))
            .returning();

        if (result.length === 0) return { success: false, error: 'Commande introuvable' };

        revalidatePath('/dashboard/fournisseurs');
        await logSuccess(userId, 'DELETE', 'supplier_orders', orderId);
        return { success: true, message: 'Commande supprimée' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

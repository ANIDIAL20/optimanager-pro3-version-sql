/**
 * Supplier Orders Actions - Neon/Drizzle Version
 * Secure management of supplier orders
 */

'use server';


import { db } from '@/db';
import { supplierOrders, suppliers, supplierPayments, supplierOrderPayments, products, stockMovements, supplierOrderItems, reminders, supplierCreditAllocations, supplierCredits } from '@/db/schema';
import { eq, and, or, desc, sql, sum, count, isNull, inArray } from 'drizzle-orm';
import { getSuppliersList as getSuppliers } from '@/app/actions/supplier-actions';
import type { Supplier } from '@/lib/types';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, withAudit, logAudit } from '@/lib/audit-log';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';

// Types
export type SupplierOrder = {
    id: string;
    userId: string;
    supplierId: string | null;
    orderReference?: string | null;
    orderNumber?: string | null;
    supplierName: string;
    supplierPhone?: string | null;
    totalAmount: number;
    amountPaid: number;      // Total payments + credits
    totalPaidForOrder: number; // Only payments
    totalCreditsApplied: number; // Only credits
    resteToPay: number;      // Actual remaining
    resteAPayer: number;     // Legacy support
    status: string | null;
    deliveryStatus: string | null;
    createdAt: Date | null;
};

export type CreateSupplierOrderItemInput = {
    productId?: number | null;
    reference?: string | null;
    label?: string;
    nomProduit?: string;
    quantity?: number;
    unitPrice?: number;
};

export type CreateSupplierOrderInput = {
    supplierId?: string;
    supplierName?: string;
    date: Date | string;
    items?: CreateSupplierOrderItemInput[];
    subTotal?: number;
    discount?: number;
    totalAmount: number;
    amountPaid?: number;
    orderReference?: string;
    notes?: string;
};

/**
 * Get Supplier Orders
 */
export const getSupplierOrders = secureAction(async (userId, user, supplierId?: string) => {
    try {
        const results = await db.select({
            id: supplierOrders.id,
            userId: supplierOrders.userId,
            supplierId: supplierOrders.supplierId,
            orderReference: supplierOrders.orderReference,
            orderNumber: supplierOrders.orderNumber,
            fournisseur: supplierOrders.fournisseur,
            supplierPhone: supplierOrders.supplierPhone,
            montantTotal: supplierOrders.montantTotal,
            totalPayments: sql<string>`(
                SELECT COALESCE(SUM(amount), 0) FROM ${supplierOrderPayments} 
                WHERE order_id = "supplier_orders"."id" AND user_id = ${userId}
            )`,
            totalCredits: sql<string>`(
                SELECT COALESCE(SUM(amount), 0) FROM ${supplierCreditAllocations} 
                WHERE order_id = "supplier_orders"."id" AND user_id = ${userId}
            )`,
            statut: supplierOrders.statut,
            deliveryStatus: supplierOrders.deliveryStatus,
            createdAt: supplierOrders.createdAt,
        })
        .from(supplierOrders)
        .where(supplierId 
            ? and(eq(supplierOrders.userId, userId), eq(supplierOrders.supplierId, supplierId))
            : eq(supplierOrders.userId, userId))
        .orderBy(desc(supplierOrders.createdAt));

        // Map to UI friendly format
        const formattedOrders: SupplierOrder[] = results.map((order: any) => {
            const total = Number(order.montantTotal);
            const payments = Number(order.totalPayments);
            const credits = Number(order.totalCredits);
            const reste = Math.max(0, total - payments - credits);

            return {
                id: order.id,
                userId: order.userId,
                supplierId: order.supplierId,
                orderReference: order.orderReference,
                orderNumber: order.orderNumber,
                supplierName: order.fournisseur,
                supplierPhone: order.supplierPhone,
                totalAmount: total,
                totalPaidForOrder: payments,
                totalCreditsApplied: credits,
                amountPaid: payments + credits,
                resteToPay: reste,
                resteAPayer: reste,
                status: order.statut,
                deliveryStatus: order.deliveryStatus,
                createdAt: order.createdAt,
            };
        });

        return { success: true, orders: formattedOrders };
    } catch (error: any) {
        console.error("ðŸ’¥ Error fetching supplier orders (Drizzle):", error);
        return { success: false, error: "Erreur chargement commandes: " + error.message, orders: [] };
    }
});

export const createSupplierOrder = secureAction(async (userId, user, data: CreateSupplierOrderInput) => {
    try {
        console.log("ðŸ“ Creating Supplier Order (SQL):", data);

        const paid = Number(data.amountPaid) || 0;
        
        // 1. Find Supplier (SQL)
        const supplierResult = await db.select()
            .from(suppliers)
            .where(
                and(
                    eq(suppliers.userId, userId),
                    data.supplierId || data.supplierName 
                        ? or(
                            data.supplierId ? eq(suppliers.id, data.supplierId) : undefined,
                            data.supplierName ? eq(suppliers.name, data.supplierName) : undefined
                          )
                        : undefined
                )
            )
            .limit(1);
        const supplier = supplierResult[0];

        if (!supplier && !data.supplierName) {
             return { success: false, error: 'Fournisseur manquant' };
        }
        return await db.transaction(async (tx: any) => {
            // 2. Generate Order Number
            const countResult = await tx.select({ value: count() })
                .from(supplierOrders)
                .where(eq(supplierOrders.userId, userId));
            const orderCount = countResult[0]?.value || 0;
            const year = new Date().getFullYear();
            const orderNumber = `BC-${year}-${(orderCount + 1).toString().padStart(4, '0')}`;

            // 3. Calculate Due Date
            let dueDate: string | null = null;
            if (supplier?.paymentTerms && data.date) {
                const days = typeof supplier.paymentTerms === 'number' ? supplier.paymentTerms : 30;
                const date = new Date(data.date);
                date.setDate(date.getDate() + days);
                dueDate = date.toISOString();
            }
            
            // 4. Insert Order
            const insertResult = await tx.insert(supplierOrders).values({
                userId,
                fournisseur: supplier ? supplier.name : data.supplierName,
                supplierId: supplier ? supplier.id : null,
                orderReference: data.orderReference || null,
                orderNumber,
                subTotal: data.subTotal?.toString() || '0',
                discount: data.discount?.toString() || '0',
                montantTotal: data.totalAmount.toString(),
                amountPaid: paid.toString(),
                remainingAmount: (data.totalAmount - paid).toString(),
                statut: 'EN_COURS',
                deliveryStatus: 'PENDING',
                orderDate: new Date(data.date),
                dueDate: dueDate ? new Date(dueDate) : null,
                notes: data.notes || null,
                createdBy: user?.email || 'System',
                createdAt: new Date(),
            }).returning({ id: supplierOrders.id });
            
            const orderId = insertResult[0].id;

            const newOrder = { 
                id: orderId as string, 
                orderNumber, 
                fournisseur: supplier ? (supplier as any).name : data.supplierName,
                montantTotal: Number(data.totalAmount)
            };

            // 5. Insert Items into Relation Table (Step 5)
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                const itemsToInsert = data.items.map((item: any) => ({
                    orderId:   orderId,
                    productId: item.productId || null,
                    reference: item.reference || null,
                    label:     item.label || item.nomProduit || 'Produit inconnu',
                    quantity:  Number(item.quantity || 1),
                    unitPrice: item.unitPrice?.toString() || '0',
                    total:     (Number(item.quantity || 1) * Number(item.unitPrice || 0)).toString(),
                }));
                
                // Using Drizzle insert for the new schema
                await tx.insert(supplierOrderItems).values(itemsToInsert);
            }

            // ✅ Balance sync: increase supplier's debt by (total - amountPaid)
            if (supplier) {
                const debtAdded = data.totalAmount - paid;
                await tx.update(suppliers)
                    .set({
                        currentBalance: sql`${suppliers.currentBalance} + ${debtAdded.toString()}`,
                    })
                    .where(eq(suppliers.id, supplier.id));
            }

            await logSuccess(userId, 'CREATE', 'supplier_orders', String(orderId), { supplier: supplier ? (supplier as any).name : data.supplierName, total: data.totalAmount }, null);
            revalidatePath('/suppliers', 'layout');
            revalidatePath('/suppliers/[id]', 'page');
            // âœ… Ã‰tape 3 â€” Cache invalidation
            // @ts-ignore
            revalidateTag(CACHE_TAGS.supplierOrders);
            // @ts-ignore
            revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
            // @ts-ignore
            revalidateTag(CACHE_TAGS.suppliers); // balance view changes
            return { success: true, id: String(orderId), message: 'Commande crÃ©Ã©e avec succÃ¨s' };
        });

    } catch (error: any) {
        await logFailure(userId, 'CREATE_SUPPLIER_ORDER', 'supplier_orders', error.message);
        console.error("Error creating supplier order:", error);
        return { success: false, error: 'Erreur crÃ©ation commande' };
    }
});

/**
 * Confirm Reception (Full or Partial)
 */
/**
 * Confirm Reception (Full or Partial)
 */
// Core Internal Logic (Not a Server Action)
async function updateOrderReceptionCore(userId: string, user: any, orderId: string, data: { status: string; receivedItems?: any[], deliveryStatus?: string } = { status: 'REÃ‡U' }) {
    try {
        const id = orderId;
        
        await db.transaction(async (tx: any) => {
             // 1. Get Order
             const orderResult = await tx.select()
                 .from(supplierOrders)
                 .where(and(eq(supplierOrders.id, id), eq(supplierOrders.userId, userId)))
                 .for('update');
             const order = orderResult[0];
             
             if (!order) throw new Error("Commande introuvable");

             // 2. Prevent Double Counting
             if (order.statut === 'REÃ‡U' || order.deliveryStatus === 'FULL') {
                 if (data.status === 'REÃ‡U') {
                    // return; 
                 }
             }

             // 3. Update Stock (Batched)
             if (data.status === 'REÇU' || data.status === 'RECU') {
                 // Étape 5 — Lire depuis la table relationnelle
                 const items = await tx.select()
                     .from(supplierOrderItems)
                     .where(eq(supplierOrderItems.orderId, id));

                 const refs = items.map((i: any) => i.reference).filter(Boolean);
                 
                 if (refs.length > 0) {
                     // Batch lookup products
                     const matchedProducts = await tx.select()
                         .from(products)
                         .where(and(inArray(products.reference, refs), eq(products.userId, userId)))
                         .for('update');
                         
                     const productMap = new Map(matchedProducts.map((p: any) => [p.reference, p]));
                     const movementsToInsert = [];

                     for (const item of items) {
                         const product: any = productMap.get(item.reference);
                         if (product) {
                             const qty = Number(item.quantity) || 0;
                             
                             // Update stock for this product
                             await tx.update(products)
                                 .set({
                                     quantiteStock: sql`${products.quantiteStock} + ${qty}`,
                                     version: sql`${products.version} + 1`,
                                     updatedAt: new Date().toISOString()
                                 })
                                 .where(eq(products.id, product.id));

                             // Prepare movement
                             movementsToInsert.push({
                                 userId,
                                 productId: product.id,
                                 quantite: qty,
                                 type: 'Achat',
                                 notes: `Réception BC #${order.orderReference || id}`,
                                 createdAt: new Date(),
                             });

                             // Audit log
                             await logAudit({
                                 userId,
                                 entityType: 'product',
                                 entityId: product.id.toString(),
                                 action: 'UPDATE_STOCK_INBOUND',
                                 oldValue: { stock: product.quantiteStock, version: product.version },
                                 newValue: { stock: (product.quantiteStock || 0) + qty, version: (product.version || 0) + 1 },
                                 metadata: { orderId: id.toString() },
                                 success: true
                             });
                         }
                     }

                     // Batch insert movements
                     if (movementsToInsert.length > 0) {
                         await tx.insert(stockMovements).values(movementsToInsert);
                     }
                 }
             }

             // 4. Update Order Status
             await tx.update(supplierOrders)
                 .set({
                     statut: data.status,
                     deliveryStatus: data.deliveryStatus || 'FULL',
                     dateReception: new Date(),
                     updatedAt: new Date()
                 })
                 .where(eq(supplierOrders.id, id));

              // Audit order status change
              await logSuccess(userId, 'UPDATE_STATUS', 'supplier_orders', id.toString(), { status: data.status, deliveryStatus: data.deliveryStatus || 'FULL' }, order, { ...order, statut: data.status, delivery_status: data.deliveryStatus || 'FULL' });
        });

        revalidatePath('/suppliers', 'layout');
            revalidatePath('/suppliers/[id]', 'page');
        revalidatePath('/dashboard/stock');
        // âœ… Ã‰tape 3 â€” Cache invalidation
        // @ts-ignore
        revalidateTag(CACHE_TAGS.supplierOrders);
        // @ts-ignore
        revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
        // @ts-ignore
        revalidateTag(CACHE_TAGS.suppliers);
        return { success: true, message: 'RÃ©ception mise Ã  jour et stock ajustÃ©' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Confirm Reception (Full or Partial)
 */
export const updateOrderReception = secureAction(async (userId, user, orderId: string, data: { status: string; receivedItems?: any[], deliveryStatus?: string } = { status: 'REÃ‡U' }) => {
    return await updateOrderReceptionCore(userId, user, orderId, data);
});

/**
 * Confirm Reception - Bridge for legacy calls
 */
export const confirmOrderReception = secureAction(async (userId, user, orderId: string) => {
     // Use internal core logic instead of calling another server action
     return await updateOrderReceptionCore(userId, user, orderId, { status: 'REÃ‡U', deliveryStatus: 'FULL' });
});

/**
 * Delete
 */
export const deleteSupplierOrder = secureAction(async (userId, user, orderId: string) => {
    try {
        await db.transaction(async (tx: any) => {
            // Fetch order to know how much balance to reverse
            const [order] = await tx.select()
                .from(supplierOrders)
                .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)));

            if (order && order.supplierId) {
                // Reverse the outstanding debt (total - amountPaid) from supplier balance
                const debtRemoved = Number(order.montantTotal) - Number(order.amountPaid);
                if (debtRemoved > 0) {
                    await tx.update(suppliers)
                        .set({
                            currentBalance: sql`GREATEST(0, ${suppliers.currentBalance} - ${debtRemoved.toString()})`,
                        })
                        .where(and(eq(suppliers.id, order.supplierId), eq(suppliers.userId, userId)));
                }
            }

            await tx.delete(supplierOrders)
                .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)));
        });

        revalidatePath('/suppliers', 'layout');
            revalidatePath('/suppliers/[id]', 'page');
        // ✅ Cache invalidation
        // @ts-ignore
        revalidateTag(CACHE_TAGS.supplierOrders);
        // @ts-ignore
        revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
        // @ts-ignore
        revalidateTag(CACHE_TAGS.suppliers);
        return { success: true, message: 'Commande supprimée' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

import { calculateSupplierBalance } from '@/lib/supplier-balance';

export const getSupplierStats = secureAction(async (userId, user, supplierId: string) => {
    try {
        const balance = await calculateSupplierBalance(supplierId, userId);
        
        const countResult = await db.select({ value: count() })
            .from(supplierOrders)
            .where(and(eq(supplierOrders.userId, userId), eq(supplierOrders.supplierId, supplierId)));

        const stats = {
            total_ordered: balance.totalOrders,
            total_paid: balance.totalPayments + balance.totalAppliedCredits,
            total_debt: balance.balance,
            orders_count: countResult[0]?.value || 0
        };
        
        return { success: true, stats };
    } catch (error: any) {
        console.error("💥 Error fetching supplier stats:", error);
        return { success: false, error: error.message };
    }
});

/**
 * Get Global Supplier Balances
 */
export const getGlobalSupplierBalances = secureAction(async (userId) => {
    try {
        const [orderRes, paymentRes, creditRes] = await Promise.all([
            db.select({ total: sql<number>`COALESCE(SUM(${supplierOrders.montantTotal}), 0)` })
              .from(supplierOrders)
              .where(and(eq(supplierOrders.userId, userId), isNull(supplierOrders.deletedAt))),
            db.select({ total: sql<number>`COALESCE(SUM(${supplierPayments.amount}), 0)` })
              .from(supplierPayments)
              .where(and(eq(supplierPayments.userId, userId), isNull(supplierPayments.deletedAt))),
            db.select({ total: sql<number>`COALESCE(SUM(${supplierCredits.amount} - ${supplierCredits.remainingAmount}), 0)` })
              .from(supplierCredits)
              .where(eq(supplierCredits.userId, userId))
        ]);
        
        const totalPurchases = Number(orderRes[0]?.total || 0);
        const totalPayments = Number(paymentRes[0]?.total || 0);
        const totalCredits = Number(creditRes[0]?.total || 0);
        const globalDebt = Math.max(0, totalPurchases - totalPayments - totalCredits);

        return { 
            success: true, 
            data: {
                total_purchases: totalPurchases,
                total_debt: globalDebt
            }
        };
    } catch (error: any) {
        console.error("💥 Error fetching global supplier balances:", error);
        return { success: false, error: error.message };
    }
});

/**
 * Fetch all data needed to print a Bon de Commande.
 * Returns the order, its linked supplier, and shop settings.
 */
export const getSupplierOrderPrintData = secureAction(async (userId, user, orderId: string) => {
    try {
        const id = orderId; // Now a UUID string

        // 1. Fetch the supplier order
        const order = await db.query.supplierOrders.findFirst({
            where: and(eq(supplierOrders.id, id), eq(supplierOrders.userId, userId)),
            with: { supplier: true },
        });

        if (!order) {
            return { success: false, error: 'Bon de commande introuvable' };
        }

        // 2. Fetch shop settings
        const { shopProfiles } = await import('@/db/schema');
        const settingsResult = await db.query.shopProfiles.findFirst({
            where: eq(shopProfiles.userId, userId),
        });

        return {
            success: true,
            data: {
                order,
                supplier: (order as any).supplier ?? null,
                settings: settingsResult ?? null,
            },
        };
    } catch (error: any) {
        console.error('Error fetching bon de commande print data:', error);
        return { success: false, error: 'Erreur lors de la rÃ©cupÃ©ration des donnÃ©es' };
    }
});

/**
 * Fetch the most-recent supplier order for the current user and convert it
 * into a StandardDocumentData using the same adapter as the print route.
 *
 * Used by Settings â†’ ModÃ¨les Documents â†’ "Bon Cmd" tab to show real order
 * data instead of the hardcoded demo. Returns null when no orders exist yet,
 * or on any error â€” the form falls back to the demo in that case.
 */
export const getBonCommandePreviewData = secureAction(async (userId) => {
  try {
    const order = await db.query.supplierOrders.findFirst({
      where: eq(supplierOrders.userId, userId),
      orderBy: [desc(supplierOrders.createdAt)],
      with: { supplier: true },
    });

    if (!order) return null;

    const { shopProfiles } = await import('@/db/schema');
    const settings = await db.query.shopProfiles.findFirst({
      where: eq(shopProfiles.userId, userId),
    });

    const { bonCommandeAdapter } = await import('@/lib/documents/adapters');
    return bonCommandeAdapter.toStandardDocument({
      order,
      supplier: (order as any).supplier ?? null,
      settings: settings ?? null,
    });
  } catch {
    return null;
  }
});
/**
 * Fetch orders for payment selection
 */
export const getOrdersForPaymentSelect = secureAction(async (userId, user, supplierId: string) => {
    try {
        // Query orders with aggregated payments and credits
        const results = await db.select({
            id: supplierOrders.id,
            reference: sql<string>`COALESCE(${supplierOrders.orderReference}, ${supplierOrders.orderNumber}, 'BC-' || ${supplierOrders.id}::text)`,
            orderDate: supplierOrders.orderDate,
            totalAmount: supplierOrders.montantTotal,
            // Subquery for total payments allocated to this order
            totalPayments: sql<string>`(
                SELECT COALESCE(SUM(amount), 0) FROM ${supplierOrderPayments} 
                WHERE order_id = "supplier_orders"."id" AND user_id = ${userId}
            )`,
            // Subquery for total credits allocated to this order
            totalCredits: sql<string>`(
                SELECT COALESCE(SUM(amount), 0) FROM ${supplierCreditAllocations} 
                WHERE order_id = "supplier_orders"."id" AND user_id = ${userId}
            )`,
            paymentStatus: supplierOrders.paymentStatus,
        })
        .from(supplierOrders)
        .where(
            and(
                eq(supplierOrders.userId, userId),
                eq(supplierOrders.supplierId, supplierId),
                isNull(supplierOrders.deletedAt)
            )
        )
        .orderBy(desc(supplierOrders.orderDate));

        return results.map(row => {
            const total = Number(row.totalAmount);
            const payments = Number(row.totalPayments);
            const credits = Number(row.totalCredits);
            const reste = Math.max(0, total - payments - credits);

            return {
                id: row.id,
                reference: row.reference,
                orderDate: row.orderDate,
                totalAmount: total,
                totalPaidForOrder: payments,
                totalCreditsApplied: credits,
                amountPaid: payments + credits,
                remainingAmount: reste, // Consistent with frontend expectation
                resteToPay: reste,
                paymentStatus: row.paymentStatus
            };
        });
    } catch (error: any) {
        console.error("💥 Error fetching orders for selection:", error);
        return [];
    }
});

/**
 * Supplier Orders Actions - Neon/Drizzle Version
 * Secure management of supplier orders
 */

'use server';


import { db } from '@/db';
import { supplierOrders, suppliers, supplierPayments, supplierOrderPayments, products, stockMovements, supplierOrderItems, reminders } from '@/db/schema';
import { eq, and, or, desc, sql, sum, count, isNull } from 'drizzle-orm';
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
    amountPaid: number;
    resteAPayer: number;
    status: string | null;
    deliveryStatus: string | null;
    createdAt: Date | null;
    items?: any;
};

/**
 * Get Supplier Orders
 */
export const getSupplierOrders = secureAction(async (userId, user, supplierId?: string) => {
    try {
        const results = await db.query.supplierOrders.findMany({
            where: supplierId 
                ? and(eq(supplierOrders.userId, userId), eq(supplierOrders.supplierId, supplierId))
                : eq(supplierOrders.userId, userId),
            orderBy: [desc(supplierOrders.createdAt)],
        });

        // Map to UI friendly format
        const formattedOrders: SupplierOrder[] = results.map((order: any) => ({
            id: order.id,
            userId: order.userId,
            supplierId: order.supplierId,
            orderReference: order.orderReference,
            orderNumber: order.orderNumber,
            supplierName: order.fournisseur,
            supplierPhone: order.supplierPhone,
            totalAmount: Number(order.montantTotal),
            amountPaid: Number(order.amountPaid),
            resteAPayer: Number(order.remainingAmount),
            status: order.statut,
            deliveryStatus: order.deliveryStatus,
            createdAt: order.createdAt,
            items: order.items
        }));

        return { success: true, orders: formattedOrders };
    } catch (error: any) {
        console.error("💥 Error fetching supplier orders (Drizzle):", error);
        return { success: false, error: "Erreur chargement commandes: " + error.message, orders: [] };
    }
});

export const createSupplierOrder = secureAction(async (userId, user, data: any) => {
    try {
        console.log("📝 Creating Supplier Order (SQL):", data);

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

            // Update Supplier Balance if needed? 
            // Request says "current_balance" on supplier.
            // If we mark it as "Credit" purchase, we should increase debt.
            // Logic: Total Amount increases supplier balance (we owe them).
            if (supplier) {
                // If 'paid' < 'total', the difference is debt.
                // Actually usually the whole Invoice amount is added to balance, and Payments reduce it.
                // But here we might just track "Reste à payer".
                // Let's simpler:
                /* 
                await tx.update(suppliers)
                  .set({ 
                      currentBalance: sql`${suppliers.currentBalance} + ${data.totalAmount}`
                  }) 
                  .where(eq(suppliers.id, supplier.id));
                */
               // Leave out for now to avoid double logic with payments until fully tested.
            }

            await logSuccess(userId, 'CREATE', 'supplier_orders', String(orderId), { supplier: supplier ? (supplier as any).name : data.supplierName, total: data.totalAmount }, null);
            revalidatePath('/dashboard/supplier-orders');
            // ✅ Étape 3 — Cache invalidation
            // @ts-ignore
            revalidateTag(CACHE_TAGS.supplierOrders);
            // @ts-ignore
            revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
            // @ts-ignore
            revalidateTag(CACHE_TAGS.suppliers); // balance view changes
            return { success: true, id: String(orderId), message: 'Commande créée avec succès' };
        });

    } catch (error: any) {
        await logFailure(userId, 'CREATE_SUPPLIER_ORDER', 'supplier_orders', error.message);
        console.error("Error creating supplier order:", error);
        return { success: false, error: 'Erreur création commande' };
    }
});

/**
 * Confirm Reception (Full or Partial)
 */
/**
 * Confirm Reception (Full or Partial)
 */
// Core Internal Logic (Not a Server Action)
async function updateOrderReceptionCore(userId: string, user: any, orderId: string, data: { status: string; receivedItems?: any[], deliveryStatus?: string } = { status: 'REÇU' }) {
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
             if (order.statut === 'REÇU' || order.deliveryStatus === 'FULL') {
                 if (data.status === 'REÇU') {
                    // return; 
                 }
             }

             // 3. Update Stock
             if (data.status === 'REÇU') {
                 // ✅ Étape 5 — Lire depuis la table relationnelle
                 const items = await tx.select()
                     .from(supplierOrderItems)
                     .where(eq(supplierOrderItems.orderId, id));
                 
                 for (const item of items) {
                      if (!item.reference) continue;

                      const productResult = await tx.select()
                          .from(products)
                          .where(and(eq(products.reference, item.reference), eq(products.userId, userId)))
                          .for('update');
                      const product = productResult[0];
                      
                      if (product) {
                           const qty = Number(item.quantity) || 0;
                           
                           await tx.update(products)
                               .set({
                                   quantiteStock: sql`${products.quantiteStock} + ${qty}`,
                                   version: sql`${products.version} + 1`,
                                   updatedAt: new Date().toISOString()
                               })
                               .where(eq(products.id, product.id));

                           await tx.insert(stockMovements).values({
                               userId,
                               productId: product.id,
                               quantite: qty,
                               type: 'Achat',
                               notes: `Réception BC #${order.orderReference || id}`,
                               createdAt: new Date(),
                           });

                          // Audit log product
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

        revalidatePath('/dashboard/supplier-orders');
        revalidatePath('/dashboard/stock');
        // ✅ Étape 3 — Cache invalidation
        // @ts-ignore
        revalidateTag(CACHE_TAGS.supplierOrders);
        // @ts-ignore
        revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
        // @ts-ignore
        revalidateTag(CACHE_TAGS.suppliers);
        return { success: true, message: 'Réception mise à jour et stock ajusté' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Confirm Reception (Full or Partial)
 */
export const updateOrderReception = secureAction(async (userId, user, orderId: string, data: { status: string; receivedItems?: any[], deliveryStatus?: string } = { status: 'REÇU' }) => {
    return await updateOrderReceptionCore(userId, user, orderId, data);
});

/**
 * Confirm Reception - Bridge for legacy calls
 */
export const confirmOrderReception = secureAction(async (userId, user, orderId: string) => {
     // Use internal core logic instead of calling another server action
     return await updateOrderReceptionCore(userId, user, orderId, { status: 'REÇU', deliveryStatus: 'FULL' });
});

/**
 * Delete
 */
export const deleteSupplierOrder = secureAction(async (userId, user, orderId: string) => {
    try {
        await db.delete(supplierOrders)
            .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)));
            
        revalidatePath('/dashboard/supplier-orders');
        // ✅ Étape 3 — Cache invalidation
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

/**
 * 4. Supplier Dashboard Stats (Requirement 4)
 */
export const getSupplierStats = secureAction(async (userId, user, supplierId: string) => {
    try {
        const result = await db.select({
            total_ordered: sum(supplierOrders.montantTotal),
            total_paid: sum(supplierOrders.amountPaid),
            total_debt: sum(supplierOrders.remainingAmount),
            orders_count: count()
        })
        .from(supplierOrders)
        .where(and(eq(supplierOrders.userId, userId), eq(supplierOrders.supplierId, supplierId)));
        
        const stats = result[0] || { total_ordered: 0, total_paid: 0, total_debt: 0, orders_count: 0 };
        
        // Convert strings to numbers
        const mutableStats = stats as Record<string, unknown>;
        Object.keys(mutableStats).forEach(key => {
            if (key !== 'orders_count') {
                mutableStats[key] = Number(mutableStats[key] || 0);
            }
        });

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
        const result = await db.select({
            total_purchases: sum(supplierOrders.montantTotal),
            total_debt: sum(supplierOrders.remainingAmount)
        })
        .from(supplierOrders)
        .where(eq(supplierOrders.userId, userId));
        
        const data = result[0] || { total_purchases: 0, total_debt: 0 };

        return { 
            success: true, 
            data: {
                total_purchases: Number(data.total_purchases || 0),
                total_debt: Number(data.total_debt || 0)
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
        return { success: false, error: 'Erreur lors de la récupération des données' };
    }
});

/**
 * Fetch the most-recent supplier order for the current user and convert it
 * into a StandardDocumentData using the same adapter as the print route.
 *
 * Used by Settings → Modèles Documents → "Bon Cmd" tab to show real order
 * data instead of the hardcoded demo. Returns null when no orders exist yet,
 * or on any error — the form falls back to the demo in that case.
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
        const results = await db.select({
            id: supplierOrders.id,
            reference: sql<string>`COALESCE(${supplierOrders.orderReference}, ${supplierOrders.orderNumber}, 'BC-' || ${supplierOrders.id}::text)`,
            orderDate: supplierOrders.orderDate,
            totalAmount: supplierOrders.montantTotal,
            amountPaid: supplierOrders.amountPaid,
            remainingAmount: supplierOrders.remainingAmount,
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

        return results.map(row => ({
            id: row.id,
            reference: row.reference,
            orderDate: row.orderDate,
            totalAmount: Number(row.totalAmount),
            amountPaid: Number(row.amountPaid),
            remainingAmount: Number(row.remainingAmount),
            paymentStatus: row.paymentStatus
        }));
    } catch (error: any) {
        console.error("💥 Error fetching orders for selection:", error);
        return [];
    }
});

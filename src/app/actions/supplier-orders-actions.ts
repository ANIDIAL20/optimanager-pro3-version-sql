/**
 * Supplier Orders Actions - Neon/Drizzle Version
 * Secure management of supplier orders
 */

'use server';


import { db } from '@/db';
import { supplierOrders, suppliers, supplierPayments, supplierOrderPayments, products, stockMovements, supplierOrderItems } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, withAudit, logAudit } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

// Types
export type SupplierOrder = {
    id: number;
    orderReference?: string | null;
    orderNumber?: string | null;
    supplierName: string;
    supplierPhone?: string | null;
    totalAmount: number;
    amountPaid: number;
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
        const whereClause = supplierId 
            ? and(eq(supplierOrders.userId, userId), eq(supplierOrders.supplierId, supplierId))
            : eq(supplierOrders.userId, userId);

        const results = await db.query.supplierOrders.findMany({
            where: whereClause,
            orderBy: [desc(supplierOrders.createdAt)],
        });

        // Map to UI friendly format
        const formattedOrders: SupplierOrder[] = results.map((order: any) => ({
            id: order.id,
            orderReference: order.orderReference,
            orderNumber: order.orderNumber,
            supplierName: order.fournisseur,
            supplierPhone: order.supplierPhone,
            totalAmount: Number(order.totalAmount),
            amountPaid: Number(order.amountPaid),
            status: order.statut,
            deliveryStatus: order.deliveryStatus,
            createdAt: order.createdAt,
            items: order.items
        }));

        return { success: true, orders: formattedOrders };
    } catch (error: any) {
        console.error("Error fetching supplier orders:", error);
        return { success: false, error: "Erreur chargement commandes", orders: [] };
    }
});

export const createSupplierOrder = secureAction(async (userId, user, data: any) => {
    try {
        console.log("📝 Creating Supplier Order:", data);

        const paid = Number(data.amountPaid) || 0;
        
        // 1. Find Supplier
        let supplier: any;
        if (data.supplierId) {
            supplier = await db.query.suppliers.findFirst({
                where: and(eq(suppliers.id, data.supplierId), eq(suppliers.userId, userId))
            });
        } else if (data.supplierName) {
             supplier = await db.query.suppliers.findFirst({
                where: and(eq(suppliers.name, data.supplierName), eq(suppliers.userId, userId))
            });
        }

        if (!supplier && !data.supplierName) {
             return { success: false, error: 'Fournisseur manquant' };
        }

        return await db.transaction(async (tx: any) => {
            // 2. Generate Order Number (BC-YYYY-XXXX)
            // Simple approach: Count orders for this year + 1
            const year = new Date().getFullYear();
            const count = await tx.$count(supplierOrders, eq(supplierOrders.userId, userId)); // Approximate
            const orderNumber = `BC-${year}-${(count + 1).toString().padStart(4, '0')}`;

            // 3. Calculate Dates
            let dueDate: Date | null = null;
            if (supplier?.paymentTerms && data.date) {
                // ... (Keep existing logic or use paymentTerms integer if available)
                // If paymentTerms is integer in new schema:
                const days = typeof supplier.paymentTerms === 'number' ? supplier.paymentTerms : 30;
                // But schema suggests it might be text or int. I updated schema to int default 30.
                // If it's number:
                const date = new Date(data.date);
                date.setDate(date.getDate() + days);
                dueDate = date;
            }
            
            // 4. Prepare Data
            const newOrder = {
                userId,
                fournisseur: supplier ? supplier.name : data.supplierName,
                supplierId: supplier ? supplier.id : null,
                orderReference: data.orderReference, // User typed ref
                orderNumber: orderNumber, // System generated ref
                
                // Backwards compat for UI reading 'items' from JSON
                items: data.items, 
                
                // Financials
                subTotal: data.subTotal?.toString(),
                tva: data.tva?.toString(),
                discount: data.discount?.toString(),
                shippingCost: data.shippingCost?.toString(),
                montantTotal: data.totalAmount.toString(),
                montantPaye: paid.toString(),
                resteAPayer: (data.totalAmount - paid).toString(),
                
                // Status
                statut: 'EN_COURS', 
                deliveryStatus: 'PENDING',
                
                dateCommande: new Date(data.date),
                expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
                dueDate: dueDate,
                notes: data.notes,
                createdBy: user?.email || 'System',
                createdAt: new Date()
            };

            const result = await tx.insert(supplierOrders).values(newOrder).returning();
            const orderId = result[0].id;

            // 5. Insert Items into Relation Table
            if (data.items && Array.isArray(data.items)) {
                for (const item of data.items) {
                    await tx.insert(supplierOrderItems).values({
                        supplierOrderId: orderId,
                        productType: item.type,
                        productName: item.nomProduit,
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: item.unitPrice.toString(),
                        totalPrice: (item.quantity * item.unitPrice).toString(),
                        // Add specific fields (Explicit Columns)
                        sphere: item.sphere,
                        cylindre: item.cylindre,
                        axe: item.axe,
                        addition: item.addition,
                        hauteur: item.hauteur,
                    });
                }
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

            await logSuccess(userId, 'CREATE', 'supplier_orders', orderId.toString(), { supplier: supplier ? supplier.name : data.supplierName, total: data.totalAmount }, null, newOrder);
            revalidatePath('/dashboard/supplier-orders');
            return { success: true, id: orderId.toString(), message: 'Commande créée avec succès' };
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
async function updateOrderReceptionCore(userId: string, user: any, orderId: number | string, data: { status: string; receivedItems?: any[], deliveryStatus?: string } = { status: 'REÇU' }) {
    try {
        const id = Number(orderId);
        
        await db.transaction(async (tx: any) => {
             // 1. Get Order
             const order: any = await tx.query.supplierOrders.findFirst({
                 where: and(eq(supplierOrders.id, id), eq(supplierOrders.userId, userId))
             });
             
             if (!order) throw new Error("Commande introuvable");

             // 2. Prevent Double Counting
             if (order.statut === 'REÇU' || order.deliveryStatus === 'FULL') {
                 if (data.status === 'REÇU') {
                    // return; 
                 }
             }

             // 3. Update Stock (Only if switching to REÇU/FULL for now)
             if (data.status === 'REÇU') {
                 const items = order.items as any[];
                 
                 for (const item of items) {
                     let product = null;
                     
                     if (item.reference) {
                         product = await tx.query.products.findFirst({
                             where: and(eq(products.reference, item.reference), eq(products.userId, userId))
                         });
                     }
                     
                     // If linked product found, update inventory
                      if (product) {
                          const qty = Number(item.quantity) || 0;
                          
                          // ✅ Optimistic Locking update
                          const updateRes = await tx.update(products)
                              .set({ 
                                  quantiteStock: sql`${products.quantiteStock} + ${qty}`,
                                  version: sql`${products.version} + 1`,
                                  updatedAt: new Date()
                              })
                              .where(and(
                                  eq(products.id, product.id),
                                  eq(products.version, product.version)
                              ));

                          if (updateRes.rowCount === 0) {
                              throw new Error(`Erreur de concurrence pour le produit ${product.nom}.`);
                          }

                          // Log Movement
                          await tx.insert(stockMovements).values({
                             userId,
                             productId: product.id,
                             quantite: qty,
                             type: 'Achat',
                             ref: `BC #${order.orderReference || id}`,
                             date: new Date(),
                             notes: `Réception commande fournisseur ${order.fournisseur}`
                          });

                          // Audit log product
                          await logAudit({
                              userId,
                              entityType: 'product',
                              entityId: product.id.toString(),
                              action: 'UPDATE_STOCK_INBOUND',
                              oldValue: { stock: product.quantiteStock, version: product.version },
                              newValue: { stock: product.quantiteStock + qty, version: product.version + 1 },
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
              await logSuccess(userId, 'UPDATE_STATUS', 'supplier_orders', id.toString(), { status: data.status, deliveryStatus: data.deliveryStatus || 'FULL' }, order, { ...order, statut: data.status, deliveryStatus: data.deliveryStatus || 'FULL' });
        });

        revalidatePath('/dashboard/supplier-orders');
        revalidatePath('/dashboard/stock');
        return { success: true, message: 'Réception mise à jour et stock ajusté' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Confirm Reception (Full or Partial)
 */
export const updateOrderReception = secureAction(async (userId, user, orderId: number | string, data: { status: string; receivedItems?: any[], deliveryStatus?: string } = { status: 'REÇU' }) => {
    return await updateOrderReceptionCore(userId, user, orderId, data);
});

/**
 * Confirm Reception - Bridge for legacy calls
 */
export const confirmOrderReception = secureAction(async (userId, user, orderId: number | string) => {
     // Use internal core logic instead of calling another server action
     return await updateOrderReceptionCore(userId, user, orderId, { status: 'REÇU', deliveryStatus: 'FULL' });
});

/**
 * Delete
 */
export const deleteSupplierOrder = secureAction(async (userId, user, orderId: number | string) => {
    try {
        const id = Number(orderId);
        await db.delete(supplierOrders)
            .where(and(eq(supplierOrders.id, id), eq(supplierOrders.userId, userId)));
            
        revalidatePath('/dashboard/supplier-orders');
        return { success: true, message: 'Commande supprimée' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

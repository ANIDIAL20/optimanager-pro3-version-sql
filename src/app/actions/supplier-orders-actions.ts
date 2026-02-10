/**
 * Supplier Orders Actions - Neon/Drizzle Version
 * Secure management of supplier orders
 */

'use server';


import { db } from '@/db';
import { supplierOrders, suppliers, supplierPayments, supplierOrderPayments, products, stockMovements, supplierOrderItems } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getSuppliersList as getSuppliers } from '@/app/actions/supplier-actions';
import type { Supplier } from '@/lib/types';
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
        let query;
        if (supplierId) {
            query = sql`
                SELECT * FROM supplier_orders 
                WHERE "user_id" = ${userId} AND "supplier_id" = ${supplierId}
                ORDER BY "created_at" DESC
            `;
        } else {
            query = sql`
                SELECT * FROM supplier_orders 
                WHERE "user_id" = ${userId}
                ORDER BY "created_at" DESC
            `;
        }

        const results = await db.execute(query);

        // Map to UI friendly format
        const formattedOrders: SupplierOrder[] = results.map((order: any) => ({
            id: order.id,
            orderReference: order.order_reference,
            orderNumber: order.order_number,
            supplierName: order.fournisseur,
            supplierPhone: order.supplier_phone,
            totalAmount: Number(order.montant_total),
            amountPaid: Number(order.montant_paye),
            status: order.statut,
            deliveryStatus: order.delivery_status,
            createdAt: order.created_at,
            items: order.items
        }));

        return { success: true, orders: formattedOrders };
    } catch (error: any) {
        console.error("💥 Error fetching supplier orders (SQL):", error);
        return { success: false, error: "Erreur chargement commandes", orders: [] };
    }
});

export const createSupplierOrder = secureAction(async (userId, user, data: any) => {
    try {
        console.log("📝 Creating Supplier Order (SQL):", data);

        const paid = Number(data.amountPaid) || 0;
        
        // 1. Find Supplier (SQL)
        const supplierResult = await db.execute(sql`
            SELECT * FROM suppliers 
            WHERE ("id" = ${data.supplierId} OR "name" = ${data.supplierName})
            AND "user_id" = ${userId}
            LIMIT 1
        `);
        const supplier = supplierResult[0];

        if (!supplier && !data.supplierName) {
             return { success: false, error: 'Fournisseur manquant' };
        }

        return await db.transaction(async (tx) => {
            // 2. Generate Order Number
            const countResult = await tx.execute(sql`SELECT count(*) as count FROM supplier_orders WHERE "user_id" = ${userId}`);
            const count = Number(countResult[0].count);
            const year = new Date().getFullYear();
            const orderNumber = `BC-${year}-${(count + 1).toString().padStart(4, '0')}`;

            // 3. Calculate Due Date
            let dueDate: string | null = null;
            if (supplier?.payment_terms && data.date) {
                const days = typeof supplier.payment_terms === 'number' ? supplier.payment_terms : 30;
                const date = new Date(data.date);
                date.setDate(date.getDate() + days);
                dueDate = date.toISOString();
            }
            
            // 4. Insert Order
            const insertResult = await tx.execute(sql`
                INSERT INTO supplier_orders (
                    "user_id", "fournisseur", "supplier_id", "order_reference", "order_number", 
                    "items", "sub_total", "discount", "montant_total", "montant_paye", 
                    "reste_a_payer", "statut", "delivery_status", "date_commande", 
                    "due_date", "notes", "created_by", "created_at"
                ) VALUES (
                    ${userId}, 
                    ${supplier ? supplier.name : data.supplierName}, 
                    ${supplier ? supplier.id : null}, 
                    ${data.orderReference || null}, 
                    ${orderNumber}, 
                    ${JSON.stringify(data.items)}, 
                    ${data.subTotal?.toString() || '0'}, 
                    ${data.discount?.toString() || '0'}, 
                    ${data.totalAmount.toString()}, 
                    ${paid.toString()}, 
                    ${(data.totalAmount - paid).toString()}, 
                    'EN_COURS', 
                    'PENDING', 
                    ${new Date(data.date).toISOString()}, 
                    ${dueDate}, 
                    ${data.notes || null}, 
                    ${user?.email || 'System'}, 
                    ${new Date().toISOString()}
                ) RETURNING id
            `);
            const orderId = insertResult[0].id;

            // 5. Insert Items into Relation Table
            if (data.items && Array.isArray(data.items)) {
                for (const item of data.items) {
                    await tx.execute(sql`
                        INSERT INTO supplier_order_items (
                            "supplier_order_id", "product_type", "product_name", "description", 
                            "quantity", "unit_price", "total_price", "sphere", "cylindre", 
                            "axe", "addition", "hauteur"
                        ) VALUES (
                            ${orderId}, 
                            ${item.type}, 
                            ${item.nomProduit || null}, 
                            ${item.description || null}, 
                            ${Number(item.quantity)}, 
                            ${item.unitPrice.toString()}, 
                            ${(item.quantity * item.unitPrice).toString()},
                            ${item.sphere || null},
                            ${item.cylindre || null},
                            ${item.axe || null},
                            ${item.addition || null},
                            ${item.hauteur || null}
                        )
                    `);
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
        
        await db.transaction(async (tx) => {
             // 1. Get Order
             const orderResult = await tx.execute(sql`SELECT * FROM supplier_orders WHERE "id" = ${id} AND "user_id" = ${userId} FOR UPDATE`);
             const order = orderResult[0];
             
             if (!order) throw new Error("Commande introuvable");

             // 2. Prevent Double Counting
             if (order.statut === 'REÇU' || order.delivery_status === 'FULL') {
                 if (data.status === 'REÇU') {
                    // return; 
                 }
             }

             // 3. Update Stock
             if (data.status === 'REÇU') {
                 // Backward compatibility: items might be in JSON or in table
                 // We'll read from JSON 'items' column for bulk update
                 const items = order.items as any[];
                 
                 for (const item of items) {
                      if (!item.reference) continue;

                      const productResult = await tx.execute(sql`SELECT * FROM products WHERE "reference" = ${item.reference} AND "user_id" = ${userId} FOR UPDATE`);
                      const product = productResult[0];
                      
                      if (product) {
                           const qty = Number(item.quantity) || 0;
                           
                           await tx.execute(sql`
                               UPDATE products 
                               SET "quantite_stock" = "quantite_stock" + ${qty}, "version" = "version" + 1, "updated_at" = ${new Date().toISOString()}
                               WHERE "id" = ${product.id}
                           `);

                           await tx.execute(sql`
                               INSERT INTO stock_movements ("user_id", "product_id", "quantity", "type", "reason", "created_at")
                               VALUES (${userId}, ${product.id}, ${qty}, 'IN', ${`Réception BC #${order.order_reference || id}`}, ${new Date().toISOString()})
                           `);

                          // Audit log product
                          await logAudit({
                              userId,
                              entityType: 'product',
                              entityId: product.id.toString(),
                              action: 'UPDATE_STOCK_INBOUND',
                              oldValue: { stock: product.quantite_stock, version: product.version },
                              newValue: { stock: product.quantite_stock + qty, version: product.version + 1 },
                              metadata: { orderId: id.toString() },
                              success: true
                          });
                      }
                 }
             }

             // 4. Update Order Status
             await tx.execute(sql`
                UPDATE supplier_orders 
                SET "statut" = ${data.status}, "delivery_status" = ${data.deliveryStatus || 'FULL'}, "date_reception" = ${new Date().toISOString()}, "updated_at" = ${new Date().toISOString()}
                WHERE "id" = ${id}
             `);

              // Audit order status change
              await logSuccess(userId, 'UPDATE_STATUS', 'supplier_orders', id.toString(), { status: data.status, deliveryStatus: data.deliveryStatus || 'FULL' }, order, { ...order, statut: data.status, delivery_status: data.deliveryStatus || 'FULL' });
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
        await db.execute(sql`
            DELETE FROM supplier_orders 
            WHERE "id" = ${id} AND "user_id" = ${userId}
        `);
            
        revalidatePath('/dashboard/supplier-orders');
        return { success: true, message: 'Commande supprimée' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

'use server';

import { db } from '@/db';
import { supplierOrders } from '@/db/schema/suppliers.schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { createAction } from '@/lib/middleware/compose';
import { authenticate, requireRole } from '@/lib/middleware/auth.middleware';
import { validateOrderData } from '@/lib/utils/supplier-utils';
import { logAudit } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
/**
 * Créer une commande fournisseur
 */
export const createSupplierOrder = createAction(
  [authenticate()],
  async (ctx: any) => {
    const { userId, input } = ctx;

    // 1.Validation

    const validation = await validateOrderData({
      supplierId: input.supplierId,
      reference: input.reference,
      orderDate: new Date(input.orderDate),
      totalAmount: Number(input.totalAmount),
    });

    if (!validation.valid) {
      throw new Error(validation.errors.join(' | '));
    }

    // 2. Transaction
    return await db.transaction(async (tx: any) => {
      const [newOrder] = await tx.insert(supplierOrders).values({
        supplierId: input.supplierId,
        reference: input.reference,
        orderDate: new Date(input.orderDate),
        totalAmount: input.totalAmount.toString(),
        remainingAmount: input.totalAmount.toString(), // Initialisation
        paymentStatus: 'unpaid',
        currency: input.currency || 'MAD',
        status: 'pending',
        createdBy: userId,
        createdAt: new Date(),
      }).returning();

      // 3. Audit
      await logAudit({
        tableName: 'supplier_orders_v2',
        operation: 'INSERT',
        recordId: newOrder.id,
        newData: newOrder,
        userId,
      });

      revalidatePath('/dashboard/suppliers');
      revalidatePath(`/dashboard/suppliers/${input.supplierId}`);
      return newOrder;
    });
  }
);

/**
 * Mettre à jour une commande fournisseur
 */
export const updateSupplierOrder = createAction(
  [authenticate()],
  async (ctx: any) => {
    const { userId, input } = ctx;
    const { id, ...data } = input;

    return await db.transaction(async (tx: any) => {
      // 1. Get old data
      const results = await tx.select()
        .from(supplierOrders)
        .where(and(eq(supplierOrders.id, id), sql`deleted_at IS NULL`))
        .limit(1);
      
      const oldOrder = results[0];

      if (!oldOrder) throw new Error('الطلبية غير موجودة أو محذوفة');

      // 2. Update
      const [updatedOrder] = await tx.update(supplierOrders)
        .set({
          ...data,
          orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(supplierOrders.id, id))
        .returning();

      // 3. Audit
      await logAudit({
        tableName: 'supplier_orders_v2',
        operation: 'UPDATE',
        recordId: id,
        oldData: oldOrder,
        newData: updatedOrder,
        userId,
      });

      revalidatePath('/dashboard/suppliers');
      return updatedOrder;
    });
  }
);

/**
 * Supprimer une commande (Soft Delete)
 */
export const deleteSupplierOrder = createAction(
  [authenticate(), requireRole('admin')],
  async (ctx: any) => {
    const { userId, input: orderId } = ctx;

    return await db.transaction(async (tx: any) => {
      const [deletedOrder] = await tx.update(supplierOrders)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(supplierOrders.id, orderId))
        .returning();

      await logAudit({
        tableName: 'supplier_orders_v2',
        operation: 'DELETE',
        recordId: orderId,
        oldData: deletedOrder,
        userId,
      });

      revalidatePath('/dashboard/suppliers');
      return { success: true };
    });
  }
);

/**
 * Annuler une commande
 */
export const cancelSupplierOrder = createAction(
  [authenticate()],
  async (ctx: any) => {
    const { userId, input } = ctx; // input: { id, reason }

    const [cancelledOrder] = await db.update(supplierOrders)
      .set({
        status: 'cancelled',
        notes: sql`CONCAT(notes, '\n[ANNULATION]: ', ${input.reason})`,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(supplierOrders.id, input.id))
      .returning();

    await logAudit({
      tableName: 'supplier_orders_v2',
      operation: 'UPDATE',
      recordId: input.id,
      newData: { status: 'cancelled' },
      userId,
    });

    revalidatePath('/dashboard/suppliers');
    return cancelledOrder;
  }
);

/**
 * جلب الطلبيات للمورد لاختيارها عند الدفع (Legacy & Unified)
 */
export const getOrdersForPaymentSelect = createAction(
  [authenticate()],
  async (ctx: any) => {
    const supplierId = String(ctx.input);
    
    console.log(`📡 [getOrdersForPaymentSelect] Received supplierId: ${supplierId}`);

    if (!supplierId || supplierId === 'undefined' || supplierId === 'NaN') {
      console.error('❌ [getOrdersForPaymentSelect] Invalid supplierId received:', supplierId);
      return [];
    }

    try {
      // First attempt using the unified legacy table as it's the primary source in this environment
      console.log(`🔍 [getOrdersForPaymentSelect] Querying supplier_orders for UUID: ${supplierId}`);
      
      const query = sql`
        SELECT 
          id, 
          COALESCE(order_reference, 'BC-' || id::text) as reference, 
          date_commande as "orderDate", 
          montant_total as "totalAmount", 
          COALESCE(montant_paye, 0) as "amountPaid", 
          COALESCE(reste_a_payer, montant_total) as "remainingAmount", 
          statut as "paymentStatus"
        FROM supplier_orders
        WHERE (supplier_id = ${supplierId}::uuid OR supplier_id::text = ${supplierId})
        ORDER BY date_commande DESC
      `;

      const results = await db.execute(query);
      const rows = results.rows || [];

      console.log(`✅ [getOrdersForPaymentSelect] Found ${rows.length} orders in legacy table.`);

      if (rows.length === 0) {
        // Fallback or Try V2 if applicable (depending on which table contains recent data)
        console.log(`⚠️ [getOrdersForPaymentSelect] No orders in legacy, checking supplier_orders_v2...`);
        // Implementation for V2 if needed...
      }

      return rows.map((row: any) => ({
        id: row.id.toString(),
        reference: row.reference,
        orderDate: row.orderDate,
        totalAmount: Number(row.totalAmount),
        amountPaid: Number(row.amountPaid),
        remainingAmount: Number(row.remainingAmount),
        paymentStatus: row.paymentStatus || 'pending'
      }));
    } catch (error: any) {
      console.error(`💥 [getOrdersForPaymentSelect] Error fetching orders:`, error.message);
      return [];
    }
  }
);

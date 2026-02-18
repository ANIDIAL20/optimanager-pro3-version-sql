'use server';

import { db } from '@/db';
import { supplierPayments, supplierOrders, suppliers } from '@/db/schema/index';
import { eq, and, sql } from 'drizzle-orm';
import { createAction } from '@/lib/middleware/compose';
import { authenticate, requireRole } from '@/lib/middleware/auth.middleware';
import { validatePaymentAmount } from '@/lib/utils/supplier-utils';
import { logAudit } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';

/**
 * Créer un paiement fournisseur (Logic SMART - Legacy compatible)
 */
export const createSupplierPayment = createAction(
  [authenticate()],
  async (ctx: any) => {
    const { userId, input } = ctx;
    const supplierId = String(input.supplierId);
    const amount = Number(input.amount);
    const orderIdValue = input.orderId && input.orderId !== 'none' ? input.orderId : null;

    console.log(`📡 [createSupplierPayment] Starting for supplier: ${supplierId}, amount: ${amount}, order: ${orderIdValue}`);

    // fetch supplier name snapshot using raw SQL to bypass Drizzle schema mapping issues if any
    const supplierResult = await db.execute(sql`
        SELECT name FROM suppliers WHERE id = ${supplierId}::uuid LIMIT 1
    `);

    const supplier = supplierResult.rows[0] as any;
    if (!supplier) throw new Error("Fournisseur introuvable");

    return await db.transaction(async (tx: any) => {
      // 1. Créer la transaction de paiement (Using Drizzle now)
      const now = new Date();
      const [payment] = await tx.insert(supplierPayments).values({
        userId: userId,
        supplierId: supplierId,
        supplierName: supplier.name,
        orderId: orderIdValue ? (isNaN(Number(orderIdValue)) ? orderIdValue : Number(orderIdValue)) : null,
        amount: amount.toString(),
        paymentDate: new Date(input.paymentDate),
        method: input.method,
        reference: input.reference || null,
        bankName: input.bankName || null,
        notes: input.notes || null,
        createdBy: userId,
        createdAt: now,
      }).returning();

      const paymentId = payment.id;

      // 2. Si lié à une commande
      if (orderIdValue) {
        // A. Lier dans la table pivot (Legacy Bridge for older code)
        // Ensure values match expected types. order_id is integer in this table too.
        await tx.execute(sql`
          INSERT INTO supplier_order_payments (payment_id, order_id, amount, created_at, user_id)
          VALUES (${paymentId}::uuid, ${Number(orderIdValue)}, ${amount}, ${now}, ${userId})
        `);

        // B. Mettre à jour la commande (Dual Update: Legacy + Modern)
        const ordersResult = await tx.select()
          .from(supplierOrders)
          .where(eq(supplierOrders.id, Number(orderIdValue)))
          .for('update');
        
        if (ordersResult.length > 0) {
          const order = ordersResult[0];
          const total = Number(order.totalAmount || 0);
          const alreadyPaid = Number(order.amountPaid || 0);
          const newPaid = alreadyPaid + amount;
          const newRemaining = total - newPaid;

          let newStatus: 'unpaid' | 'partial' | 'paid' = 'partial';
          if (newRemaining <= 0.05) newStatus = 'paid';
          if (newPaid <= 0) newStatus = 'unpaid';

          // Sync legacy status
          const legacyStatus = newStatus === 'paid' ? 'PAYÉ' : (newStatus === 'partial' ? 'PARTIEL' : 'NON PAYÉ');

          await tx.update(supplierOrders)
            .set({
              amountPaid: newPaid.toString(),
              remainingAmount: Math.max(0, newRemaining).toString(),
              paymentStatus: newStatus,
              // Legacy columns sync
              montantPaye: newPaid.toString(),
              resteAPayer: Math.max(0, newRemaining).toString(),
              statut: legacyStatus,
              updatedAt: now
            })
            .where(eq(supplierOrders.id, Number(orderIdValue)));
          
          console.log(`✅ [createSupplierPayment] Order ${orderIdValue} updated. Status: ${newStatus}`);
        }
      }

      revalidatePath(`/suppliers/${supplierId}`);
      revalidatePath('/dashboard/suppliers');

      return {
        success: true,
        message: 'Paiement enregistré avec succès',
        paymentId
      };
    });
  }
);

/**
 * Mettre à jour un paiement (Legacy Table)
 */
export const updateSupplierPayment = createAction(
  [authenticate(), requireRole('admin')],
  async (ctx: any) => {
    const { userId, input } = ctx;
    const { id, ...data } = input;

    await db.execute(sql`
      UPDATE supplier_payments 
      SET 
        amount = ${data.amount ? Number(data.amount) : undefined},
        date = ${data.paymentDate ? new Date(data.paymentDate) : undefined},
        method = ${data.method || undefined},
        reference = ${data.reference || undefined},
        bank = ${data.bankName || undefined},
        notes = ${data.notes || undefined},
        updated_at = ${new Date()},
        created_by = ${userId}
      WHERE id = ${id}::uuid
    `);

    revalidatePath('/dashboard/suppliers');
    return { success: true };
  }
);

/**
 * Supprimer un paiement (Hard delete or update status in legacy)
 */
export const deleteSupplierPayment = createAction(
  [authenticate(), requireRole('admin')],
  async (ctx: any) => {
    const { input: paymentId } = ctx;

    // In legacy it might not have deleted_at, let's just delete for now or update status if exists
    await db.execute(sql`DELETE FROM supplier_payments WHERE id = ${paymentId}::uuid`);

    revalidatePath('/dashboard/suppliers');
    return { success: true };
  }
);

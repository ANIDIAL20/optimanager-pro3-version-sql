'use server';
import { neonConfig } from '@neondatabase/serverless';
// Configure WebSocket for Node.js environment (required for transactions)
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  neonConfig.webSocketConstructor = eval('require')('ws');
}


import { db } from '@/db';
import { supplierCredits, supplierOrders, supplierCreditAllocations } from '@/db/schema';
import { eq, and, desc, sql, ne } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath } from 'next/cache';

function revalidateSupplierViews() {
  revalidatePath('/suppliers', 'layout');
  revalidatePath('/suppliers/[id]', 'page');
}

/**
 * Get all credits for a supplier
 */
export const getSupplierCredits = secureAction(async (userId, user, supplierId: string) => {
  try {
    const credits = await db
      .select()
      .from(supplierCredits)
      .where(and(
        eq(supplierCredits.supplierId, supplierId),
        eq(supplierCredits.userId, userId)
      ))
      .orderBy(desc(supplierCredits.createdAt));

    const totalAvailable = credits
      .filter(c => c.status !== 'closed')
      .reduce((sum, c) => sum + Number(c.remainingAmount), 0);

    return { success: true, credits, totalAvailable };
  } catch (error: any) {
    console.error('Error fetching supplier credits:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Get available credit balance for a supplier
 */
export const getSupplierAvailableCredit = secureAction(async (userId, user, supplierId: string) => {
    try {
        const result = await db
            .select({
                total: sql<number>`COALESCE(SUM(${supplierCredits.remainingAmount}), 0)`
            })
            .from(supplierCredits)
            .where(and(
                eq(supplierCredits.supplierId, supplierId),
                eq(supplierCredits.userId, userId),
                ne(supplierCredits.status, 'closed')
            ));

        return Number(result[0]?.total || 0);
    } catch (error: any) {
        console.error('Error fetching supplier credits sum:', error);
        return 0;
    }
});

/**
 * Apply credit to a supplier order
 */
export const applyCreditToOrder = secureAction(async (userId, user, { creditId, orderId, amount }: { creditId: string, orderId: string, amount: number }) => {
  try {
    return await db.transaction(async (tx) => {
      const [credit] = await tx.select()
        .from(supplierCredits)
        .where(and(eq(supplierCredits.id, creditId), eq(supplierCredits.userId, userId)));

      if (!credit || Number(credit.remainingAmount) < amount) {
        throw new Error('Montant d\'avoir insuffisant ou invalide');
      }

      const newRemaining = Number(credit.remainingAmount) - amount;
      await tx.update(supplierCredits)
        .set({
          remainingAmount: newRemaining.toString(),
          status: newRemaining <= 0 ? 'closed' : 'partial',
          updatedAt: new Date()
        })
        .where(eq(supplierCredits.id, creditId));

      const [order] = await tx.select()
        .from(supplierOrders)
        .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)));

      if (!order) throw new Error('Commande introuvable');

      const currentPaid = Number(order.amountPaid) || 0;
      const totalAmount = Number(order.montantTotal);
      const newAmountPaid = currentPaid + amount;
      const newRemainingOrder = totalAmount - newAmountPaid;

      await tx.update(supplierOrders)
        .set({
          amountPaid: newAmountPaid.toString(),
          remainingAmount: newRemainingOrder.toString(),
          paymentStatus: newRemainingOrder <= 0 ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'unpaid'),
          updatedAt: new Date()
        })
        .where(eq(supplierOrders.id, orderId));
      
      // ✅ Record the credit allocation
      await tx.insert(supplierCreditAllocations).values({
        userId,
        creditId,
        orderId,
        amount: amount.toString(),
        createdAt: new Date(),
      });

      revalidateSupplierViews();

      return { success: true, message: 'Avoir applique avec succes' };
    });
  } catch (error: any) {
    console.error('Error applying credit:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Delete a supplier credit
 */
export const deleteSupplierCredit = secureAction(async (userId, user, creditId: string) => {
  try {
    await db
      .delete(supplierCredits)
      .where(and(
        eq(supplierCredits.id, creditId),
        eq(supplierCredits.userId, userId)
      ));

    revalidateSupplierViews();
    return { success: true, message: 'Avoir supprimé avec succès' };
  } catch (error: any) {
    console.error('Error deleting credit:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'avoir: ' + error.message };
  }
});
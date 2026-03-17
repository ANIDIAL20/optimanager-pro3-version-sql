/**
 * Supplier Payments Actions
 * Manage supplier payments and order allocations
 */

'use server';




import { dbWithTransactions,  db  } from '@/db';
import { supplierPayments, supplierOrders, supplierOrderPayments, suppliers, supplierCredits } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath } from 'next/cache';
import { getSupplierAvailableCredit as getSupplierAvailableCreditFromCredits } from './supplier-credits-actions';

export async function getSupplierAvailableCredit(supplierId: string) {
  return getSupplierAvailableCreditFromCredits(supplierId);
}

export interface CreatePaymentInput {
  supplierId: string;
  amount: number;
  method: 'cash' | 'cheque' | 'virement' | 'effet' | string;
  orderIds?: string[];
  allocations?: { orderId: string; amount: number }[];
  notes?: string;
  date?: Date | string;
  reference?: string;
  bank?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  method: string;
  date: string;
  reference?: string;
  bank?: string;
  notes?: string;
  allocations?: any[];
  isAllocated?: boolean;
  unallocatedAmount?: number;
}

function getPaymentStatus(total: number, paid: number): 'unpaid' | 'partial' | 'paid' {
  const remaining = total - paid;
  if (remaining <= 0) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

function revalidateSupplierViews() {
  revalidatePath('/suppliers', 'layout');
  revalidatePath('/suppliers/[id]', 'page');
}

export const getSupplierPayments = secureAction(async (userId, user, supplierId?: string) => {
  try {
    const whereClause = supplierId
      ? and(eq(supplierPayments.userId, userId), eq(supplierPayments.supplierId, supplierId))
      : eq(supplierPayments.userId, userId);

    const payments = await db.query.supplierPayments.findMany({
      where: whereClause,
      orderBy: [desc(supplierPayments.paymentDate)],
      with: {
        allocations: {
          with: {
            order: true,
          },
        },
      },
    });

    const mapped = payments.map((p: any) => {
      const allocatedAmount = p.allocations.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
      return {
        id: p.id,
        supplierId: p.supplierId || '',
        supplierName: p.supplierName,
        amount: Number(p.amount),
        method: p.method,
        date: p.paymentDate ? (typeof p.paymentDate === 'string' ? p.paymentDate : (p.paymentDate as Date).toISOString()) : '',
        reference: p.reference || undefined,
        bank: p.bank || undefined,
        notes: p.notes || undefined,
        allocations: p.allocations.map((a: any) => ({
          orderId: a.orderId,
          amount: Number(a.amount),
          orderRef: a.order ? (a.order.orderReference || `#${a.order.id}`) : 'N/A',
        })),
        isAllocated: p.allocations.length > 0,
        unallocatedAmount: Math.max(0, Number(p.amount || 0) - allocatedAmount),
      } satisfies SupplierPayment;
    });

    return { success: true, payments: mapped };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

export const createSupplierPayment = secureAction(async (userId, user, data: CreatePaymentInput) => {
  try {
    return await dbWithTransactions.transaction(async (tx: any) => {
      const supplier = await tx.query.suppliers.findFirst({
        where: and(eq(suppliers.id, data.supplierId), eq(suppliers.userId, userId)),
      });

      if (!supplier) throw new Error('Fournisseur introuvable');

      const year = new Date().getFullYear();
      const count = await tx.$count(supplierPayments, eq(supplierPayments.userId, userId));
      const paymentNumber = `PAY-${year}-${(count + 1).toString().padStart(4, '0')}`;

      const newPayment = await tx.insert(supplierPayments).values({
        userId,
        supplierId: data.supplierId,
        supplierName: supplier.name,
        paymentNumber,
        amount: data.amount.toString(),
        method: data.method,
        paymentDate: data.date ? new Date(data.date) : new Date(),
        reference: data.reference,
        bank: data.bank,
        notes: data.notes,
        createdBy: user?.email || 'System',
        createdAt: new Date(),
      }).returning();

      const paymentId = newPayment[0].id;
      let allocatedAmount = 0;

      if (data.allocations && data.allocations.length > 0) {
        for (const allocation of data.allocations) {
          await tx.insert(supplierOrderPayments).values({
            userId,
            paymentId,
            orderId: allocation.orderId,
            amount: allocation.amount.toString(),
          });

          const order = await tx.query.supplierOrders.findFirst({
            where: and(eq(supplierOrders.id, allocation.orderId), eq(supplierOrders.userId, userId)),
          });

          if (order) {
            const currentPaid = Number(order.amountPaid) || 0;
            const newPaid = currentPaid + allocation.amount;
            const total = Number(order.montantTotal);
            const remainingAmount = total - newPaid;

            await tx.update(supplierOrders)
              .set({
                amountPaid: newPaid.toString(),
                remainingAmount: remainingAmount.toString(),
                paymentStatus: getPaymentStatus(total, newPaid),
                updatedAt: new Date().toISOString(),
              })
              .where(eq(supplierOrders.id, allocation.orderId));

            allocatedAmount += allocation.amount;
          }
        }
      } else if (data.orderIds && data.orderIds.length > 0) {
        let remainingToAllocate = data.amount;

        for (const orderId of data.orderIds) {
          if (remainingToAllocate <= 0) break;

          const order = await tx.query.supplierOrders.findFirst({
            where: and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)),
          });
          if (!order) continue;

          const debt = Number(order.remainingAmount);
          const allocationAmount = Math.min(debt, remainingToAllocate);

          if (allocationAmount > 0) {
            await tx.insert(supplierOrderPayments).values({
              userId,
              paymentId,
              orderId,
              amount: allocationAmount.toString(),
            });

            const currentPaid = Number(order.amountPaid) || 0;
            const newPaid = currentPaid + allocationAmount;
            const total = Number(order.montantTotal);
            const remainingAmount = total - newPaid;

            await tx.update(supplierOrders)
              .set({
                amountPaid: newPaid.toString(),
                remainingAmount: remainingAmount.toString(),
                paymentStatus: getPaymentStatus(total, newPaid),
                updatedAt: new Date().toISOString(),
              })
              .where(eq(supplierOrders.id, orderId));

            allocatedAmount += allocationAmount;
            remainingToAllocate -= allocationAmount;
          }
        }
      }

      // ✅ Balance sync: reduce supplier debt by the payment amount
      await tx.update(suppliers)
        .set({
          currentBalance: sql`GREATEST(0, ${suppliers.currentBalance} - ${data.amount.toString()})`,
        })
        .where(and(eq(suppliers.id, data.supplierId), eq(suppliers.userId, userId)));

      revalidateSupplierViews();

      const unallocatedAmount = Math.max(0, Number(data.amount || 0) - allocatedAmount);

      // ✅ Step 4: Auto-insert surplus as a real supplier_credit record
      if (unallocatedAmount > 0) {
        await tx.insert(supplierCredits).values({
          userId,
          supplierId: data.supplierId,
          amount: unallocatedAmount.toString(),
          remainingAmount: unallocatedAmount.toString(),
          status: 'open',
          sourceType: 'overpayment',
          notes: `Avoir auto - excès paiement ${paymentNumber}`,
          relatedOrderId: (data.allocations?.[0]?.orderId || data.orderIds?.[0]) ?? null,
          createdAt: new Date(),
        });
      }

      return {
        success: true,
        message: 'Paiement enregistre',
        isAllocated: allocatedAmount > 0,
        unallocatedAmount: 0, // Surplus is now a formal credit record
        creditCreated: unallocatedAmount > 0,
      };
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
});

export const deleteSupplierPayment = secureAction(async (userId, user, paymentId: string) => {
  try {
    await dbWithTransactions.transaction(async (tx: any) => {
      const allocations = await tx.query.supplierOrderPayments.findMany({
        where: and(eq(supplierOrderPayments.paymentId, paymentId), eq(supplierOrderPayments.userId, userId)),
      });

      // Fetch the payment amount before deletion to reverse balance
      const [paymentRecord] = await tx.query.supplierPayments.findMany({
        where: and(eq(supplierPayments.id, paymentId), eq(supplierPayments.userId, userId)),
        limit: 1,
      });
      const paymentAmount = paymentRecord ? Number(paymentRecord.amount) : 0;
      const paymentSupplierId = paymentRecord?.supplierId;

      for (const alloc of allocations) {
        const order = await tx.query.supplierOrders.findFirst({
          where: and(eq(supplierOrders.id, alloc.orderId), eq(supplierOrders.userId, userId)),
        });

        if (order) {
          const reversedPaid = Number(order.amountPaid) - Number(alloc.amount);
          const total = Number(order.montantTotal);
          const nextPaid = Math.max(0, reversedPaid);
          const remainingAmount = total - nextPaid;

          await tx.update(supplierOrders)
            .set({
              amountPaid: nextPaid.toString(),
              remainingAmount: remainingAmount.toString(),
              paymentStatus: getPaymentStatus(total, nextPaid),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(supplierOrders.id, alloc.orderId));
        }
      }

      await tx.delete(supplierOrderPayments)
        .where(eq(supplierOrderPayments.paymentId, paymentId));

      await tx.delete(supplierPayments)
        .where(and(eq(supplierPayments.id, paymentId), eq(supplierPayments.userId, userId)));

      // ✅ Balance sync: reverse the payment — add the amount back to supplier balance
      if (paymentSupplierId && paymentAmount > 0) {
        await tx.update(suppliers)
          .set({
            currentBalance: sql`${suppliers.currentBalance} + ${paymentAmount.toString()}`,
          })
          .where(and(eq(suppliers.id, paymentSupplierId), eq(suppliers.userId, userId)));
      }
    });

    revalidateSupplierViews();
    return { success: true, message: 'Paiement annule et soldes mis a jour' };
  } catch (error: any) {
    return { success: false, error: 'Erreur suppression paiement' };
  }
});
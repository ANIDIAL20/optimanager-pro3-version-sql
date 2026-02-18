/**
 * Supplier Payments Actions
 * Manage supplier payments and order allocations
 */

'use server';

import { db } from '@/db';
import { supplierPayments, supplierOrders, supplierOrderPayments, suppliers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath } from 'next/cache';

// ========================================
// TYPES
// ========================================

export interface CreatePaymentInput {
    supplierId: string;
    amount: number;
    method: string;
    date: string;
    reference?: string; // Check #
    bank?: string;
    notes?: string;
    allocations?: { orderId: number; amount: number }[];
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
}

// ========================================
// ACTIONS
// ========================================

/**
 * Get Payments
 */
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
                        order: true
                    }
                }
            }
        });

        const mapped = payments.map((p: any) => ({
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
                orderRef: a.order ? (a.order.orderReference || `#${a.order.id}`) : 'N/A'
            }))
        }));

        return { success: true, payments: mapped };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// ... types ...

/**
 * Create Payment
 */
export const createSupplierPayment = secureAction(async (userId, user, data: CreatePaymentInput) => {
    try {
        console.log("💸 Creating Supplier Payment:", data);

        return await db.transaction(async (tx: any) => {
            // 1. Get Supplier Name Snapshot
            const supplier = await tx.query.suppliers.findFirst({
                where: eq(suppliers.id, data.supplierId)
            });
            
            if (!supplier) throw new Error("Fournisseur introuvable");

            // 2. Generate Payment Number
            const year = new Date().getFullYear();
            const count = await tx.$count(supplierPayments, eq(supplierPayments.userId, userId));
            const paymentNumber = `PAY-${year}-${(count + 1).toString().padStart(4, '0')}`;

            // 3. Insert Payment
            const newPayment = await tx.insert(supplierPayments).values({
                userId,
                supplierId: data.supplierId,
                supplierName: supplier.name,
                paymentNumber: paymentNumber,
                amount: data.amount.toString(),
                method: data.method,
                paymentDate: new Date(data.date),
                reference: data.reference,
                bank: data.bank,
                notes: data.notes,
                createdBy: user?.email || 'System',
                createdAt: new Date()
            }).returning();

            const paymentId = newPayment[0].id;

            // 4. Process Allocations
            if (data.allocations && data.allocations.length > 0) {
                for (const allocation of data.allocations) {
                     // Insert Link
                     await tx.insert(supplierOrderPayments).values({
                         userId,
                         paymentId: paymentId,
                         orderId: allocation.orderId,
                         amount: allocation.amount.toString()
                     });

                     // Update Order Balance
                     const order = await tx.query.supplierOrders.findFirst({
                        where: and(eq(supplierOrders.id, allocation.orderId), eq(supplierOrders.userId, userId))
                     });
                     
                     if (order) {
                        const currentPaid = Number(order.montantPaye) || 0;
                        const newPaid = currentPaid + allocation.amount;
                        const total = Number(order.montantTotal);
                        
                        await tx.update(supplierOrders)
                            .set({
                                montantPaye: newPaid.toString(),
                                resteAPayer: (total - newPaid).toString(),
                                updatedAt: new Date()
                            })
                            .where(eq(supplierOrders.id, allocation.orderId));
                     }
                }
            }

            // Update Supplier Balance Logic (Optional/Future)
            // await tx.update(suppliers).set({ ... })

            revalidatePath('/dashboard/supplier-orders');
            revalidatePath('/dashboard/supplier-payments');
            
            return { success: true, message: 'Paiement enregistré' };
        });

    } catch (error: any) {
        console.error("Error creating payment:", error);
        return { success: false, error: error.message };
    }
});

/**
 * Delete Payment (Reversal)
 */
export const deleteSupplierPayment = secureAction(async (userId, user, paymentId: string) => {
    try {
        // paymentId is UUID string, no parsing needed
        
        await db.transaction(async (tx: any) => {
             // 1. Find Allocations to Revert
             const allocations = await tx.query.supplierOrderPayments.findMany({
                 where: and(eq(supplierOrderPayments.paymentId, paymentId), eq(supplierOrderPayments.userId, userId))
             });

             // 2. Revert Order Balances
             for (const alloc of allocations) {
                 const order = await tx.query.supplierOrders.findFirst({
                     where: eq(supplierOrders.id, alloc.orderId)
                 });
                 
                 if (order) {
                     const reversedPaid = Number(order.montantPaye) - Number(alloc.amount);
                     const total = Number(order.montantTotal);
                     
                     await tx.update(supplierOrders)
                         .set({
                             montantPaye: reversedPaid.toString(),
                             resteAPayer: (total - reversedPaid).toString(),
                             updatedAt: new Date()
                         })
                         .where(eq(supplierOrders.id, alloc.orderId));
                 }
             }

             // 3. Delete Allocations
             await tx.delete(supplierOrderPayments)
                .where(eq(supplierOrderPayments.paymentId, paymentId));

             // 4. Delete Payment
             await tx.delete(supplierPayments)
                .where(and(eq(supplierPayments.id, paymentId), eq(supplierPayments.userId, userId)));
        });

        revalidatePath('/dashboard/supplier-orders');
        revalidatePath('/dashboard/supplier-payments');
        return { success: true, message: 'Paiement annulé et soldes mis à jour' };
    } catch (error: any) {
        return { success: false, error: 'Erreur suppression paiement' };
    }
});

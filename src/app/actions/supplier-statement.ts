// @ts-nocheck
'use server';

import { db } from '@/db';
import { supplierOrders, supplierPayments } from '@/db/schema/index';
import { eq, and, sql, desc, asc, isNull } from 'drizzle-orm';
import { createAction } from '@/lib/middleware/compose';
import { authenticate } from '@/lib/middleware/auth.middleware';
import { getSupplierBalance, getSupplierProducts } from '@/lib/utils/supplier-utils';

/**
 * Obtenir le relevé de compte d'un fournisseur (Unifié V1 + V2)
 */
export const getSupplierStatement = createAction(
  [authenticate()],
  async (ctx: any) => {
    let supplierId = String(ctx.input);
    console.log('[getSupplierStatement] supplierId:', supplierId);

    try {
      const [ordersRaw, paymentsRaw] = await Promise.all([
        db.select()
          .from(supplierOrders)
          .where(
            and(
              eq(supplierOrders.supplierId, supplierId),
              isNull(supplierOrders.deletedAt)
            )
          )
          .orderBy(desc(supplierOrders.createdAt)),

        db.select()
          .from(supplierPayments)
          .where(
            and(
              eq(supplierPayments.supplierId, supplierId),
              isNull(supplierPayments.deletedAt)
            )
          )
          .orderBy(desc(supplierPayments.paymentDate)),
      ]);

      // Map to safe objects (handle potential nulls and types)
      const orders = ordersRaw.map(o => ({
        ...o,
        totalAmount: Number(o.totalAmount || 0),
        amountPaid: Number(o.amountPaid || 0),
        remainingAmount: Number(o.remainingAmount || 0),
        status: (o.paymentStatus || 'unpaid').toLowerCase()
      }));

      const payments = paymentsRaw.map(p => ({
        ...p,
        amount: Number(p.amount || 0)
      }));

      // ✅ حساب الإجماليات يدوياً
      const totalOrders  = orders.reduce((s, o) => s + o.totalAmount, 0);
      const totalPaid    = payments.reduce((s, p) => s + p.amount, 0);
      const totalBalance = totalOrders - totalPaid;

      console.log('[getSupplierStatement] OK:', {
        ordersCount: orders.length,
        paymentsCount: payments.length,
        totalOrders,
        totalPaid,
        totalBalance,
      });

      return { orders, payments, totalOrders, totalPaid, totalBalance };
    } catch (error) {
      console.error('Error in getSupplierStatement:', error);
      throw new Error("Erreur lors de la récupération du relevé unifié.");
    }
  }
);

/**
 * Obtenir le solde actuel d'un fournisseur
 */
export const getSupplierBalanceAction = createAction(
  [authenticate()],
  async (ctx: any) => {
    return await getSupplierBalance(ctx.input);
  }
);

/**
 * Obtenir les produits en stock associés au fournisseur (par nom)
 */
export const getSupplierProductsAction = createAction(
  [authenticate()],
  async (ctx: any) => {
    return await getSupplierProducts(ctx.input);
  }
);

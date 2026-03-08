// @ts-nocheck
'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { supplierOrders, supplierOrderItems } from '@/db/schema/index';
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { createAction } from '@/lib/middleware/compose';
import { authenticate } from '@/lib/middleware/auth.middleware';
import { getSupplierBalance, getSupplierProducts } from '@/lib/utils/supplier-utils';
import { calculateSupplierBalance } from '@/lib/supplier-balance';

export interface SupplierStatementItem {
  orderId: string;
  label: string | null;
  quantity: number;
  unitPrice: unknown;
  total: unknown;
}

export interface SupplierStatementOrder {
  id: string;
  orderDate: Date | null;
  reference: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  status: string;
  items: SupplierStatementItem[];
  [key: string]: unknown;
}

export interface SupplierStatementPayment {
  id: string;
  paymentDate: Date | null;
  reference: string;
  amount: number;
  isAllocated: boolean;
  allocationCount: number;
  [key: string]: unknown;
}

export interface SupplierStatementResult {
  orders: SupplierStatementOrder[];
  payments: SupplierStatementPayment[];
  totalOrders: number;
  totalPaid: number;
  totalBalance: number;
  totalAppliedCredits: number;
}

export const getSupplierStatement = createAction(
  [authenticate()],
  async (ctx: any) => {
    const supplierId = String(ctx.input);
    const session = await auth();
    const userId = session?.user?.id;

    try {
      if (!userId) {
        throw new Error('Non autorise');
      }

      const [ordersRaw, paymentsRaw, balance] = await Promise.all([
        db.select()
          .from(supplierOrders)
          .where(
            and(
              eq(supplierOrders.userId, userId),
              eq(supplierOrders.supplierId, supplierId),
              isNull(supplierOrders.deletedAt)
            )
          )
          .orderBy(desc(supplierOrders.createdAt)),
        db.query.supplierPayments.findMany({
          where: (payment, { and, eq, isNull }) => and(
            eq(payment.userId, userId),
            eq(payment.supplierId, supplierId),
            isNull(payment.deletedAt)
          ),
          orderBy: (payment, { desc }) => [desc(payment.paymentDate)],
          with: {
            allocations: true,
          },
        }),
        calculateSupplierBalance(supplierId, userId),
      ]);

      const orders: SupplierStatementOrder[] = ordersRaw.map((o) => ({
        ...o,
        reference: o.orderReference || o.orderNumber || `BC-${String(o.id).slice(0, 8)}`,
        totalAmount: Number(o.montantTotal || 0),
        amountPaid: Number(o.amountPaid || 0),
        remainingAmount: Number(o.remainingAmount || 0),
        status: String(o.paymentStatus || 'unpaid').toLowerCase(),
        items: [],
      }));

      const orderIds = orders.map((o) => o.id);
      let itemsByOrder: Record<string, SupplierStatementItem[]> = {};

      if (orderIds.length > 0) {
        const items = await db.select({
          orderId: supplierOrderItems.orderId,
          label: supplierOrderItems.label,
          quantity: supplierOrderItems.quantity,
          unitPrice: supplierOrderItems.unitPrice,
          total: supplierOrderItems.total,
        })
          .from(supplierOrderItems)
          .innerJoin(supplierOrders, eq(supplierOrderItems.orderId, supplierOrders.id))
          .where(
            and(
              inArray(supplierOrderItems.orderId, orderIds),
              eq(supplierOrders.userId, userId),
              isNull(supplierOrders.deletedAt)
            )
          );

        itemsByOrder = items.reduce((acc, item) => {
          const oid = String(item.orderId);
          acc[oid] = [...(acc[oid] ?? []), item];
          return acc;
        }, {} as Record<string, SupplierStatementItem[]>);
      }

      const enrichedOrders: SupplierStatementOrder[] = orders.map((o) => ({
        ...o,
        items: itemsByOrder[String(o.id)] ?? [],
      }));

      const payments: SupplierStatementPayment[] = paymentsRaw.map((p: any) => ({
        ...p,
        reference: p.reference || p.paymentNumber || '-',
        amount: Number(p.amount || 0),
        allocationCount: Array.isArray(p.allocations) ? p.allocations.length : 0,
        isAllocated: Array.isArray(p.allocations) ? p.allocations.length > 0 : false,
      }));

      return {
        orders: enrichedOrders,
        payments,
        totalOrders: balance.totalOrders,
        totalPaid: balance.totalPayments,
        totalBalance: balance.balance,
        totalAppliedCredits: balance.totalAppliedCredits,
      } satisfies SupplierStatementResult;
    } catch (error) {
      console.error('Error in getSupplierStatement:', error);
      throw new Error('Erreur lors de la recuperation du releve unifie.');
    }
  }
);

export const getSupplierBalanceAction = createAction(
  [authenticate()],
  async (ctx: any) => {
    return await getSupplierBalance(ctx.input);
  }
);

export const getSupplierProductsAction = createAction(
  [authenticate()],
  async (ctx: any) => {
    return await getSupplierProducts(ctx.input);
  }
);
import { db } from '@/db';
import { supplierCredits, supplierOrders, supplierPayments } from '@/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export interface SupplierBalanceSummary {
  totalOrders: number;
  totalPayments: number;
  totalAppliedCredits: number;
  balance: number;
}

export async function calculateSupplierBalance(
  supplierId: string,
  userId: string
): Promise<SupplierBalanceSummary> {
  const [orderRes, paymentRes, creditRes] = await Promise.all([
    db
      .select({
        total: sql<number>`COALESCE(SUM(${supplierOrders.montantTotal}), 0)`,
      })
      .from(supplierOrders)
      .where(
        and(
          eq(supplierOrders.userId, userId),
          eq(supplierOrders.supplierId, supplierId),
          isNull(supplierOrders.deletedAt)
        )
      ),
    db
      .select({
        total: sql<number>`COALESCE(SUM(${supplierPayments.amount}), 0)`,
      })
      .from(supplierPayments)
      .where(
        and(
          eq(supplierPayments.userId, userId),
          eq(supplierPayments.supplierId, supplierId),
          isNull(supplierPayments.deletedAt)
        )
      ),
    db
      .select({
        total: sql<number>`COALESCE(SUM(${supplierCredits.amount} - ${supplierCredits.remainingAmount}), 0)`,
      })
      .from(supplierCredits)
      .where(
        and(
          eq(supplierCredits.userId, userId),
          eq(supplierCredits.supplierId, supplierId)
        )
      ),
  ]);

  const totalOrders = Number(orderRes[0]?.total || 0);
  const totalPayments = Number(paymentRes[0]?.total || 0);
  const totalAppliedCredits = Number(creditRes[0]?.total || 0);

  return {
    totalOrders,
    totalPayments,
    totalAppliedCredits,
    balance: totalOrders - totalPayments - totalAppliedCredits,
  };
}

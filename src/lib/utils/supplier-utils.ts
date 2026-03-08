import { auth } from '@/auth';
import { db } from '@/db';
import { and, eq, getTableColumns, isNull } from 'drizzle-orm';
import { suppliers, supplierOrderItems } from '@/db/schema/suppliers.schema';
import { supplierOrders } from '@/db/schema/supplier-orders.schema';
import { products } from '@/db/schema';
import { calculateSupplierBalance } from '@/lib/supplier-balance';

/**
 * Calculer le solde d'un fournisseur
 */
export async function getSupplierBalance(supplierId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Non autorise');
    }

    return await calculateSupplierBalance(supplierId, userId);
  } catch (e) {
    console.error('Error fetching balance:', e);
    return { totalOrders: 0, totalPayments: 0, totalAppliedCredits: 0, balance: 0 };
  }
}

/**
 * Extraire les produits lies aux commandes d'un fournisseur
 */
export async function getSupplierProducts(supplierId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Non autorise');
    }

    return await db
      .selectDistinct({ ...getTableColumns(products) })
      .from(products)
      .innerJoin(supplierOrderItems, eq(supplierOrderItems.productId, products.id))
      .innerJoin(supplierOrders, eq(supplierOrderItems.orderId, supplierOrders.id))
      .where(
        and(
          eq(supplierOrders.userId, userId),
          eq(supplierOrders.supplierId, supplierId),
          isNull(supplierOrders.deletedAt)
        )
      );
  } catch (e) {
    console.error('Error fetching supplier products:', e);
    return [];
  }
}

/**
 * Valider le montant d'un paiement par rapport au solde
 */
export async function validatePaymentAmount(supplierId: string, amount: number) {
  const { balance } = await getSupplierBalance(supplierId);
  return amount <= balance;
}

/**
 * Formatter une commande pour l'affichage
 */
export function formatSupplierOrder(order: any) {
  return {
    ...order,
    totalAmountFormatted: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(order.montantTotal),
    statusLabel: order.statut === 'RECU' ? 'Recu' : 'En attente',
  };
}

/**
 * Get Supplier Info for order forms
 */
export async function getSupplierInfo(supplierId: string) {
    const result = await db.select()
        .from(suppliers)
        .where(eq(suppliers.id, supplierId))
        .limit(1);
    return result[0];
}

/**
 * Validation basique d'une commande
 */
export function validateOrderData(data: any): { valid: boolean; errors: string[]; error: string } {
    const errors: string[] = [];
    if (!data.supplierId && !data.supplierName) errors.push('Fournisseur requis');
    if (data.items !== undefined && data.items.length === 0) errors.push('Articles requis');
    if (!data.totalAmount || data.totalAmount <= 0) errors.push('Montant invalide');

    return {
        valid: errors.length === 0,
        errors,
        error: errors.join(' | ')
    };
}

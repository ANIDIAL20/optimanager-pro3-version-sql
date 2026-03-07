import { db } from '@/db';
import { sql, eq, and, isNull } from 'drizzle-orm';
import { suppliers, supplierPayments } from '@/db/schema/suppliers.schema';
import { supplierOrders } from '@/db/schema/supplier-orders.schema';
import { products } from '@/db/schema'; 

/**
 * Calculer le solde d'un fournisseur (Unifié: V1 + V2)
 */
export async function getSupplierBalance(supplierId: string) {
  try {
    const [orderRes, paymentRes] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(${supplierOrders.montantTotal}), 0)` })
        .from(supplierOrders)
        .where(
          and(
            eq(supplierOrders.supplierId, supplierId),
            sql`${supplierOrders.status} != 'cancelled'`,
            isNull(supplierOrders.deletedAt)
          )
        ),
      db.select({ total: sql<number>`COALESCE(SUM(${supplierPayments.amount}), 0)` })
        .from(supplierPayments)
        .where(
          and(
            eq(supplierPayments.supplierId, supplierId),
            isNull(supplierPayments.deletedAt)
          )
        )
    ]);

    const totalOrders = Number(orderRes[0]?.total || 0);
    const totalPayments = Number(paymentRes[0]?.total || 0);

    return {
      totalOrders,
      totalPayments,
      balance: totalOrders - totalPayments,
    };
  } catch (e) {
    console.error('Error fetching balance:', e);
    return { totalOrders: 0, totalPayments: 0, balance: 0 };
  }
}

/**
 * Extraire les produits liés aux commandes d'un fournisseur
 */
export async function getSupplierProducts(supplierId: string) {
  try {
    const results = await db.execute(sql`
      SELECT DISTINCT p.* 
      FROM products p
      JOIN supplier_order_items soi ON soi.product_id = p.id
      JOIN supplier_orders so ON so.id = soi.order_id
      WHERE so.supplier_id = ${supplierId}::uuid
      AND so.deleted_at IS NULL
    `);
    return results.rows;
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
    statusLabel: order.statut === 'REÇU' ? 'Reçu' : 'En attente',
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
    // data.items is optional in some contexts (like just header), but let's check if present
    if (data.items !== undefined && data.items.length === 0) errors.push('Articles requis');
    if (!data.totalAmount || data.totalAmount <= 0) errors.push('Montant invalide');
    
    return { 
        valid: errors.length === 0, 
        errors,
        error: errors.join(' | ') 
    };
}

import { db } from '@/db';
import { sql, eq, and, ne } from 'drizzle-orm';
import { suppliers } from '@/db/schema/suppliers.schema';
import { supplierOrders } from '@/db/schema/supplier-orders.schema';
import { supplierPayments } from '@/db/schema/supplier-payments.schema';
import { products } from '@/db/schema'; 

/**
 * Calculer le solde d'un fournisseur (Unifié: V1 + V2)
 */
export async function getSupplierBalance(supplierId: number | string) {
  try {
    const sIdStr = String(supplierId);

    // Requête SQL brute pour calculer le solde
    const result = await db.execute(sql`
      WITH all_orders AS (
        SELECT COALESCE(SUM(montant_total), 0) as amt 
        FROM supplier_orders 
        WHERE supplier_id::text = ${sIdStr} AND status != 'cancelled' AND deleted_at IS NULL
      ),
      all_payments AS (
        SELECT COALESCE(SUM(amount), 0) as amt 
        FROM supplier_payments 
        WHERE supplier_id::text = ${sIdStr} AND deleted_at IS NULL
      )
      SELECT 
        (SELECT SUM(amt) FROM all_orders) as total_orders,
        (SELECT SUM(amt) FROM all_payments) as total_payments
    `);

    const row = result.rows[0] as any;
    const totalOrders = Number(row?.total_orders || 0);
    const totalPayments = Number(row?.total_payments || 0);

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
 * Récupérer les produits en stock associés à ce fournisseur
 */
export async function getSupplierProducts(supplierName: string) {
    if (!supplierName) return [];
    
    return await db.select()
        .from(products)
        .where(
            and(
                eq(products.fournisseur, supplierName),
                sql`deleted_at IS NULL`
            )
        )
        .limit(100);
}

/**
 * Valider le montant d'un paiement
 */
export async function validatePaymentAmount(supplierId: string, amount: number) {
  if (amount <= 0) {
    return { valid: false, message: 'Le montant doit être supérieur à zéro' };
  }

  const { balance } = await getSupplierBalance(supplierId);
  if (amount > balance) {
    return { valid: false, message: `Le montant dépasse le solde actuel (${balance} MAD)` };
  }

  return { valid: true };
}

/**
 * Valider les données d'une commande
 */
export async function validateOrderData(data: {
  supplierId: string;
  reference: string;
  orderDate: Date;
  totalAmount: number;
}) {
  const errors: string[] = [];

  const suppliersResult = await db.select()
    .from(suppliers)
    .where(eq(suppliers.id, data.supplierId))
    .limit(1);
  const supplier = suppliersResult[0];
  if (!supplier) errors.push('Fournisseur non trouvé');

  const ordersResult = await db.select()
    .from(supplierOrders)
    .where(and(
      eq(supplierOrders.supplierId, data.supplierId),
      eq(supplierOrders.reference, data.reference)
    ))
    .limit(1);
  const existingOrder = ordersResult[0];
  if (existingOrder) errors.push('Cette référence existe déjà pour ce fournisseur');

  if (data.totalAmount <= 0) errors.push('Le montant doit être supérieur à zéro');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (data.orderDate > tomorrow) errors.push('La date ne peut pas être dans le futur');

  return {
    valid: errors.length === 0,
    errors
  };
}

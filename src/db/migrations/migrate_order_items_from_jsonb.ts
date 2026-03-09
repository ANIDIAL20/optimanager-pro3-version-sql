/**
 * Migration Script — Étape 5 (Historical/Legacy)
 * Migrates order items from the deprecated JSONB `items` column
 * to the relational `supplier_order_items` table.
 *
 * NOTE: The `items` column has been removed from the Drizzle schema as of the
 * v2 refactor. This script uses raw SQL to access the legacy DB column directly
 * so it can still be run against a database that hasn't been fully migrated yet.
 *
 * Usage: npx tsx src/db/migrations/migrate_order_items_from_jsonb.ts
 */

import { db } from '@/db';
import { supplierOrderItems } from '@/db/schema/suppliers.schema';
import { sql } from 'drizzle-orm';

export async function migrateOrderItemsFromJsonb() {
  console.log('🚀 Démarrage migration items de commande (JSONB → table relationnelle)...');

  // Read orders that still have the legacy `items` JSONB column populated
  // Using raw SQL since the column no longer exists in the Drizzle schema definition
  const orders = await db.execute(
    sql`SELECT id, items FROM supplier_orders WHERE items IS NOT NULL AND jsonb_array_length(COALESCE(items::jsonb, '[]'::jsonb)) > 0`
  );

  const orderRows = orders.rows as Array<{ id: string; items: any[] }>;

  let migratedItems = 0;
  let skippedOrders = 0;
  let errors = 0;

  for (const order of orderRows) {
    try {
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        skippedOrders++;
        continue;
      }

      const itemsToInsert = order.items.map((item: any) => ({
        orderId:   order.id,
        productId: item.productId ?? null,
        reference: item.reference ?? null,
        label:     item.label ?? item.nom ?? 'Produit inconnu',
        quantity:  Number(item.quantity ?? item.quantite ?? 1),
        unitPrice: String(item.unitPrice ?? item.prixUnitaire ?? '0'),
        total:     String(item.total ?? (Number(item.quantity ?? item.quantite ?? 1) * Number(item.unitPrice ?? item.prixUnitaire ?? 0))),
      }));

      if (itemsToInsert.length > 0) {
        await db.insert(supplierOrderItems).values(itemsToInsert);
        migratedItems += itemsToInsert.length;
      }
    } catch (e) {
      console.error(`❌ [MIGRATION ERROR] order id=${order.id}:`, e);
      errors++;
    }
  }

  console.log(`\n✅ Migration terminée :`);
  console.log(`   • Items extraits avec succès      : ${migratedItems}`);
  console.log(`   • Commandes ignorées (sans items) : ${skippedOrders}`);
  console.log(`   • Erreurs lors de l'insertion     : ${errors}`);

  if (errors === 0) {
    console.log('🎉 Migration des items de commandes validée avec succès !');
  } else {
    console.warn(`⚠️ ${errors} error(s) occurred. Please check the logs above.`);
  }
}

if (require.main === module) {
  migrateOrderItemsFromJsonb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

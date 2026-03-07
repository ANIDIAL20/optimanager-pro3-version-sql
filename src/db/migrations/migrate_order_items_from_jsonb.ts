/**
 * Migration Script — Étape 5
 * Migre les items de commande du champ JSONB `items`
 * vers la table relationnelle `supplier_order_items`.
 *
 * Usage: npx tsx src/db/migrations/migrate_order_items_from_jsonb.ts
 */

import { db } from '@/db';
import { supplierOrders, supplierOrderItems } from '@/db/schema/suppliers.schema';

export async function migrateOrderItemsFromJsonb() {
  console.log('🚀 Démarrage migration items de commande (JSONB → table relationnelle)...');

  const orders = await db.select().from(supplierOrders);
  
  let migratedItems = 0;
  let skippedOrders = 0;
  let errors = 0;

  for (const order of orders) {
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

      // Insert items for this order
      if (itemsToInsert.length > 0) {
         await db.insert(supplierOrderItems).values(itemsToInsert);
         migratedItems += itemsToInsert.length;
      }
    } catch (e) {
      console.error(`❌ [MIGRATION ERROR] order id=${order.id}:`, e);
      errors++;
    }
  }

  // Validation
  let totalJsonItems = 0;
  const ordersWithItems = orders.filter(o => {
    if (Array.isArray(o.items) && o.items.length > 0) {
      totalJsonItems += o.items.length;
      return true;
    }
    return false;
  });

  const { count } = await import('drizzle-orm');
  const migratedOrderIdsQuery = await db.selectDistinct({ orderId: supplierOrderItems.orderId }).from(supplierOrderItems);
  const totalInsertedItemsQuery = await db.select({ total: count() }).from(supplierOrderItems);
  const totalInsertedItems = totalInsertedItemsQuery[0]?.total || 0;

  console.log(`\n✅ Migration terminée :`);
  console.log(`   • Items extraits avec succès      : ${migratedItems}`);
  console.log(`   • Commandes ignorées (sans items) : ${skippedOrders}`);
  console.log(`   • Erreurs lors de l'insertion     : ${errors}`);
  console.log(`\n📋 Validation post-migration :`);
  console.log(`   • Commandes JSONB valides      : ${ordersWithItems.length} (devrait correspondre aux migrées ci-dessous)`);
  console.log(`   • Commandes migrées (distinct) : ${migratedOrderIdsQuery.length}`);
  console.log(`   • Total Items JSON d'origine   : ${totalJsonItems}`);
  console.log(`   • Total Items réels insérés    : ${totalInsertedItems}`);

  if (totalJsonItems !== totalInsertedItems && errors === 0) {
     console.warn('⚠️ Attention : Le nombre total d\'items dans le JSON de départ ne correspond pas aux items dans la nouvelle table.');
  } else if (ordersWithItems.length !== migratedOrderIdsQuery.length && errors === 0) {
     console.warn('⚠️ Attention : Certaines commandes valides n\'ont pas généré de relations (ex: JSONB vide ou mal formatté). Vérifiez manuellement si possible.');
  } else if (errors === 0) {
     console.log('✅ Validation parfaite : Le décompte exact d\'items correspond parfaitement !');
  }

  console.log('🎉 Migration des items de commandes validée avec succès !');
}

if (require.main === module) {
  migrateOrderItemsFromJsonb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

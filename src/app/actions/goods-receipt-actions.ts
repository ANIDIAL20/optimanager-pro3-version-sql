'use server';

import { db } from '@/db';
import { 
  goodsReceipts, 
  goodsReceiptItems, 
  products, 
  supplierOrderItems, 
  supplierOrders, 
  supplierCredits,
  stockMovements 
} from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { logSuccess } from '@/lib/audit-log';

/**
 * Créer un Bon de Réception (Draft)
 */
export const createGoodsReceipt = secureAction(async (userId, user, data: any) => {
  try {
    const [receipt] = await db.insert(goodsReceipts).values({
      userId,
      supplierId: data.supplierId,
      deliveryNoteRef: data.deliveryNoteRef || null,
      notes: data.notes || null,
      status: 'draft',
      createdAt: new Date(),
    }).returning();

    revalidatePath('/dashboard/suppliers');
    return { success: true, receipt };
  } catch (error: any) {
    console.error("Error creating goods receipt:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Ajouter des lignes à un Bon de Réception
 */
export const addGoodsReceiptItems = secureAction(async (userId, user, { receiptId, items }: { receiptId: string, items: any[] }) => {
  try {
    const itemsToInsert = items.map(item => ({
      receiptId,
      orderItemId: item.orderItemId || null,
      productId: item.productId,
      qtyOrdered: item.qtyOrdered || 0,
      qtyReceived: item.qtyReceived || 0,
      qtyRejected: item.qtyRejected || 0,
      unitPrice: item.unitPrice?.toString() || '0',
    }));

    await db.insert(goodsReceiptItems).values(itemsToInsert);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * Valider un Bon de Réception (Transaction Atomique)
 * - Insère les lignes
 * - Met à jour le stock
 * - Met à jour les quantités reçues sur les BC
 * - Recalcule le statut des BC
 * - Génère les avoirs pour les rejets
 */
export const validateGoodsReceiptAction = secureAction(async (userId, user, { 
  receiptId, 
  lines 
}: { 
  receiptId: string, 
  lines: any[] 
}) => {
  try {
    return await db.transaction(async (tx) => {
      // 1. Récupérer le BR
      const receipt = await tx.query.goodsReceipts.findFirst({
        where: and(eq(goodsReceipts.id, receiptId), eq(goodsReceipts.userId, userId))
      });

      if (!receipt) throw new Error("Bon de réception introuvable");
      if (receipt.status === 'validated') throw new Error("Bon de réception déjà validé");

      // 2. Insérer les lignes goods_receipt_items
      await tx.insert(goodsReceiptItems).values(
        lines.map(l => ({
          receiptId,
          orderItemId: l.orderItemId || null,
          productId: l.productId,
          qtyOrdered: l.qtyOrdered || 0,
          qtyReceived: l.qtyReceived || 0,
          qtyRejected: l.qtyRejected || 0,
          unitPrice: l.unitPrice?.toString() || '0',
        }))
      );

      // 3. Traitement par ligne
      for (const line of lines) {
        // A. Mise à jour du stock (si reçu > 0)
        if (line.qtyReceived > 0) {
          await tx.update(products)
            .set({ 
              quantiteStock: sql`${products.quantiteStock} + ${line.qtyReceived}`,
              updatedAt: new Date().toISOString()
            })
            .where(eq(products.id, line.productId));

          // Historique mouvement de stock
          await tx.insert(stockMovements).values({
            userId,
            productId: line.productId,
            quantite: line.qtyReceived,
            type: 'Achat',
            notes: `Réception BR #${receipt.deliveryNoteRef || receiptId.slice(0, 8)}`,
            createdAt: new Date(),
          });
        }

        // B. Mise à jour de la ligne de commande (si liée)
        if (line.orderItemId) {
          await tx.update(supplierOrderItems)
            .set({ 
              qtyReceived: sql`COALESCE(${supplierOrderItems.qtyReceived}, 0) + ${line.qtyReceived}` 
            })
            .where(eq(supplierOrderItems.id, line.orderItemId));
        }
      }

      // 4. Recalculer le statut de chaque commande concernée
      const orderIds = [...new Set(lines.filter(l => l.orderId).map(l => l.orderId))];
      for (const orderId of orderIds) {
        if (!orderId) continue;
        const allItems = await tx.select().from(supplierOrderItems).where(eq(supplierOrderItems.orderId, orderId));
        const allComplete = allItems.every(i => Number(i.qtyReceived || 0) >= Number(i.quantity));
        const anyReceived = allItems.some(i => Number(i.qtyReceived || 0) > 0);
        
        await tx.update(supplierOrders)
          .set({ 
            statut: allComplete ? 'REÇU' : (anyReceived ? 'PARTIEL' : 'EN_COURS'),
            deliveryStatus: allComplete ? 'FULL' : (anyReceived ? 'PARTIAL' : 'PENDING'),
            updatedAt: new Date()
          })
          .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)));
      }

      // 5. Générer avoirs pour les rejets
      const rejectedLines = lines.filter(l => (l.qtyRejected || 0) > 0);
      let creditVal = 0;
      if (rejectedLines.length > 0) {
        const creditAmount = rejectedLines.reduce((sum, l) => sum + (l.qtyRejected * (l.unitPrice || 0)), 0);
        creditVal = creditAmount;
        
        await tx.insert(supplierCredits).values({
          userId,
          supplierId: receipt.supplierId,
          amount: creditAmount.toString(),
          remainingAmount: creditAmount.toString(),
          status: 'open',
          sourceType: 'return',
          reference: `RET-${receipt.deliveryNoteRef || receiptId.slice(0, 8)}`,
          notes: `Rejet lors réception BL: ${receipt.deliveryNoteRef || ''}`,
          relatedReceiptId: receiptId,
          createdAt: new Date(),
        });
      }

      // 6. Valider le BR
      await tx.update(goodsReceipts)
        .set({ 
          status: 'validated', 
          validatedAt: new Date() 
        })
        .where(eq(goodsReceipts.id, receiptId));

      try {
          // @ts-ignore
          revalidateTag(CACHE_TAGS.supplierOrders);
          // @ts-ignore
          revalidateTag(CACHE_TAGS.suppliers);
      } catch (e) {}
      
      revalidatePath('/dashboard/suppliers');
      
      return { 
        success: true, 
        message: "Réception validée", 
        creditGenerated: creditVal,
        itemsCount: lines.reduce((s, l) => s + (l.qtyReceived || 0), 0)
      };
    });
  } catch (error: any) {
    console.error("Validation error:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Liste des BR par fournisseur
 */
export const getGoodsReceiptsBySupplier = secureAction(async (userId, user, supplierId: string) => {
  try {
    const results = await db.query.goodsReceipts.findMany({
      where: and(eq(goodsReceipts.supplierId, supplierId), eq(goodsReceipts.userId, userId)),
      orderBy: [desc(goodsReceipts.createdAt)],
      with: { items: true },
    });
    return { success: true, receipts: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * Récupérer les commandes ouvertes (PENDING/PARTIAL) avec leurs lignes
 */
export const getOpenOrdersWithItems = secureAction(async (userId, user, supplierId: string) => {
  try {
    const results = await db.query.supplierOrders.findMany({
      where: and(
        eq(supplierOrders.userId, userId),
        eq(supplierOrders.supplierId, supplierId),
        inArray(supplierOrders.statut, ['EN_COURS', 'PARTIEL', 'pending', 'partial'])
      ),
      with: {
        // @ts-ignore
        items: true
      },
      orderBy: [desc(supplierOrders.createdAt)]
    });

    // Support items both from JSON and from relation table
    const formatted = results.map((order: any) => {
        const items = order.items || [];
        return {
            ...order,
            items: items.map((item: any) => ({
                id: item.id,
                productId: item.productId,
                label: item.label || item.nomProduit,
                quantity: Number(item.quantity || 0),
                qtyReceived: Number(item.qtyReceived || 0),
                unitPrice: Number(item.unitPrice || 0)
            }))
        };
    });

    return { success: true, orders: formatted };
  } catch (error: any) {
    console.error("Error fetching open orders:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Traitement complet d'une réception groupée
 */
export const submitBulkReception = secureAction(async (userId, user, data: { 
  supplierId: string, 
  deliveryNoteRef: string, 
  notes?: string,
  items: any[] 
}) => {
  try {
    // 1. Créer le BR (Draft)
    const receiptRes = await createGoodsReceipt(data);
    if (!receiptRes.success || !receiptRes.receipt) return receiptRes;
    const receiptId = receiptRes.receipt.id;

    // 2. Valider le BR (Stock + Commandes + Avoirs) 
    // On passe directement les lignes à la validation qui se charge de l'insertion et du traitement
    const validateRes = await validateGoodsReceiptAction({ receiptId, lines: data.items });
    
    if (validateRes.success) {
      return { ...validateRes, receiptId };
    }
    
    return validateRes;
  } catch (error: any) {
    console.error("Bulk reception error:", error);
    return { success: false, error: error.message };
  }
});

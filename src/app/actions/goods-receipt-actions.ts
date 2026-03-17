'use server';




import { dbWithTransactions,  db  } from '@/db';
import {
  goodsReceipts,
  goodsReceiptItems,
  products,
  supplierOrderItems,
  supplierOrders,
  supplierCredits,
  stockMovements,
} from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';

type GoodsReceiptDraftInput = {
  supplierId: string;
  deliveryNoteRef?: string;
  notes?: string;
};

type GoodsReceiptValidationLine = {
  orderId?: string;
  orderItemId?: number | string | null;
  productId: number;
  qtyOrdered?: number;
  qtyReceived?: number;
  qtyRejected?: number;
  unitPrice?: number | string;
};

function revalidateSupplierViews() {
  revalidatePath('/suppliers', 'layout');
  revalidatePath('/suppliers/[id]', 'page');
}

async function createGoodsReceiptRecord(tx: any, userId: string, data: GoodsReceiptDraftInput) {
  const [receipt] = await tx.insert(goodsReceipts).values({
    userId,
    supplierId: data.supplierId,
    deliveryNoteRef: data.deliveryNoteRef || null,
    notes: data.notes || null,
    status: 'draft',
    createdAt: new Date(),
  }).returning();

  return receipt;
}

async function validateGoodsReceiptWithTx(
  tx: any,
  userId: string,
  { receiptId, lines }: { receiptId: string; lines: GoodsReceiptValidationLine[] }
) {
  const receipt = await tx.query.goodsReceipts.findFirst({
    where: and(eq(goodsReceipts.id, receiptId), eq(goodsReceipts.userId, userId)),
  });

  if (!receipt) throw new Error('Bon de reception introuvable');
  if (receipt.status === 'validated') throw new Error('Bon de reception deja valide');

  await tx.insert(goodsReceiptItems).values(
    lines.map((line) => ({
      receiptId,
      orderItemId: line.orderItemId || null,
      productId: line.productId,
      qtyOrdered: line.qtyOrdered || 0,
      qtyReceived: line.qtyReceived || 0,
      qtyRejected: line.qtyRejected || 0,
      unitPrice: line.unitPrice?.toString() || '0',
    }))
  );

  for (const line of lines) {
    if ((line.qtyReceived || 0) > 0) {
      await tx.update(products)
        .set({
          quantiteStock: sql`${products.quantiteStock} + ${line.qtyReceived || 0}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, line.productId));

      await tx.insert(stockMovements).values({
        userId,
        productId: line.productId,
        quantite: line.qtyReceived || 0,
        type: 'Achat',
        notes: `Reception BR #${receipt.deliveryNoteRef || receiptId.slice(0, 8)}`,
        createdAt: new Date(),
      });
    }

    if (line.orderItemId) {
      await tx.update(supplierOrderItems)
        .set({
          qtyReceived: sql`COALESCE(${supplierOrderItems.qtyReceived}, 0) + ${line.qtyReceived || 0}`,
        })
        .where(eq(supplierOrderItems.id, Number(line.orderItemId)));
    }
  }

  const orderIds = [...new Set(lines.map((line) => line.orderId).filter(Boolean))] as string[];
  for (const orderId of orderIds) {
    const allItems = await tx.select().from(supplierOrderItems).where(eq(supplierOrderItems.orderId, orderId));
    const orderItemIds = allItems.map((item: any) => item.id);

    const rejectedRows = orderItemIds.length > 0
      ? await tx
          .select({
            orderItemId: goodsReceiptItems.orderItemId,
            totalRejected: sql<number>`COALESCE(SUM(${goodsReceiptItems.qtyRejected}), 0)`,
          })
          .from(goodsReceiptItems)
          .where(inArray(goodsReceiptItems.orderItemId, orderItemIds))
          .groupBy(goodsReceiptItems.orderItemId)
      : [];

    const rejectedByItem = new Map<number, number>(
      rejectedRows.map((row: any) => [Number(row.orderItemId), Number(row.totalRejected || 0)])
    );

    const allComplete = allItems.every((item: any) => {
      const qtyReceived = Number(item.qtyReceived || 0);
      const qtyRejected = rejectedByItem.get(Number(item.id)) || 0;
      return qtyReceived + qtyRejected >= Number(item.quantity || 0);
    });
    const anyReceived = allItems.some((item: any) => Number(item.qtyReceived || 0) > 0);

    await tx.update(supplierOrders)
      .set({
        statut: allComplete ? 'RECU' : (anyReceived ? 'PARTIEL' : 'EN_COURS'),
        deliveryStatus: allComplete ? 'FULL' : (anyReceived ? 'PARTIAL' : 'PENDING'),
        updatedAt: new Date(),
      })
      .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, userId)));
  }

  const rejectedLines = lines.filter((line) => (line.qtyRejected || 0) > 0);
  let creditVal = 0;
  if (rejectedLines.length > 0) {
    const creditAmount = rejectedLines.reduce(
      (sum, line) => sum + ((line.qtyRejected || 0) * Number(line.unitPrice || 0)),
      0
    );
    creditVal = creditAmount;

    await tx.insert(supplierCredits).values({
      userId,
      supplierId: receipt.supplierId,
      amount: creditAmount.toString(),
      remainingAmount: creditAmount.toString(),
      status: 'open',
      sourceType: 'return',
      reference: `RET-${receipt.deliveryNoteRef || receiptId.slice(0, 8)}`,
      notes: `Rejet lors reception BL: ${receipt.deliveryNoteRef || ''}`,
      relatedReceiptId: receiptId,
      createdAt: new Date(),
    });
  }

  await tx.update(goodsReceipts)
    .set({
      status: 'validated',
      validatedAt: new Date(),
    })
    .where(eq(goodsReceipts.id, receiptId));

  return {
    success: true,
    message: 'Reception validee',
    creditGenerated: creditVal,
    itemsCount: lines.reduce((sum, line) => sum + (line.qtyReceived || 0), 0),
  };
}

export const createGoodsReceipt = secureAction(async (userId, user, data: GoodsReceiptDraftInput) => {
  try {
    const receipt = await createGoodsReceiptRecord(db, userId, data);
    revalidateSupplierViews();
    return { success: true, receipt };
  } catch (error: any) {
    console.error('Error creating goods receipt:', error);
    return { success: false, error: error.message };
  }
});

export const addGoodsReceiptItems = secureAction(async (userId, user, { receiptId, items }: { receiptId: string; items: any[] }) => {
  try {
    const itemsToInsert = items.map((item) => ({
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

export const validateGoodsReceiptAction = secureAction(async (
  userId,
  user,
  { receiptId, lines }: { receiptId: string; lines: GoodsReceiptValidationLine[] }
) => {
  try {
    const result = await dbWithTransactions.transaction((tx) => validateGoodsReceiptWithTx(tx, userId, { receiptId, lines }));

    try {
      // @ts-ignore
      revalidateTag(CACHE_TAGS.supplierOrders);
      // @ts-ignore
      revalidateTag(CACHE_TAGS.suppliers);
    } catch (e) {}

    revalidateSupplierViews();
    return result;
  } catch (error: any) {
    console.error('Validation error:', error);
    return { success: false, error: error.message };
  }
});

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
        items: true,
      },
      orderBy: [desc(supplierOrders.createdAt)],
    });

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
          unitPrice: Number(item.unitPrice || 0),
        })),
      };
    });

    return { success: true, orders: formatted };
  } catch (error: any) {
    console.error('Error fetching open orders:', error);
    return { success: false, error: error.message };
  }
});

export const submitBulkReception = secureAction(async (
  userId,
  user,
  data: { supplierId: string; deliveryNoteRef: string; notes?: string; items: GoodsReceiptValidationLine[] }
) => {
  try {
    const result = await dbWithTransactions.transaction(async (tx) => {
      const receipt = await createGoodsReceiptRecord(tx, userId, data);
      const validation = await validateGoodsReceiptWithTx(tx, userId, {
        receiptId: receipt.id,
        lines: data.items,
      });

      return {
        ...validation,
        receiptId: receipt.id,
      };
    });

    try {
      // @ts-ignore
      revalidateTag(CACHE_TAGS.supplierOrders);
      // @ts-ignore
      revalidateTag(CACHE_TAGS.suppliers);
    } catch (e) {}

    revalidateSupplierViews();
    return result;
  } catch (error: any) {
    console.error('Bulk reception error:', error);
    return {
      success: false,
      error: error?.message || "La reception groupee a echoue. Aucune donnee n'a ete enregistree.",
    };
  }
});
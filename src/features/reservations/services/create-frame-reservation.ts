'use server';

import { db } from '@/db';
import { products, frameReservations } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { addDays } from 'date-fns';
import type { CreateFrameReservationInput, FrameReservation } from '../types/reservation.types';

/**
 * Crée une nouvelle réservation de monture
 * Adapte les noms de champs du schema (nom instead of name, quantiteStock instead of stockQuantity)
 */
export async function createFrameReservation(
  input: CreateFrameReservationInput
): Promise<FrameReservation> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await db.transaction(async (tx: any) => {

    // 1) جلب المنتجات
    const productIds = input.items.map(i => i.productId);
    const fetchedProducts = await tx.query.products.findMany({
      where: inArray(products.id, productIds),
    });

    if (fetchedProducts.length !== productIds.length) {
      throw new Error('Un ou plusieurs produits introuvables');
    }

    // 2) التحقق من النوع والكمية المتاحة
    const reservationItems = [];

    for (const item of input.items) {
      const product = fetchedProducts.find((p: { id: number }) => p.id === item.productId);
      if (!product) continue;

      /*
      // تحقق أن المنتج من نوع MONTURE (Removed per request to allow reservation of any product)
      if (product.type !== 'MONTURE') {
        throw new Error(
          `Le produit "${product.nom}" n'est pas une monture. Seules les montures peuvent être réservées.`
        );
      }
      */

      // حساب المتاح
      const available = product.quantiteStock - product.reservedQuantity;

      /*
      if (available < item.quantity) {
        // Allow backorder for reservations
        // throw new Error(
        //   `Stock insuffisant pour "${product.nom}". Disponible: ${available}, demandé: ${item.quantity}`
        // );
      }
      */

      reservationItems.push({
        productId: product.id,
        productName: product.nom,
        reference: product.reference,
        quantity: item.quantity,
        unitPrice: parseFloat(product.prixVente.toString()),
      });
    }

    const totalAmount = reservationItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // 3) حساب التواريخ
    const reservationDate = new Date();
    const expiryDate = addDays(reservationDate, input.expiryDays ?? 7);

    // 4) إدخال الحجز
    const [reservation] = await tx
      .insert(frameReservations)
      .values({
        storeId: input.storeId,
        clientId: input.clientId,
        clientName: input.clientName,
        status: 'PENDING',
        items: reservationItems,
        reservationDate,
        expiryDate,
        totalAmount: totalAmount.toString(),
        depositAmount: '0',
        remainingAmount: totalAmount.toString(),
        notes: input.notes,
      })
      .returning();


    // 5) تحديث reservedQuantity لكل منتج
    for (const item of input.items) {
      await tx
        .update(products)
        .set({
          reservedQuantity: sql`${products.reservedQuantity} + ${item.quantity}`,
        })
        .where(eq(products.id, item.productId));
    }

    return reservation as FrameReservation;
  });
}

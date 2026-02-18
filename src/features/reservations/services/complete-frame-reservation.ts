'use server';

import { db } from '@/db';
import { products, frameReservations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { CompleteFrameReservationInput, FrameReservation } from '../types/reservation.types';

/**
 * Termine une réservation en la convertissant en vente
 * Le stock est déduit et la quantité réservée est libérée
 */
export async function completeFrameReservation(
  input: CompleteFrameReservationInput
): Promise<FrameReservation> {
  return await db.transaction(async (tx) => {

    // 1) جلب الحجز
    const reservation = await tx.query.frameReservations.findFirst({
      where: eq(frameReservations.id, input.reservationId),
    });

    if (!reservation) {
      throw new Error('Réservation introuvable');
    }

    if (reservation.status !== 'PENDING') {
      throw new Error(`Cette réservation a déjà été traitée (statut: ${reservation.status})`);
    }

    // 2) تحديث stock لكل منتج
    for (const item of reservation.items as any[]) {
      await tx
        .update(products)
        .set({
          quantiteStock: sql`${products.quantiteStock} - ${item.quantity}`,
          reservedQuantity: sql`${products.reservedQuantity} - ${item.quantity}`,
        })
        .where(eq(products.id, item.productId));
    }

    // 3) تحديث الحجز
    const [updated] = await tx
      .update(frameReservations)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
        saleId: input.saleId,
        notes: reservation.notes
          ? `${reservation.notes}\n[Converti en vente #${input.saleId}]`
          : `Converti en vente #${input.saleId}`,
      })
      .where(eq(frameReservations.id, input.reservationId))
      .returning();

    return updated as FrameReservation;
  });
}

import { db } from '@/db';
import { products, frameReservations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { CancelFrameReservationInput, FrameReservation } from '../types/reservation.types';

/**
 * Annule ou marque comme expirée une réservation
 * Libère la quantité réservée sans toucher au stock réel
 */
export async function cancelFrameReservation(
  input: CancelFrameReservationInput
): Promise<FrameReservation> {
  return await db.transaction(async (tx) => {
    
    // 1) جلب الحجز
    const reservation = await tx.query.frameReservations.findFirst({
      where: eq(frameReservations.id, input.reservationId),
    });
    
    if (!reservation) {
      throw new Error('Réservation introuvable');
    }
    
    // لا يمكن إلغاء حجز مكتمل
    if (reservation.status === 'COMPLETED') {
      throw new Error('Impossible d\'annuler une réservation complétée');
    }
    
    // إذا كان بالفعل ملغى أو منتهي، رجّعه كما هو
    if (reservation.status === 'CANCELLED' || reservation.status === 'EXPIRED') {
      return reservation as FrameReservation;
    }
    
    // 2) إرجاع الكمية المحجوزة للستوك
    for (const item of reservation.items as any[]) {
      await tx
        .update(products)
        .set({
          reservedQuantity: sql`${products.reservedQuantity} - ${item.quantity}`,
        })
        .where(eq(products.id, item.productId));
    }
    
    // 3) تحديد الحالة الجديدة
    const newStatus = input.setExpired ? 'EXPIRED' : 'CANCELLED';
    const cancelMessage = input.setExpired
      ? '[Expiration automatique]'
      : `[Annulation]${input.reason ? ' ' + input.reason : ''}`;
    
    // 4) تحديث الحجز
    const [updated] = await tx
      .update(frameReservations)
      .set({
        status: newStatus,
        notes: reservation.notes
          ? `${reservation.notes}\n${cancelMessage}`
          : cancelMessage,
      })
      .where(eq(frameReservations.id, input.reservationId))
      .returning();
    
    return updated as FrameReservation;
  });
}

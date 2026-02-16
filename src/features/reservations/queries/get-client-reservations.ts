import { db } from '@/db';
import { frameReservations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { FrameReservation } from '../types/reservation.types';

/**
 * Récupère toutes les réservations d'un client spécifique
 */
export async function getClientReservations(
  clientId: number
): Promise<FrameReservation[]> {
  try {
    // Use db.select() for more control and robustness
    const results = await db
      .select()
      .from(frameReservations)
      .where(eq(frameReservations.clientId, clientId))
      .orderBy(desc(frameReservations.createdAt));
    
    // Map manually to ensure dates are strings/dates as expected
    const reservations: FrameReservation[] = results.map(r => ({
        id: r.id,
        storeId: r.storeId,
        clientId: r.clientId,
        clientName: r.clientName,
        status: r.status as any,
        items: r.items as any[],
        reservationDate: r.reservationDate ? new Date(r.reservationDate) : new Date(),
        expiryDate: r.expiryDate ? new Date(r.expiryDate) : new Date(),
        completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
        saleId: r.saleId || undefined, // Handle null
        notes: r.notes || undefined,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    }));

    return reservations;
  } catch (error: any) {
    console.error('❌ Error fetching reservations (select):', error);
    return [];
  }

}

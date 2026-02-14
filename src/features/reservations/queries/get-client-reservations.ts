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
    const reservations = await db.query.frameReservations.findMany({
      where: eq(frameReservations.clientId, clientId),
      orderBy: [desc(frameReservations.createdAt)],
    });
    return reservations as FrameReservation[];
  } catch (error: any) {
    if (error.message?.includes('relation "frame_reservations" does not exist')) {
        console.warn('⚠️ Frame Reservations table missing. Returning empty list.');
        return [];
    }
    console.error('Error fetching reservations:', error);
    return [];
  }

}

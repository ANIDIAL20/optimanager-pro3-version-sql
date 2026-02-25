'use server';

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
    // 🛡️ RobustFetch: Select specific columns to avoid failures
    const results = await db
      .select({
        id: frameReservations.id,
        storeId: frameReservations.storeId,
        clientId: frameReservations.clientId,
        clientName: frameReservations.clientName,
        status: frameReservations.status,
        items: frameReservations.items,
        reservationDate: frameReservations.reservationDate,
        expiryDate: frameReservations.expiryDate,
        totalAmount: frameReservations.totalAmount,
        depositAmount: frameReservations.depositAmount,
        remainingAmount: frameReservations.remainingAmount,
        completedAt: frameReservations.completedAt,
        saleId: frameReservations.saleId,
        notes: frameReservations.notes,
        createdAt: frameReservations.createdAt,
        updatedAt: frameReservations.updatedAt,
      })
      .from(frameReservations)
      .where(eq(frameReservations.clientId, clientId))
      .orderBy(desc(frameReservations.createdAt));

    // Map manually to ensure dates are strings/dates as expected
    const reservations: FrameReservation[] = results.map((r: any) => ({
      id: r.id,
      storeId: r.storeId,
      clientId: r.clientId,
      clientName: r.clientName,
      status: r.status as any,
      items: r.items as any[],
      reservationDate: r.reservationDate ? new Date(r.reservationDate) : new Date(),
      expiryDate: r.expiryDate ? new Date(r.expiryDate) : new Date(),
      totalAmount: r.totalAmount ? parseFloat(r.totalAmount.toString()) : 0,
      depositAmount: r.depositAmount ? parseFloat(r.depositAmount.toString()) : 0,
      remainingAmount: r.remainingAmount ? parseFloat(r.remainingAmount.toString()) : 0,
      completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
      saleId: r.saleId || undefined, // Handle null
      notes: r.notes || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    }));


    return reservations;
  } catch (error: any) {
    console.error('💥 [getClientReservations] Query Failed:', {
      clientId,
      message: error.message,
      stack: error.stack,
      hint: error.hint,
      detail: error.detail
    });
    return [];
  }

}

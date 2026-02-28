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
  console.log('🔍 [getClientReservations] Entering with clientId:', clientId);
  try {
    const results = await db.query.frameReservations.findMany({
      where: eq(frameReservations.clientId, clientId),
      orderBy: [desc(frameReservations.createdAt)],
    });

    console.log(`✅ [getClientReservations] Success: ${results.length} found`);

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
      saleId: r.saleId || undefined,
      notes: r.notes || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    }));


    return reservations;
  } catch (error: any) {
    console.error('💥 [getClientReservations] Query Failed:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('DEBUG INFO:', {
      clientId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as any)?.code,
      errorDetail: (error as any)?.detail,
      errorSchema: (error as any)?.schema,
      errorTable: (error as any)?.table,
      errorColumn: (error as any)?.column,
    });
    return [];
  }

}

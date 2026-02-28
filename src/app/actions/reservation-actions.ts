'use server';

import { secureAction } from '@/lib/secure-action';
import { createFrameReservation } from '@/features/reservations/services/create-frame-reservation';
import { completeFrameReservation } from '@/features/reservations/services/complete-frame-reservation';
import { cancelFrameReservation } from '@/features/reservations/services/cancel-frame-reservation';
import { getClientReservations } from '@/features/reservations/queries/get-client-reservations';
import { recordAdvancePayment } from '@/app/actions/payment-actions';
import { db } from '@/db';
// no cashSessions import
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Action sécurisée pour créer une réservation
 */
export const createFrameReservationAction = secureAction(async (userId, user, input: any) => {
    const result = await createFrameReservation({
        ...input,
        storeId: userId // On impose l'ID de l'utilisateur connecté
    });
    revalidatePath('/dashboard/clients');
    return result;
});

/**
 * Action sécurisée pour compléter une réservation
 */
export const completeFrameReservationAction = secureAction(async (userId, user, input: any) => {
    const result = await completeFrameReservation(input);
    revalidatePath('/dashboard/clients');
    return result;
});

/**
 * Action sécurisée pour annuler une réservation
 */
export const cancelFrameReservationAction = secureAction(async (userId, user, input: any) => {
    const result = await cancelFrameReservation(input);
    revalidatePath('/dashboard/clients');
    return result;
});

/**
 * Action sécurisée pour récupérer les réservations d'un client
 */
export const getClientReservationsAction = secureAction(async (userId, user, clientId: number) => {
    return await getClientReservations(clientId);
});

const createReservationFromCartSchema = z.object({
  clientId: z.number().int().positive(),
  clientName: z.string().min(1),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
  expiryDays: z.number().int().optional(),
  notes: z.string().optional(),
  avanceAmount: z.number().min(0).default(0),
  avance: z.number().optional().default(0),
  paymentMethod: z.string().optional(),
});

export const createReservationFromCartAction = secureAction(async (userId, user, input: z.infer<typeof createReservationFromCartSchema>) => {
  const { clientId, clientName, items, expiryDays, notes, avanceAmount, avance, paymentMethod } = createReservationFromCartSchema.parse(input);

  // Link existing advance
  let finalNotes = notes || '';
  if (avance > 0) {
    const avanceRecordStr = `[Avance existante liée: ${avance} MAD]`;
    finalNotes = finalNotes ? `${finalNotes}\n${avanceRecordStr}` : avanceRecordStr;
  }

  // 1. Create the base reservation
  const reservation = await createFrameReservation({
    clientId,
    clientName,
    items,
    expiryDays: expiryDays || 7,
    notes: finalNotes,
    storeId: userId
  });

  if (!reservation) throw new Error("Erreur lors de la création de la réservation");

  // 2. Register advance payment if present
  if (avanceAmount > 0) {
    await recordAdvancePayment({
      clientId,
      amount: avanceAmount,
      referenceId: reservation.id.toString(),
      referenceType: 'RESERVATION',
      notes: `Avance pour réservation #${reservation.id}`
    });

    // 🔥 CAISSE INTEGRATION REMOVED
  }

  revalidatePath('/dashboard/ventes');
  revalidatePath('/dashboard/clients');
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: reservation };
});

/**
 * Récupère les réservations ACTIVES (PENDING) d'un client
 */
export async function getActiveReservationsByClient(clientId: number | string) {
  try {
    const id = typeof clientId === 'string' ? parseInt(clientId) : clientId;
    if (isNaN(id)) return { success: false, error: "ID Client invalide" };

    const results = await db.query.frameReservations.findMany({
      where: and(
        eq(frameReservations.clientId, id),
        eq(frameReservations.status, 'PENDING')
      ),
      orderBy: [desc(frameReservations.createdAt)]
    });

    return { success: true, data: results };
  } catch (error: any) {
    console.error("Error fetching active reservations:", error);
    return { success: false, error: "Erreur lors de la récupération des réservations" };
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { createFrameReservation } from '@/features/reservations/services/create-frame-reservation';
import { completeFrameReservation } from '@/features/reservations/services/complete-frame-reservation';
import { cancelFrameReservation } from '@/features/reservations/services/cancel-frame-reservation';
import type {
  CreateFrameReservationInput,
  CompleteFrameReservationInput,
  CancelFrameReservationInput,
} from '@/features/reservations/types/reservation.types';

import { auth } from '@/auth';

/**
 * Server Action pour créer une réservation
 */
export async function createFrameReservationAction(
  input: CreateFrameReservationInput
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Authentification requise");
    }

    // Override storeId with the actual user ID to satisfy FK constraint
    const reservationInput = {
        ...input,
        storeId: session.user.id
    };

    const reservation = await createFrameReservation(reservationInput);
    
    // Revalidation des chemins pour mettre à jour l'UI
    revalidatePath(`/dashboard/clients/${input.clientId}`);
    revalidatePath('/produits');
    
    return { success: true, data: reservation };
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action pour compléter une réservation (conversion en vente)
 */
export async function completeFrameReservationAction(
  input: CompleteFrameReservationInput
) {
  try {
    const reservation = await completeFrameReservation(input);
    
    revalidatePath(`/dashboard/clients/${reservation.clientId}`);
    revalidatePath('/produits');
    
    return { success: true, data: reservation };
  } catch (error: any) {
    console.error('Error completing reservation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action pour annuler une réservation
 */
export async function cancelFrameReservationAction(
  input: CancelFrameReservationInput
) {
  try {
    const reservation = await cancelFrameReservation(input);
    
    revalidatePath(`/dashboard/clients/${reservation.clientId}`);
    revalidatePath('/produits');
    
    return { success: true, data: reservation };
  } catch (error: any) {
    console.error('Error cancelling reservation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action pour récupérer les réservations d'un client
 */
export async function getClientReservationsAction(clientId: string) {
  try {
    const { getClientReservations } = await import('@/features/reservations/queries/get-client-reservations');
    const reservations = await getClientReservations(parseInt(clientId));
    return { success: true, data: reservations };
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return { success: false, error: error.message };
  }
}

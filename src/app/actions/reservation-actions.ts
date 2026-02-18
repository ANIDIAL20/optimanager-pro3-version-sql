'use server';

import { secureAction } from '@/lib/secure-action';
import { createFrameReservation } from '@/features/reservations/services/create-frame-reservation';
import { completeFrameReservation } from '@/features/reservations/services/complete-frame-reservation';
import { cancelFrameReservation } from '@/features/reservations/services/cancel-frame-reservation';
import { getClientReservations } from '@/features/reservations/queries/get-client-reservations';
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

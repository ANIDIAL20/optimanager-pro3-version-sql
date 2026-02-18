'use server';

import { db } from '@/db';
import { clients, clientTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

/**
 * Enregistre une avance (paiement partiel) reçue lors d'une commande ou réservation
 */
export const recordAdvancePayment = secureAction(async (userId, user, { clientId, amount, notes, referenceId, referenceType }: {
    clientId: number,
    amount: number,
    notes?: string,
    referenceId?: string,
    referenceType?: 'LENS_ORDER' | 'RESERVATION'
}) => {
    try {
        if (amount <= 0) return { success: true }; // Rien à enregistrer si le montant est 0

        return await db.transaction(async (tx) => {
            // 1. Récupérer le client pour obtenir le solde actuel
            const client = await tx.query.clients.findFirst({
                where: eq(clients.id, clientId),
            });

            if (!client) throw new Error('Client introuvable');

            const previousBalance = parseFloat(client.balance || '0');
            // Un paiement d'avance est un crédit, il diminue donc le solde d'impayés du client.
            // Dans notre convention de transaction: montant négatif = argent reçu du client.
            const newBalance = previousBalance - amount;

            // 2. Créer l'enregistrement de transaction
            await tx.insert(clientTransactions).values({
                userId,
                clientId,
                type: 'PAYMENT',
                referenceId: referenceId ? `${referenceType}:${referenceId}` : 'ADVANCE',
                amount: (-amount).toString(), // Le paiement est stocké en négatif (diminue l'impayé)
                previousBalance: previousBalance.toString(),
                newBalance: newBalance.toString(),
                notes: notes || `Avance reçue pour ${referenceType === 'LENS_ORDER' ? 'commande de verres' : 'réservation'}`,
                date: new Date(),
            });

            // 3. Mettre à jour le solde du client
            await tx.update(clients)
                .set({
                    balance: newBalance.toString(),
                    updatedAt: new Date()
                })
                .where(eq(clients.id, clientId));

            await logSuccess(userId, 'CREATE', 'payments', clientId.toString(), { amount, type: referenceType, referenceId });

            revalidatePath(`/dashboard/clients/${clientId}`);
            return { success: true };
        });
    } catch (error: any) {
        console.error('❌ Erreur lors de l\'enregistrement de l\'avance:', error);
        await logFailure(userId, 'CREATE', 'payments', error.message);
        return { success: false, error: error.message };
    }
});

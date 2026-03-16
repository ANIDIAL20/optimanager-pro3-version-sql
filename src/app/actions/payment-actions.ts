'use server';
import { neonConfig } from '@neondatabase/serverless';
// Configure WebSocket for Node.js environment (required for transactions)
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  neonConfig.webSocketConstructor = eval('require')('ws');
}


import { db } from '@/db';
import { clients, clientTransactions, lensOrders, reservations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

import { DrizzleTx } from '@/types/db';

/**
 * Enregistre une avance (paiement partiel) reçue lors d'une commande ou réservation
 * ✅ Met à jour :
 *   1. clientTransactions (historique)
 *   2. clients.balance (solde)
 *   3. lensOrders.amountPaid  (si referenceType === 'LENS_ORDER')
 *   4. reservations.depositAmount (si referenceType === 'RESERVATION')
 */
export const recordAdvancePayment = secureAction(async (userId, user, { clientId, amount, notes, referenceId, referenceType }: {
    clientId: number,
    amount: number,
    notes?: string,
    referenceId?: string,
    referenceType?: 'LENS_ORDER' | 'RESERVATION'
}) => {
    try {
        console.log('🔵 [recordAdvancePayment] CALLED with:', { clientId, amount, referenceId, referenceType, amountType: typeof amount });

        if (amount <= 0) {
          console.log('🟡 [recordAdvancePayment] amount <= 0, early return (amount:', amount, ')');
          return { success: true }; // Rien à enregistrer si le montant est 0
        }

        return await db.transaction(async (tx: DrizzleTx) => {
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

            // 4. ✅ FIX : Persister l'avance sur la ligne concernée
            //    (logique supprimée avec le module Caisse — restaurée ici)
            if (referenceId) {
                const refIdNum = parseInt(referenceId);

                if (referenceType === 'LENS_ORDER' && !isNaN(refIdNum)) {
                    console.log('🟢 [recordAdvancePayment] Updating lensOrders.amountPaid:', { refIdNum, amount: amount.toString() });
                    const updateResult = await tx.update(lensOrders)
                        .set({
                            amountPaid: amount.toString(),
                            updatedAt: new Date(),
                        })
                        .where(eq(lensOrders.id, refIdNum))
                        .returning();

                    console.log('✅ [recordAdvancePayment] lensOrders updated. Returned rows:', updateResult?.length, 'amountPaid stored:', updateResult?.[0]?.amountPaid);
                }

                if (referenceType === 'RESERVATION' && !isNaN(refIdNum)) {
                    const updateResult = await tx.update(reservations)
                        .set({
                            depositAmount: amount.toString(),
                            updatedAt: new Date(),
                        })
                        .where(eq(reservations.id, refIdNum))
                        .returning();

                    console.log('✅ Avance saved on reservations:', updateResult);
                }
            }

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

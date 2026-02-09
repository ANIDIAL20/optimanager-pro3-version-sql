/**
 * Client Transactions Logic
 * Ledger for client accounts
 */

'use server';

import { db } from '@/db';
import { clientTransactions, clients } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';

export interface ClientTransaction {
    id: number;
    type: string;
    amount: number;
    previousBalance: number;
    newBalance: number;
    date: string;
    notes: string;
    referenceId?: string;
}

export const getClientTransactions = secureAction(async (userId, user, clientId: string) => {
    try {
        const id = parseInt(clientId);
        
        const txs = await db.select().from(clientTransactions)
            .where(eq(clientTransactions.clientId, id))
            .orderBy(desc(clientTransactions.date));

        const mapped: ClientTransaction[] = txs.map(t => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount),
            previousBalance: Number(t.previousBalance),
            newBalance: Number(t.newBalance),
            date: t.date?.toISOString() || '',
            notes: t.notes || '',
            referenceId: t.referenceId || undefined
        }));

        return { success: true, transactions: mapped };

    } catch (error: any) {
        return { success: false, error: "Erreur récupération historique" };
    }
});

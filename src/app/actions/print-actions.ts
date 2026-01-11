'use server';

import { db } from '@/db';
import { devis, sales, clients, settings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';

export type PrintDocumentType = 'devis' | 'facture';

export const getPrintData = secureAction(async (userId, user, documentId: string, type: PrintDocumentType) => {
    try {
        const collectionName = type === 'devis' ? 'devis' : 'sales';
        const id = parseInt(documentId);

        // 1. Fetch the Document (Devis or Sale)
        let documentData: any = null;
        
        if (type === 'devis') {
            const result = await db.query.devis.findFirst({
                where: and(eq(devis.id, id), eq(devis.userId, userId))
            });
            if (result) {
                documentData = {
                    id: result.id.toString(),
                    ...result,
                    items: result.items,
                    totalHT: Number(result.totalHT),
                    totalTTC: Number(result.totalTTC)
                };
            }
        } else {
            const result = await db.query.sales.findFirst({
                where: and(eq(sales.id, id), eq(sales.userId, userId))
            });
            if (result) {
                documentData = {
                    id: result.id.toString(),
                    ...result,
                    items: result.items,
                    totalHT: Number(result.totalHT || 0),
                    totalTTC: Number(result.totalTTC || 0),
                    totalNet: Number(result.totalNet || 0),
                    totalPaye: Number(result.totalPaye || 0),
                    resteAPayer: Number(result.resteAPayer || 0)
                };
            }
        }

        if (!documentData) {
            return { success: false, error: 'Document introuvable' };
        }

        // 2. Fetch Client Details (if clientId exists)
        let clientData = null;
        const clientId = documentData.clientId;
        if (clientId) {
            const clientResult = await db.query.clients.findFirst({
                where: eq(clients.id, clientId)
            });
            if (clientResult) {
                clientData = {
                    id: clientResult.id,
                    fullName: clientResult.fullName,
                    email: clientResult.email,
                    phone: clientResult.phone,
                    address: clientResult.address,
                    city: clientResult.city
                };
            }
        }

        // 3. Fetch Shop Settings
        let settingsData = null;
        const settingsResult = await db.query.settings.findFirst({
            where: and(eq(settings.userId, userId), eq(settings.settingKey, 'shop'))
        });
        if (settingsResult) {
            settingsData = settingsResult.value;
        }

        return {
            success: true,
            data: {
                document: documentData,
                client: clientData,
                settings: settingsData
            }
        };

    } catch (error: any) {
        console.error('Error fetching print data:', error);
        return { success: false, error: 'Erreur lors de la récupération des données' };
    }
});

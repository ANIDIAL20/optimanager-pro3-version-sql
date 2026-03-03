'use server';

import { db } from '@/db';
import { devis, sales, clients, shopProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';

/** 'recu' is a receipt built from a sale — internally treated the same as 'facture' */
export type PrintDocumentType = 'devis' | 'facture' | 'recu';

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
                    ...result,
                    id: result.id.toString(),
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
                const { lensOrders } = await import('@/db/schema');
                const { desc } = await import('drizzle-orm');
                const itemsWithLensDetails = await Promise.all((result.items as any[] || []).map(async (item) => {
                    let lensDetails = item.lensDetails;
                    
                    const isVerre =
                        item.reference?.startsWith('VERRE-') ||
                        item.reference?.startsWith('LG-') ||
                        item.productType === 'VERRE' ||
                        item.category === 'Verres';

                    if (isVerre && !lensDetails) {
                        const lensOrder = await db.query.lensOrders.findFirst({
                            where: and(
                                eq(lensOrders.saleId, result.id),
                                eq(lensOrders.userId, userId)
                            ),
                            orderBy: desc(lensOrders.createdAt),
                        });

                        if (lensOrder) {
                            lensDetails = [];
                            if (lensOrder.sphereR || lensOrder.cylindreR) {
                                lensDetails.push({
                                    eye: 'OD',
                                    sphere: lensOrder.sphereR,
                                    cylinder: lensOrder.cylindreR,
                                    axis: lensOrder.axeR,
                                    addition: lensOrder.additionR,
                                    treatment: lensOrder.treatment,
                                });
                            }
                            if (lensOrder.sphereL || lensOrder.cylindreL) {
                                lensDetails.push({
                                    eye: 'OG',
                                    sphere: lensOrder.sphereL,
                                    cylinder: lensOrder.cylindreL,
                                    axis: lensOrder.axeL,
                                    addition: lensOrder.additionL,
                                    treatment: lensOrder.treatment,
                                });
                            }
                        }
                    }

                    return { ...item, lensDetails };
                }));

                documentData = {
                    ...result,
                    id: result.id.toString(),
                    items: itemsWithLensDetails,
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
        const settingsResult = await db.query.shopProfiles.findFirst({
            where: eq(shopProfiles.userId, userId)
        });
        if (settingsResult) {
            settingsData = settingsResult;
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

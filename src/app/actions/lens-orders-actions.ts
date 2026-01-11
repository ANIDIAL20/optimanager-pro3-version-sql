'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { revalidatePath } from 'next/cache';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export interface ReceptionData {
    supplierId: string;
    supplierName: string;
    buyingPrice: number;
    supplierInvoiceRef: string;
    receivedAt: Date;
}

/**
 * Mark a lens order as received and record supplier cost information
 */
export async function receiveLensOrder(
    userId: string,
    saleId: string,
    data: ReceptionData
) {
    console.log(`📦 Receiving lens order: ${saleId}`);

    try {
        const db = getFirestore();
        const saleRef = db.collection(`stores/${userId}/sales`).doc(saleId);

        // Verify the sale exists
        const saleDoc = await saleRef.get();
        if (!saleDoc.exists) {
            return {
                success: false,
                error: 'Commande introuvable',
            };
        }

        // Update the sale with reception data
        await saleRef.update({
            status: 'recue',
            supplierId: data.supplierId,
            supplierName: data.supplierName,
            buyingPrice: data.buyingPrice,
            supplierInvoiceRef: data.supplierInvoiceRef,
            receivedAt: data.receivedAt.toISOString(),
            updatedAt: new Date().toISOString(),
        });

        console.log(`✅ Lens order ${saleId} marked as received`);

        // Revalidate relevant paths
        revalidatePath(`/clients/[id]`, 'page');
        revalidatePath('/dashboard/ventes');

        return {
            success: true,
            message: 'Commande réceptionnée avec succès',
        };

    } catch (error: any) {
        console.error('💥 Error receiving lens order:', error);
        return {
            success: false,
            error: error.message || 'Erreur lors de la réception de la commande',
        };
    }
}

/**
 * Mark a lens order as delivered to the client
 */
export async function deliverLensOrder(
    userId: string,
    saleId: string
) {
    console.log(`✅ Delivering lens order: ${saleId}`);

    try {
        const db = getFirestore();
        const saleRef = db.collection(`stores/${userId}/sales`).doc(saleId);

        // Verify the sale exists and is in 'recue' status
        const saleDoc = await saleRef.get();
        if (!saleDoc.exists) {
            return {
                success: false,
                error: 'Commande introuvable',
            };
        }

        const saleData = saleDoc.data();
        if (saleData?.status !== 'recue') {
            return {
                success: false,
                error: 'La commande doit être réceptionnée avant d\'être livrée',
            };
        }

        // Update the sale to delivered status
        await saleRef.update({
            status: 'livree',
            deliveredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        console.log(`✅ Lens order ${saleId} marked as delivered`);

        // Revalidate relevant paths
        revalidatePath(`/clients/[id]`, 'page');
        revalidatePath('/dashboard/ventes');

        return {
            success: true,
            message: 'Commande marquée comme livrée',
        };

    } catch (error: any) {
        console.error('💥 Error delivering lens order:', error);
        return {
            success: false,
            error: error.message || 'Erreur lors de la livraison de la commande',
        };
    }
}

/**
 * Suppliers Actions
 * Server actions for managing suppliers
 * NOTE: Suppliers are still stored in Firebase as there's no SQL suppliers table yet
 */

'use server';

import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';
import { logSuccess, logFailure } from '@/lib/audit-log';

export interface Supplier {
    id: string;
    nomCommercial: string;
    contactPersonne?: string;
    telephone?: string;
    email?: string;
    address?: string;
    notes?: string;
}

/**
 * Get all suppliers for the current user
 */
export async function getSuppliers() {
    try {
        const session = await auth();
        if (!session?.user?.uid) {
            return { success: false, error: 'Non authentifié', suppliers: [] };
        }

        const userId = session.user.uid;

        // Fetch from Firebase (temporary until SQL migration)
        const suppliersRef = adminDb.collection(`stores/${userId}/suppliers`);
        const snapshot = await suppliersRef.orderBy('nomCommercial').get();

        const suppliers: Supplier[] = snapshot.docs.map(doc => ({
            id: doc.id,
            nomCommercial: doc.data().nomCommercial || 'Sans Nom',
            contactPersonne: doc.data().contactPersonne,
            telephone: doc.data().telephone,
            email: doc.data().email,
            address: doc.data().address,
            notes: doc.data().notes,
        }));

        await logSuccess(userId, 'READ', 'suppliers', undefined, { count: suppliers.length });
        return { success: true, suppliers };

    } catch (error: any) {
        console.error('Error fetching suppliers:', error);
        const session = await auth().catch(() => null);
        if (session?.user?.uid) {
            await logFailure(session.user.uid, 'READ', 'suppliers', error.message);
        }
        return { success: false, error: 'Erreur récupération fournisseurs', suppliers: [] };
    }
}

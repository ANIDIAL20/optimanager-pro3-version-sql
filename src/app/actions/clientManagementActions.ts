// @ts-nocheck
'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache'; // Important pour que le tableau se mette à jour automatiquement

// 1. Fonction de blocage (Toggle Block Status)
export async function toggleClientStatus(uid: string, currentStatus: string) {
    try {
        const isSuspending = currentStatus === 'active'; // On bloque ou on débloque ?
        const newStatus = isSuspending ? 'suspended' : 'active';

        // a. Mise à jour Firebase Auth (pour bloquer l'accès)
        await adminAuth.updateUser(uid, {
            disabled: isSuspending
        });

        // b. Mise à jour Firestore (pour l'affichage dans le tableau)
        await adminDb.collection('clients').doc(uid).update({
            status: newStatus
        });

        // c. Mise à jour de la page
        revalidatePath('/admin');

        return { success: true, message: isSuspending ? 'Compte bloqué 🚫' : 'Compte activé ✅', newStatus };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 2. Fonction de prolongation (Extend Subscription)
export async function extendSubscription(uid: string, currentExpiryDate: string, daysToAdd: number = 30) {
    try {
        // Calcul de la nouvelle date
        const date = new Date(currentExpiryDate);
        date.setDate(date.getDate() + daysToAdd);
        const newExpiry = date.toISOString().split('T')[0];

        // Mise à jour Firestore
        await adminDb.collection('clients').doc(uid).update({
            expires: newExpiry
        });

        revalidatePath('/admin');
        return { success: true, message: `Abonnement prolongé jusqu'au ${newExpiry} 📅` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

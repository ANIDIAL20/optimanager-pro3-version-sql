'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache'; // مهم باش الطابلو يتحدث بوحدو

// 1. دالة البلوكاج (Toggle Block Status)
export async function toggleClientStatus(uid: string, currentStatus: string) {
    try {
        const isSuspending = currentStatus === 'active'; // واش غانبلوكيو ولا نطلقوه؟
        const newStatus = isSuspending ? 'suspended' : 'active';

        // أ. تحديث Firebase Auth (باش مايقدرش يدخل نهائياً)
        await adminAuth.updateUser(uid, {
            disabled: isSuspending
        });

        // ب. تحديث Firestore (باش تبان فالطابلو)
        await adminDb.collection('clients').doc(uid).update({
            status: newStatus
        });

        // ج. تحديث الصفحة
        revalidatePath('/admin');

        return { success: true, message: isSuspending ? 'Compte bloqué 🚫' : 'Compte activé ✅', newStatus };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 2. دالة تمديد الوقت (Extend Subscription)
export async function extendSubscription(uid: string, currentExpiryDate: string, daysToAdd: number = 30) {
    try {
        // حساب التاريخ الجديد
        const date = new Date(currentExpiryDate);
        date.setDate(date.getDate() + daysToAdd);
        const newExpiry = date.toISOString().split('T')[0];

        // تحديث Firestore
        await adminDb.collection('clients').doc(uid).update({
            expires: newExpiry
        });

        revalidatePath('/admin');
        return { success: true, message: `Abonnement prolongé jusqu'au ${newExpiry} 📅` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// services/adminService.ts
import { initializeFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const { firestore: db } = initializeFirebase();

// دالة لجلب جميع الكليان
export const getClients = async () => {
    try {
        const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        // كنحولو الداتا من شكل Firestore لشكل عادي JavaScript
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // تحويل التاريخ من Timestamp لـ String باش مايوقعش مشكل فـ React
            expires: doc.data().expires || 'N/A',
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
        }));
    } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
    }
};

// هادي هي الدالة اللي غتعيط ليها من الفورم
export const createClientSubscription = async (email: string, plan: string) => {
    try {
        // 1. حساب تاريخ انتهاء الصلاحية
        const expiryDate = new Date();
        if (plan === '15-Day Trial') {
            expiryDate.setDate(expiryDate.getDate() + 15);
        } else if (plan === 'Monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (plan === 'Yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        // 2. إرسال الداتا لـ Firestore
        // ملاحظة: هادشي غيخدم غير إلا كنتي مكونيكتي بالايمايل ديال Admin
        const docRef = await addDoc(collection(db, "clients"), {
            email: email.toLowerCase(),
            plan: plan,
            status: 'active',
            expires: expiryDate.toISOString().split('T')[0], // YYYY-MM-DD
            authMethod: 'Email',
            createdAt: serverTimestamp(),
        });

        return { success: true, id: docRef.id };

    } catch (error: any) {
        console.error("Error adding client: ", error);
        // هنا غتعرف واش Rules خدامين. إلا طلع ليك "Missing or insufficient permissions" راه الرولز صادقين
        return { success: false, error: error.message };
    }
};

// 1. دالة لتغيير الحالة (Active <-> Suspended)
export const toggleClientStatus = async (clientId: string, currentStatus: string) => {
    try {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const clientRef = doc(db, "clients", clientId);

        await updateDoc(clientRef, {
            status: newStatus
        });
        return { success: true, newStatus };
    } catch (error: any) {
        console.error("Error updating status:", error);
        return { success: false, error: error.message };
    }
};

// 2. دالة لتمديد الاشتراك (بـ 30 يوم مثلاً)
export const extendSubscription = async (clientId: string, currentExpiryDate: string) => {
    try {
        const date = new Date(currentExpiryDate);
        date.setDate(date.getDate() + 30); // زيد 30 يوم

        const clientRef = doc(db, "clients", clientId);
        await updateDoc(clientRef, {
            expires: date.toISOString().split('T')[0]
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error extending subscription:", error);
        return { success: false, error: error.message };
    }
};

// 3. دالة لحذف الكليان
export const deleteClient = async (clientId: string) => {
    try {
        await deleteDoc(doc(db, "clients", clientId));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting client:", error);
        return { success: false, error: error.message };
    }
};

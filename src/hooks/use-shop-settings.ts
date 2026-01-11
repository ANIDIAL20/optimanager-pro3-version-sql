import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useFirebase } from '@/firebase';

interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
}

export function useShopSettings() {
    const [settings, setSettings] = useState<ShopSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const firestore = useFirestore();
    const { user } = useFirebase();

    useEffect(() => {
        const fetchSettings = async () => {
            if (!firestore || !user) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const settingsRef = doc(firestore, `stores/${user.uid}/settings`, 'shop');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    setSettings(settingsSnap.data() as ShopSettings);
                } else {
                    // Default settings if none exist
                    setSettings({
                        shopName: 'Ma Boutique',
                    });
                }
            } catch (err) {
                console.error('Error fetching shop settings:', err);
                setError(err as Error);
                // Fallback settings
                setSettings({
                    shopName: 'Ma Boutique',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [firestore, user]);

    return { settings, isLoading, error };
}

import { useState, useEffect } from 'react';
import { getShopSettings } from '@/app/actions/shop-settings-actions';

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

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const result = await getShopSettings();

                if (result.success && result.data) {
                    setSettings(result.data as ShopSettings);
                } else {
                    // Default settings if none exist or error
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
    }, []);

    return { settings, isLoading, error };
}

/**
 * Settings Actions - Neon/Drizzle Version
 * Secure settings management
 */

'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

export interface ShopSettings {
    shopName: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
    taxId?: string;
    rc?: string;
    if?: string;
    ice?: string;
    footerText?: string;
}

/**
 * Get shop settings
 */
export const getShopSettings = secureAction(async (userId, user) => {
    try {
        const result = await db.query.settings.findFirst({
            where: and(eq(settings.userId, userId), eq(settings.settingKey, 'shop'))
        });

        if (!result) {
            // Return default settings
            return {
                success: true,
                settings: {
                    shopName: 'Mon Magasin',
                    address: '',
                    phone: '',
                    email: '',
                } as ShopSettings
            };
        }

        await logSuccess(userId, 'READ', 'settings', 'shop');
        return { success: true, settings: result.value as ShopSettings };

    } catch (error: any) {
        await logFailure(userId, 'READ', 'settings', error.message);
        return { success: false, error: 'Erreur récupération paramètres', settings: null };
    }
});

/**
 * Update shop settings
 */
export const updateShopSettings = secureAction(async (userId, user, data: ShopSettings) => {
    try {
        // Check if settings exist
        const existing = await db.query.settings.findFirst({
            where: and(eq(settings.userId, userId), eq(settings.settingKey, 'shop'))
        });

        if (existing) {
            // Update
            await db.update(settings)
                .set({
                    value: data,
                    updatedAt: new Date()
                })
                .where(eq(settings.id, existing.id));
        } else {
            // Insert
            await db.insert(settings).values({
                userId,
                settingKey: 'shop',
                value: data,
                createdAt: new Date()
            });
        }

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/settings');
        await logSuccess(userId, 'UPDATE', 'settings', 'shop');
        return { success: true, message: 'Paramètres mis à jour' };

    } catch (error: any) {
        await logFailure(userId, 'UPDATE', 'settings', error.message);
        return { success: false, error: 'Erreur mise à jour paramètres' };
    }
});

/**
 * Get any setting by key
 */
export const getSetting = secureAction(async (userId, user, key: string) => {
    try {
        const result = await db.query.settings.findFirst({
            where: and(eq(settings.userId, userId), eq(settings.settingKey, key))
        });

        return { success: true, value: result?.value || null };

    } catch (error: any) {
        return { success: false, error: error.message, value: null };
    }
});

/**
 * Set any setting by key
 */
export const setSetting = secureAction(async (userId, user, key: string, value: any) => {
    try {
        const existing = await db.query.settings.findFirst({
            where: and(eq(settings.userId, userId), eq(settings.settingKey, key))
        });

        if (existing) {
            await db.update(settings)
                .set({ value, updatedAt: new Date() })
                .where(eq(settings.id, existing.id));
        } else {
            await db.insert(settings).values({
                userId,
                settingKey: key,
                value,
                createdAt: new Date()
            });
        }

        revalidatePath('/dashboard');
        return { success: true, message: 'Paramètre enregistré' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

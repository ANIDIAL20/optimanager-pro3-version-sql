'use server';

import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const shopSettingsSchema = z.object({
  shopName: z.string().min(1, 'Le nom de la boutique est requis'),
  address: z.string().optional(),
  phone: z.string().optional(),
  ice: z.string().optional(),
  rib: z.string().optional(),
  logoUrl: z.string().optional(),
});

export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;

export const getShopSettings = secureAction(async (userId, user) => {
    try {
        const profile = await db.query.shopProfiles.findFirst({
            where: eq(shopProfiles.userId, userId)
        });

        if (!profile) {
            return { success: true, data: null };
        }

        return { 
            success: true, 
            data: {
                shopName: profile.shopName,
                address: profile.address || '',
                phone: profile.phone || '',
                ice: profile.ice || '',
                rib: profile.rib || '',
                logoUrl: profile.logoUrl || ''
            }
        };

    } catch (error: any) {
        console.error('Error fetching shop settings:', error);
        return { success: false, error: 'Erreur lors du chargement des paramètres' };
    }
});

export const updateShopSettings = secureAction(async (userId, user, data: ShopSettingsInput) => {
    try {
        const validated = shopSettingsSchema.parse(data);

        // Check if exists
        const existing = await db.query.shopProfiles.findFirst({
            where: eq(shopProfiles.userId, userId)
        });

        if (existing) {
            await db.update(shopProfiles)
                .set({
                    ...validated,
                    updatedAt: new Date()
                })
                .where(eq(shopProfiles.userId, userId));
        } else {
            await db.insert(shopProfiles).values({
                userId,
                ...validated
            });
        }

        await logSuccess(userId, 'UPDATE', 'shop_profiles', 'settings');
        revalidatePath('/dashboard/parametres');
        
        return { success: true, message: 'Paramètres mis à jour avec succès' };

    } catch (error: any) {
        console.error('Error updating shop settings:', error);
        await logFailure(userId, 'UPDATE', 'shop_profiles', error.message);
        return { success: false, error: 'Erreur lors de la sauvegarde' };
    }
});

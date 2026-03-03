/**
 * Shop Profile Server Actions
 * 
 * Handles shop profile management with SQL
 */

'use server';

import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { z } from 'zod';

// ========================================
// SCHEMAS
// ========================================

const shopProfileSchema = z.object({
  shopName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  address: z.string().optional(),
  phone: z.string().optional(),
  ice: z.string().optional(),
  rib: z.string().optional(),
  
  // Mandatory Legal Info (Morocco)
  if: z.string().optional(),
  rc: z.string().optional(),
  tp: z.string().optional(),
  inpe: z.string().optional().refine(v => !v || /^\d{9}$/.test(v), { message: "INPE invalide (doit contenir 9 chiffres)" }),
  
  logoUrl: z.string().optional(),
});

type ShopProfileInput = z.infer<typeof shopProfileSchema>;

// ========================================
// ACTIONS
// ========================================

  /*
   * Get shop profile for current user
   */
  export async function getShopProfile() {
    const session = await auth();
    
    if (!session?.user?.id) {
      throw new Error('Non authentifié');
    }
  
    try {
      // Use Query Builder instead of Relational Query for stability
      const [profile] = await db
        .select({
            id: shopProfiles.id,
            userId: shopProfiles.userId,
            shopName: shopProfiles.shopName,
            address: shopProfiles.address,
            phone: shopProfiles.phone,
            ice: shopProfiles.ice,
            rib: shopProfiles.rib,
            logoUrl: shopProfiles.logoUrl,
            documentSettings: shopProfiles.documentSettings,
            documentSettingsVersion: shopProfiles.documentSettingsVersion,
            documentSettingsUpdatedAt: shopProfiles.documentSettingsUpdatedAt,
            isActive: shopProfiles.isActive,
            // Omitted potentially problematic legacy columns temporarily
            // rc: shopProfiles.rc,
            // if: shopProfiles.if,
            // ... 
        })
        .from(shopProfiles)
        .where(eq(shopProfiles.userId, session.user.id))
        .limit(1);
    
      console.log('[getShopProfile] profile.id=', profile?.id); // DEBUG: Ensure ID is returned
      return profile as any || null; // Cast as any temporarily to bypass strict typing during debug
    } catch (error: any) {
        console.error("❌ getShopProfile ERROR:", error);
        // Log all properties of the error
        console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        throw error;
    }
  }
  
  /**
   * Create or update shop profile
   */
  export async function upsertShopProfile(data: ShopProfileInput) {
    const session = await auth();
    
    if (!session?.user?.id) {
      throw new Error('Non authentifié');
    }
  
    console.log('[upsertShopProfile] User:', session.user.id, 'Data:', data);
  
    // Validate input
    const validated = shopProfileSchema.parse(data);
  
    // Check if profile exists using Query Builder
    const [existing] = await db
        .select()
        .from(shopProfiles)
        .where(eq(shopProfiles.userId, session.user.id))
        .limit(1);
  
    if (existing) {
    // Update existing profile
    const [updated] = await db
      .update(shopProfiles)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(shopProfiles.userId, session.user.id))
      .returning();

    console.log('[upsertShopProfile] Updated:', updated);
    return updated;
  } else {
    // Create new profile
    const [created] = await db
      .insert(shopProfiles)
      .values({
        userId: session.user.id,
        ...validated,
      })
      .returning();

    console.log('[upsertShopProfile] Created:', created);
    return created;
  }
}

/**
 * Save document template config for current user
 */
export async function saveDocumentConfig(config: import('@/types/document-template').DocumentTemplateConfig) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non authentifié');

  const { revalidatePath } = await import('next/cache');

  await db
    .update(shopProfiles)
    .set({
      documentSettings: config as any,
      documentSettingsUpdatedAt: new Date(),
    })
    .where(eq(shopProfiles.userId, session.user.id));

  // Revalidate ALL pages that consume the document config so changes are
  // immediately visible on the next print without requiring a server restart.
  revalidatePath('/dashboard/parametres');
  revalidatePath('/print/facture', 'layout');
  revalidatePath('/print/devis', 'layout');
  revalidatePath('/print/bon-commande', 'layout');
  revalidatePath('/print/recu', 'layout');
}

/**
 * Get document template config for current user
 */
export async function getDocumentConfig(): Promise<import('@/types/document-template').DocumentTemplateConfig> {
  const { DEFAULT_TEMPLATE_CONFIG } = await import('@/types/document-template');
  const session = await auth();
  if (!session?.user?.id) return DEFAULT_TEMPLATE_CONFIG;

  try {
    const [profile] = await db
      .select({ documentSettings: shopProfiles.documentSettings })
      .from(shopProfiles)
      .where(eq(shopProfiles.userId, session.user.id))
      .limit(1);

    // documentSettings is NOT NULL in the schema so it always exists
    const stored = profile?.documentSettings as any;
    // If stored value is empty object (fresh row), return the default config
    if (!stored || Object.keys(stored).length === 0) return DEFAULT_TEMPLATE_CONFIG;
    return stored as import('@/types/document-template').DocumentTemplateConfig;
  } catch (err) {
    console.error('[getDocumentConfig] DB error:', err);
    const { DEFAULT_TEMPLATE_CONFIG: def } = await import('@/types/document-template');
    return def;
  }
}


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
        .select()
        .from(shopProfiles)
        .where(eq(shopProfiles.userId, session.user.id))
        .limit(1);
    
      return profile || null;
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

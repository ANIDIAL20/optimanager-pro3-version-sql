/**
 * Settings Server Actions
 * 
 * Generic CRUD operations for all settings tables
 */

'use server';

import { db } from '@/db';
import {
  brands,
  categories,
  materials,
  colors,
  treatments,
  mountingTypes,
  banks,
  insurances,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { z } from 'zod';

// ========================================
// TYPES
// ========================================

type SettingTable =
  | typeof brands
  | typeof categories
  | typeof materials
  | typeof colors
  | typeof treatments
  | typeof mountingTypes
  | typeof banks
  | typeof insurances;

type SettingType =
  | 'brands'
  | 'categories'
  | 'materials'
  | 'colors'
  | 'treatments'
  | 'mountingTypes'
  | 'banks'
  | 'insurances';

const tableMap: Record<SettingType, SettingTable> = {
  brands,
  categories,
  materials,
  colors,
  treatments,
  mountingTypes,
  banks,
  insurances,
};

// ========================================
// SCHEMAS
// ========================================

const settingItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  category: z.string().optional(), // Only for brands
});

const brandSchema = settingItemSchema.extend({
  category: z.string().optional(),
});

type SettingItemInput = z.infer<typeof settingItemSchema>;
type BrandInput = z.infer<typeof brandSchema>;

// ========================================
// GENERIC ACTIONS
// ========================================

/**
 * Get all items from a settings table
 */

import { unstable_noStore as noStore } from 'next/cache';

// ...

/**
 * Get all items from a settings table
 */
export async function getSettings(type: SettingType) {
  noStore(); // Opt out of static caching
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const table = tableMap[type];
  
  try {
    const items = await db
      .select()
      .from(table)
      .where(eq(table.userId, session.user.id))
      .orderBy(table.name);

    return items;
  } catch (error: any) {
    console.error(`[getSettings] Error fetching ${type}:`, error);
    // Log specifics if available
    if (error.code) console.error('DB Error Code:', error.code);
    if (error.hint) console.error('DB Error Hint:', error.hint);
    throw new Error(`Failed to fetch ${type}: ${error.message}`);
  }
}

/**
 * Create a new setting item
 */
export async function createSetting(type: SettingType, data: SettingItemInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const validated = settingItemSchema.parse(data);
  const table = tableMap[type];

  const [created] = await db
    .insert(table)
    .values({
      userId: session.user.id,
      ...validated,
    } as any)
    .returning();

  console.log(`[createSetting] Created ${type}:`, created);
  return created;
}

/**
 * Update a setting item
 */
export async function updateSetting(
  type: SettingType,
  id: number,
  data: SettingItemInput
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const validated = settingItemSchema.parse(data);
  const table = tableMap[type];

  const [updated] = await db
    .update(table)
    .set({
      ...validated,
      updatedAt: new Date(),
    } as any)
    .where(
      and(
        eq(table.id, id),
        eq(table.userId, session.user.id) // Security: user can only update their own
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Item non trouvé ou non autorisé');
  }

  console.log(`[updateSetting] Updated ${type}:`, updated);
  return updated;
}

/**
 * Delete a setting item
 */
export async function deleteSetting(type: SettingType, id: number) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const table = tableMap[type];

  const [deleted] = await db
    .delete(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.userId, session.user.id) // Security: user can only delete their own
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Item non trouvé ou non autorisé');
  }

  console.log(`[deleteSetting] Deleted ${type}:`, deleted);
  return deleted;
}

// ========================================
// SPECIFIC HELPERS
// ========================================

/**
 * Get brands (for dropdowns)
 */
export async function getBrands() {
  return getSettings('brands');
}

/**
 * Get categories (for dropdowns)
 */
export async function getCategories() {
  return getSettings('categories');
}

/**
 * Get materials (for dropdowns)
 */
export async function getMaterials() {
  return getSettings('materials');
}

/**
 * Get colors (for dropdowns)
 */
export async function getColors() {
  return getSettings('colors');
}

/**
 * Get insurances/mutuelles (for dropdowns)
 */
export async function getInsurances() {
  return getSettings('insurances');
}

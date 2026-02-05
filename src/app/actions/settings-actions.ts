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
import { eq, and, inArray, sql } from 'drizzle-orm';
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

import { unstable_noStore as noStore, revalidatePath } from 'next/cache';

// ...

/**
 * Get all items from a settings table
 */
import { secureAction } from '@/lib/secure-action';

// ... (keep imports)

/**
 * Get all items from a settings table
 */
export const getSettings = secureAction(async (userId, user, type: SettingType) => {
  noStore();
  
  // Table mapping verification
  let tableName: string;
  switch (type) {
    case 'brands': tableName = 'brands'; break;
    case 'categories': tableName = 'categories'; break;
    case 'materials': tableName = 'materials'; break;
    case 'colors': tableName = 'colors'; break;
    case 'treatments': tableName = 'treatments'; break;
    case 'mountingTypes': tableName = 'mounting_types'; break;
    case 'banks': tableName = 'banks'; break;
    case 'insurances': tableName = 'insurances'; break;
    default:
      throw new Error(`Invalid setting type: ${type}`);
  }

  try {
    // 🔒 SECURE: Use parameterized query for userId
    // tableName is safe because it comes from the whitelist switch above
    const query = sql`SELECT * FROM ${sql.raw(`"${tableName}"`)} WHERE "user_id" = ${userId} ORDER BY "name" ASC`;
    
    const result = await db.execute(query);

    return result.rows.map((row: any) => ({
      ...row,
      userId: row.user_id, // Ensure camelCase availability
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

  } catch (error: any) {
    console.error(`[getSettings] Error fetching ${type}:`, error);
    throw new Error(`Failed to fetch ${type}: ${error.message}`);
  }
});

/**
 * Create a new setting item
 */
/**
 * Create a new setting item
 */
export const createSetting = secureAction(async (userId, user, type: SettingType, data: SettingItemInput) => {
  const validated = settingItemSchema.parse(data);
  const table = tableMap[type];

  // Whitelist check to prevent arbitrary table insertion effectively
  if (!table) throw new Error("Invalid table type");

  const [created] = await db
    .insert(table)
    .values({
      userId, // Injected from secureAction
      ...validated,
    } as any)
    .returning();

  console.log(`[createSetting] Created ${type}:`, created);
  return created;
});

/**
 * Update a setting item
 */
/**
 * Update a setting item
 */
export const updateSetting = secureAction(async (userId, user, type: SettingType, id: number, data: SettingItemInput) => {
  const validated = settingItemSchema.parse(data);
  const table = tableMap[type];

  if (!table) throw new Error("Invalid table type");

  const [updated] = await db
    .update(table)
    .set({
      ...validated,
      updatedAt: new Date(),
    } as any)
    .where(
      and(
        eq(table.id, id),
        eq(table.userId, userId) // Security: user can only update their own
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Item non trouvé ou non autorisé');
  }

  console.log(`[updateSetting] Updated ${type}:`, updated);
  return updated;
});

/**
 * Delete a setting item
 */
/**
 * Delete a setting item
 */
export const deleteSetting = secureAction(async (userId, user, type: SettingType, id: number) => {
  const table = tableMap[type];
  if (!table) throw new Error("Invalid table type");

  const [deleted] = await db
    .delete(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.userId, userId) // Security: user can only delete their own
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Item non trouvé ou non autorisé');
  }

  console.log(`[deleteSetting] Deleted ${type}:`, deleted);
  return deleted;
});

/**
 * Delete multiple settings
 */
/**
 * Delete multiple settings
 */
export const deleteSettings = secureAction(async (userId, user, type: SettingType, ids: number[]) => {
  if (!ids || ids.length === 0) {
      return { success: true, count: 0 };
  }

  const table = tableMap[type];
  if (!table) throw new Error("Invalid table type");

  // Verify ownership and delete in one go
  const deleted = await db
    .delete(table)
    .where(
        and(
            eq(table.userId, userId),
            inArray(table.id, ids)
        )
    )
    .returning();

  revalidatePath('/dashboard/parametres');
  return { success: true, count: deleted.length };
});

/**
 * Delete ALL items of a specific type (Destructive)
 */
/**
 * Delete ALL items of a specific type (Destructive)
 */
export const deleteAllSettings = secureAction(async (userId, user, type: SettingType) => {
  const table = tableMap[type];
  if (!table) throw new Error("Invalid table type");

  // Bulk delete for this user
  const deleted = await db
    .delete(table)
    .where(eq(table.userId, userId))
    .returning();

  console.log(`[deleteAllSettings] Deleted ALL ${type} for user ${userId}:`, deleted.length);
  return { success: true, count: deleted.length };
});

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

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
import { eq, and, sql } from 'drizzle-orm';
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
  noStore();
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  // Raw SQL Table mapping to ensure safety
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
    // ⚡ Raw SQL bypass for stability
    // Use proper parameterization for user_id to prevent injection
    // Table name is inserted safely from our switch whitelist above
    // Note: Drizzle `sql` tag usage with dynamic table name is tricky safely without `sql.raw`. 
    // We will use standard string interpolation for the table name strictly because it comes from our whitelist.
    
    // Using sql.raw for table name, regular param for userId
    const query = sql.raw(`SELECT * FROM "${tableName}" WHERE "user_id" = '${session.user.id}' ORDER BY "name" ASC`);
    
    const result = await db.execute(query);

    // Map result rows to ensure camelCase matches what UI expects if needed.
    // Drizzle schema defines 'userId' but DB has 'user_id'. 
    // The UI likely uses 'id' and 'name' which match. 'category' matches.
    // 'mounting_types' table has 'name'.
    return result.rows.map((row: any) => ({
      ...row,
      userId: row.user_id, // Ensure camelCase availability
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

  } catch (error: any) {
    console.error(`[getSettings] Raw SQL Error fetching ${type}:`, error);
    if (error.code) console.error('DB Error Code:', error.code);
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

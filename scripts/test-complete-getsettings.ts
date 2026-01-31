/**
 * Test the exact getSettings function from settings-actions.ts
 * in a simulated Next.js auth context
 */

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
import { eq } from 'drizzle-orm';

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

async function getSettings(type: SettingType, userId: string) {
  const table = tableMap[type];
  
  try {
    console.log(`\n🔍 Fetching ${type} for userId: ${userId}`);
    const items = await db
      .select()
      .from(table)
      .where(eq(table.userId, userId))
      .orderBy(table.name);

    console.log(`✅ Success! Found ${items.length} items`);
    return items;
  } catch (error: any) {
    console.error(`❌ [getSettings] Error fetching ${type}:`, error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error hint:', error.hint);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to fetch ${type}: ${error.message}`);
  }
}

async function testAllSettings() {
  const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
  
  const types: SettingType[] = [
    'brands',
    'categories',
    'materials',
    'colors',
    'treatments',
    'mountingTypes',
    'banks',
    'insurances',
  ];

  for (const type of types) {
    try {
      await getSettings(type, userId);
    } catch (error: any) {
      console.error(`\n💥 FAILED for ${type}:`, error.message);
    }
  }
  
  process.exit(0);
}

testAllSettings();

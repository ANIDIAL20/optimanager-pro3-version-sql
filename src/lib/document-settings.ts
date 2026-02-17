import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { DocumentSettings } from './document-settings-types';
import { DEFAULT_DOCUMENT_SETTINGS } from './document-settings-types';

export * from './document-settings-types';

/**
 * Merge user settings with defaults (prevent undefined keys)
 */
export function mergeWithDefaults(userSettings: any): DocumentSettings {
  if (!userSettings) return DEFAULT_DOCUMENT_SETTINGS;

  // 🔍 Debug log (remove after testing)
  if (!userSettings.default) {
    console.warn('[MERGE_WITH_DEFAULTS] userSettings missing "default" key:', userSettings);
  }

  return {
    version: userSettings.version ?? DEFAULT_DOCUMENT_SETTINGS.version,
    default: {
      ...DEFAULT_DOCUMENT_SETTINGS.default,
      ...(userSettings.default || {}),
    },
    overrides: userSettings.overrides,
  };
}

/**
 * Fetch current shop document settings (global)
 */
export async function getDocumentSettings(shopId: number): Promise<DocumentSettings> {
  const shop = await db.query.shopProfiles.findFirst({
    where: eq(shopProfiles.id, shopId),
    columns: { documentSettings: true },
  });

  return mergeWithDefaults(shop?.documentSettings);
}

/**
 * Update shop document settings (with version bump)
 */
export async function updateDocumentSettings(
  shopId: number,
  updates: Partial<DocumentSettings['default']>
): Promise<DocumentSettings> {
  const current = await getDocumentSettings(shopId);

  const newSettings: DocumentSettings = {
    version: Number(current.version || 0) + 1,
    default: {
      ...current.default,
      ...updates,
    },
    overrides: current.overrides,
  };

  await db
    .update(shopProfiles)
    .set({
      documentSettings: newSettings,
      documentSettingsVersion: newSettings.version,
      documentSettingsUpdatedAt: new Date(),
    })
    .where(eq(shopProfiles.id, shopId));

  return newSettings;
}

/**
 * Cascade Resolution: snapshot -> current -> defaults
 */
export async function resolveDocumentSettings(
  shopId: number,
  snapshot?: any
): Promise<DocumentSettings> {
  if (snapshot) {
    // Ensure snapshot is merged with defaults in case keys are missing (schema evolution)
    return mergeWithDefaults(snapshot);
  }
  return getDocumentSettings(shopId);
}

import { db } from '@/db';
import { devis, sales, shopProfiles } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  DEFAULT_DOCUMENT_SETTINGS,
  CURRENT_DOC_VERSION,
  type DocumentSettings,
  type DocType,
  type DocumentSettingsBase,
} from '@/types/document-settings-types';

export type DocumentSettingsUpdate = {
  default?: Partial<DocumentSettingsBase>;
  overrides?: Partial<Record<DocType, Partial<DocumentSettingsBase>>>;
};

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result: any = { ...(target as any) };
  for (const key in source) {
    const value = (source as any)[key];
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = deepMerge((target as any)[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

function migrateSettings(settings: any): DocumentSettings {
  let s: any = { ...(settings || {}) };

  if (!s.version) s.version = 1;

  if (s.version < 2) {
    s.default = { ...(s.default || {}), theme: 'default', language: 'fr' };
    s.version = 2;
  }

  if (s.version < 3) {
    s.default = {
      ...(s.default || {}),
      showWatermark: false,
      showPageNumber: true,
      showSignature: false,
      watermarkText: 'CONFIDENTIEL',
      fontSize: 'medium',
    };
    s.version = 3;
  }

  if (s.version > CURRENT_DOC_VERSION) {
    s.version = CURRENT_DOC_VERSION;
  }

  return s as DocumentSettings;
}

export function mergeWithDefaults(
  settings: Partial<DocumentSettings> | null | undefined
): DocumentSettings {
  if (!settings) return DEFAULT_DOCUMENT_SETTINGS;
  const migrated = migrateSettings(settings);
  return deepMerge(DEFAULT_DOCUMENT_SETTINGS, migrated);
}

export function resolveSettingsForDocType(
  settings: DocumentSettings,
  docType: DocType
): DocumentSettingsBase {
  const base = settings.default;
  const override = settings.overrides?.[docType] ?? {};
  return { ...base, ...override };
}

export async function resolveDocumentSettings(
  shopId: number,
  snapshot?: any | null
): Promise<DocumentSettings> {
  // ✅ UPDATED
  // If snapshot is null/undefined -> always load latest from DB
  if (snapshot === null || snapshot === undefined) {
    return getDocumentSettings(shopId);
  }

  // Snapshot exists -> use it, but be robust against corrupted shapes
  try {
    return mergeWithDefaults(snapshot);
  } catch {
    console.warn('[resolveDocumentSettings] Snapshot invalide, fallback vers DB');
    return getDocumentSettings(shopId);
  }
}

export async function getDocumentSettings(shopId: number): Promise<DocumentSettings> {
  const shop = await db.query.shopProfiles.findFirst({
    where: eq(shopProfiles.id, shopId),
    columns: { documentSettings: true },
  });

  return mergeWithDefaults(shop?.documentSettings as any);
}

export async function updateDocumentSettings(
  shopId: number,
  updates: DocumentSettingsUpdate
): Promise<DocumentSettings> {
  const current = await getDocumentSettings(shopId);

  const profile = await db.query.shopProfiles.findFirst({
    where: eq(shopProfiles.id, shopId),
    columns: { userId: true },
  });

  if (!profile) {
    throw new Error('Shop not found');
  }

  const updated: DocumentSettings = {
    ...current,
    version: (current.version || 0) + 1,
    default: deepMerge(current.default, updates.default || {}),
    overrides: deepMerge(current.overrides || {}, updates.overrides || {}),
  };

  // ✅ UPDATED
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.transaction(async (tx: any) => {
    // 1) Update shop profile settings
    await tx
      .update(shopProfiles)
      .set({
        documentSettings: updated as any,
        documentSettingsVersion: updated.version,
        documentSettingsUpdatedAt: new Date(),
      })
      .where(eq(shopProfiles.id, shopId));

    // 2) Propagate snapshot only for non-final documents
    //    - Sales: status='brouillon'
    //    - Devis: status='EN_ATTENTE'
    await tx
      .update(sales)
      .set({ documentSettingsSnapshot: updated as any })
      .where(and(eq(sales.userId, profile.userId), eq(sales.status, 'brouillon')));

    await tx
      .update(devis)
      .set({ documentSettingsSnapshot: updated as any })
      .where(and(eq(devis.userId, profile.userId), eq(devis.status, 'EN_ATTENTE')));
  });

  return updated;
}

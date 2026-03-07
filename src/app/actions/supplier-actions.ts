'use server';

import { db } from '@/db';
import { suppliers, supplierBalanceView } from '@/db/schema';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { secureAction, secureActionWithResponse } from '@/lib/secure-action';
import { revalidatePath, revalidateTag } from 'next/cache';
import { measurePerformance } from '@/lib/performance';
import { getClientUsageStats } from './adminActions';
import { CACHE_TAGS } from '@/lib/cache-tags';

/**
 * Get all suppliers for the current user
 */
export const getSuppliersList = secureActionWithResponse(async (userId, user) => {
  return await measurePerformance(`getSuppliersList-${userId}`, async () => {
    console.log('⚡ [v3] Fetching suppliers list for user:', userId);

    try {
      // ✅ Étape 2 — JOIN avec la view pour obtenir le solde réel calculé
      const results = await db
        .select()
        .from(suppliers)
        .leftJoin(
          supplierBalanceView,
          and(
            eq(supplierBalanceView.supplierId, suppliers.id),
            eq(supplierBalanceView.userId, suppliers.userId)
          )
        )
        .where(eq(suppliers.userId, userId))
        .orderBy(desc(suppliers.createdAt));
      
      const mappedItems = results.map(({ suppliers: row, supplier_balance_view: view }) => ({
        id: row.id,
        userId: row.userId,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        address: row.address || '',
        city: row.city || '',
        ice: row.ice || '',
        if: row.if || '',
        rc: row.rc || '',
        taxId: row.taxId || '',
        category: row.category || '',
        paymentTerms: row.paymentTerms || '30',
        paymentMethod: row.paymentMethod || '',
        bank: row.bank || '',
        rib: row.rib || '',
        notes: (row.notes || '').replace(/\[CONTACT_DATA_JSON:[\s\S]*?\]/, '').trim(),
        status: row.status || 'Actif',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        
        // ✅ Étape 1 — Reading from dedicated columns
        contactName:  row.contactName  || '',
        contactPhone: row.contactPhone || '',

        // Legacy UI compatibility aliases
        nomCommercial: row.name || '',
        telephone: row.phone || '',
        typeProduits: (row.category || '').split(', ').filter(Boolean),
        adresse: row.address || '',
        ville: row.city || '',
        contactNom:       row.contactName  || '',
        contactTelephone: row.contactPhone || '',
        contactEmail:     row.contactEmail || '',
        defaultTaxMode: row.defaultTaxMode || 'HT',
        // ✅ Étape 2 — solde_reel from view (fallback removed)
        currentBalance: Number(view?.soldeReel ?? 0),
        totalAchats:   Number(view?.totalAchats ?? 0),
        totalPaiements: Number(view?.totalPaiements ?? 0),
      }));

      return mappedItems;
    } catch (error: any) {
      console.error('[getSuppliersList] CRITICAL ERROR:', error);
      throw new Error(`Erreur récupération fournisseurs: ${error.message}`);
    }
  }, { userId });
});

// ✅ Étape 4 — Paginated + filtered supplier list (server-side)
export interface GetSuppliersParams {
  search?:   string;
  category?: string;
  page?:     number;  // 1-indexed, default 1
  limit?:    number;  // default 20
}


import { querySuppliersListPaginated } from '@/lib/db-queries/suppliers';

export const getSuppliersListPaginated = secureAction(async (userId, user, params: GetSuppliersParams = {}) => {
  try {
    return await querySuppliersListPaginated(userId, params);
  } catch (error: any) {
    console.error('[getSuppliersListPaginated] ERROR:', error);
    throw new Error(`Erreur récupération fournisseurs: ${error.message}`);
  }
});

/**
 * Get a single supplier by ID
 */
export const getSupplier = secureAction(async (userId, user, id: string) => {
  try {
    console.log(`🔍 [getSupplier] Fetching supplier ${id}`);
    
    // ✅ Étape 2 — JOIN avec la view pour le solde réel
    const results = await db
      .select()
      .from(suppliers)
      .leftJoin(
        supplierBalanceView,
        and(
          eq(supplierBalanceView.supplierId, suppliers.id),
          eq(supplierBalanceView.userId, suppliers.userId)
        )
      )
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .limit(1);

    if (!results.length) {
      console.warn(`⚠️ [getSupplier] No supplier found with ID ${id}`);
      return null;
    }

    const { suppliers: row, supplier_balance_view: view } = results[0];

    return {
        id: row.id,
        userId: row.userId,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        address: row.address || '',
        city: row.city || '',
        ice: row.ice || '',
        if: row.if || '',
        rc: row.rc || '',
        taxId: row.taxId || '',
        category: row.category || '',
        paymentTerms: row.paymentTerms || '30',
        paymentMethod: row.paymentMethod || '',
        bank: row.bank || '',
        rib: row.rib || '',
        notes: (row.notes || '').replace(/\[CONTACT_DATA_JSON:[\s\S]*?\]/, '').trim(),
        status: row.status || 'Actif',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        contactName:  row.contactName  || '',
        contactPhone: row.contactPhone || '',
        contactEmail: row.contactEmail || '',
        nomCommercial: row.name || '',
        telephone: row.phone || '',
        typeProduits: (row.category || '').split(', ').filter(Boolean),
        adresse: row.address || '',
        ville: row.city || '',
        contactNom:       row.contactName  || '',
        contactTelephone: row.contactPhone || '',
        defaultTaxMode: row.defaultTaxMode || 'HT',
        // ✅ Étape 2 — solde_reel from view
        currentBalance: Number(view?.soldeReel ?? 0),
        totalAchats:    Number(view?.totalAchats ?? 0),
        totalPaiements: Number(view?.totalPaiements ?? 0),
    };

  } catch (error: any) {
    console.error('💥 [getSupplier] CRITICAL ERROR:', error);
    return null;
  }
});

/**
 * Create a new supplier
 */
export const createSupplier = secureAction(async (userId, user, data: any) => {
  console.log('📝 Creating supplier with data:', JSON.stringify(data, null, 2));

  // 🛡️ CHECK QUOTAS
  const usage = await getClientUsageStats(userId);
  if (usage.suppliers.count >= usage.suppliers.limit) {
       throw new Error(`Vous avez atteint la limite de fournisseurs pour votre plan (${usage.suppliers.limit}). Veuillez mettre à niveau.`);
  }

  const notesPayload = data.notes || null;

  try {
    const [created] = await db
      .insert(suppliers)
      .values({
        userId, 
        name: data.nomCommercial, 
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        ice: data.ice || null,
        if: data.if || null,
        rc: data.rc || null,
        taxId: data.taxId || null,
        category: data.typeProduits ? data.typeProduits.join(', ') : null,
        paymentTerms: data.paymentTerms || null,
        paymentMethod: data.paymentMethod || null,
        bank: data.bank || null,
        rib: data.rib || null,
        notes: notesPayload,
        status: data.status || 'Actif',
        defaultTaxMode: data.defaultTaxMode || 'HT',
        // ✅ Étape 1 — Writing directly to dedicated columns
        contactName:  data.contactNom       || null,
        contactPhone: data.contactTelephone || null,
        contactEmail: data.contactEmail     || null,
      } as any)
      .returning();

    // Invalide uniquement le cache du bon utilisateur (performant) + invalide le tag global en sécurité.
    // @ts-ignore
    revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
    // @ts-ignore
    revalidateTag(CACHE_TAGS.suppliers);
    revalidatePath('/suppliers');
    return created;
  } catch (error: any) {
    console.error('❌ Error creating supplier:', error);
    throw new Error(`Erreur lors de la création: ${error.message}`);
  }
});

/**
 * Update a supplier
 */
export const updateSupplier = secureAction(async (userId, user, id: string, data: any) => {
  console.log('📝 [updateSupplier] Processing update for:', id);

  const dbPayload: any = {};

  if (data.nomCommercial !== undefined) dbPayload.name = data.nomCommercial;
  if (data.email !== undefined) dbPayload.email = data.email;
  if (data.phone !== undefined) dbPayload.phone = data.phone; 
  if (data.address !== undefined) dbPayload.address = data.address;
  if (data.city !== undefined) dbPayload.city = data.city;
  if (data.ice !== undefined) dbPayload.ice = data.ice;
  if (data.if !== undefined) dbPayload.if = data.if;
  if (data.rc !== undefined) dbPayload.rc = data.rc;
  if (data.taxId !== undefined) dbPayload.taxId = data.taxId;
  if (data.rib !== undefined) dbPayload.rib = data.rib;
  if (data.bank !== undefined) dbPayload.bank = data.bank;
  if (data.paymentTerms !== undefined) dbPayload.paymentTerms = data.paymentTerms;
  if (data.paymentMethod !== undefined) dbPayload.paymentMethod = data.paymentMethod;
  if (data.status !== undefined) dbPayload.status = data.status;
  if (data.defaultTaxMode !== undefined) dbPayload.defaultTaxMode = data.defaultTaxMode;

  if(data.typeProduits && Array.isArray(data.typeProduits)) {
    dbPayload.category = data.typeProduits.join(', ');
  }

  if (data.contactNom !== undefined || data.contactTelephone !== undefined || data.contactEmail !== undefined) {
    // ✅ Étape 1 — Write directly to dedicated columns
    if (data.contactNom       !== undefined) dbPayload.contactName  = data.contactNom       || null;
    if (data.contactTelephone !== undefined) dbPayload.contactPhone = data.contactTelephone || null;
    if (data.contactEmail     !== undefined) dbPayload.contactEmail = data.contactEmail     || null;
  }
  if (data.notes !== undefined) {
      dbPayload.notes = data.notes;
  }

  dbPayload.updatedAt = new Date();
  
  try {
    const [updated] = await db.update(suppliers)
      .set(dbPayload)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .returning();

    // Invalide uniquement le cache du bon utilisateur + global
    // @ts-ignore
    revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
    // @ts-ignore
    revalidateTag(CACHE_TAGS.suppliers);
    revalidatePath('/dashboard/fournisseurs');
    return updated;
  } catch (err: any) {
     console.error("❌ DB Update Error:", err);
     throw new Error("Erreur mise à jour fournisseur: " + err.message);
  }
});

/**
 * Delete a supplier
 */
export const deleteSupplier = secureAction(async (userId, user, id: string) => {
  await db
    .delete(suppliers)
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.userId, userId)
      )
    );

  // Invalide uniquement le cache du bon utilisateur + global
  // @ts-ignore
  revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
  // @ts-ignore
  revalidateTag(CACHE_TAGS.suppliers);
  revalidatePath('/dashboard/fournisseurs');
  return { success: true };
});

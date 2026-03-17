'use server';

import { db } from '@/db';
import { suppliers, supplierOrders, supplierPayments, supplierCredits, goodsReceipts, lensOrders } from '@/db/schema';
import { eq, and, desc, sql, like, count } from 'drizzle-orm';
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
    console.log('âš¡ [v3] Fetching suppliers list for user:', userId);

    try {
      // âœ… Ã‰tape 2 â€” JOIN avec la view pour obtenir le solde rÃ©el calculÃ©
      const results = await db
        .select({
          supplier: suppliers,
          totalAchats: sql<string>`COALESCE((SELECT SUM(${supplierOrders.montantTotal}) FROM ${supplierOrders} WHERE ${supplierOrders.supplierId} = ${suppliers.id}), '0')`,
          totalPaiements: sql<string>`COALESCE((SELECT SUM(${supplierPayments.amount}) FROM ${supplierPayments} WHERE ${supplierPayments.supplierId} = ${suppliers.id}), '0')`,
        })
        .from(suppliers)
        .where(eq(suppliers.userId, userId))
        .orderBy(desc(suppliers.createdAt));
      
      const mappedItems = results.map(({ supplier: row, totalAchats, totalPaiements }) => ({
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
        notes: row.notes || '',
        status: row.status || 'Actif',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        
        // âœ… Ã‰tape 1 â€” Reading from dedicated columns
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
        // ✅ currentBalance is now a direct column — updated in every transaction
        currentBalance: Number(row.currentBalance ?? 0),
        totalAchats:   Number(totalAchats || 0),
        totalPaiements: Number(totalPaiements || 0),
      }));

      return mappedItems;
    } catch (error: any) {
      console.error('[getSuppliersList] CRITICAL ERROR:', error);
      throw new Error(`Erreur rÃ©cupÃ©ration fournisseurs: ${error.message}`);
    }
  }, { userId });
});

// âœ… Ã‰tape 4 â€” Paginated + filtered supplier list (server-side)
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
    throw new Error(`Erreur rÃ©cupÃ©ration fournisseurs: ${error.message}`);
  }
});

/**
 * Get a single supplier by ID
 */
export const getSupplier = secureAction(async (userId, user, id: string) => {
  try {
    console.log(`ðŸ” [getSupplier] Fetching supplier ${id}`);
    
    // âœ… Ã‰tape 2 â€” JOIN avec la view pour le solde rÃ©el
    const results = await db
      .select({
        supplier: suppliers,
        totalAchats: sql<string>`COALESCE((SELECT SUM(${supplierOrders.montantTotal}) FROM ${supplierOrders} WHERE ${supplierOrders.supplierId} = ${suppliers.id}), '0')`,
        totalPaiements: sql<string>`COALESCE((SELECT SUM(${supplierPayments.amount}) FROM ${supplierPayments} WHERE ${supplierPayments.supplierId} = ${suppliers.id}), '0')`,
      })
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .limit(1);

    if (!results.length) {
      console.warn(`âš ï¸ [getSupplier] No supplier found with ID ${id}`);
      return null;
    }

    const { supplier: row, totalAchats, totalPaiements } = results[0];

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
        notes: row.notes || '',
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
        // ✅ currentBalance is now a direct column
        currentBalance: Number(row.currentBalance ?? 0),
        totalAchats:    Number(totalAchats || 0),
        totalPaiements: Number(totalPaiements || 0),
    };

  } catch (error: any) {
    console.error('ðŸ’¥ [getSupplier] CRITICAL ERROR:', error);
    return null;
  }
});

/**
 * Create a new supplier
 */
export const createSupplier = secureAction(async (userId, user, data: any) => {
  console.log('ðŸ“ Creating supplier with data:', JSON.stringify(data, null, 2));

  // ðŸ›¡ï¸ CHECK QUOTAS
  const usage = await getClientUsageStats(userId);
  if (usage.suppliers.count >= usage.suppliers.limit) {
       throw new Error(`Vous avez atteint la limite de fournisseurs pour votre plan (${usage.suppliers.limit}). Veuillez mettre Ã  niveau.`);
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
        // âœ… Ã‰tape 1 â€” Writing directly to dedicated columns
        contactName:  data.contactNom       || null,
        contactPhone: data.contactTelephone || null,
        contactEmail: data.contactEmail     || null,
      } as any)
      .returning();

    // Invalide uniquement le cache du bon utilisateur (performant) + invalide le tag global en sÃ©curitÃ©.
    // @ts-ignore
    revalidateTag(`${CACHE_TAGS.suppliers}-${userId}`);
    // @ts-ignore
    revalidateTag(CACHE_TAGS.suppliers);
    revalidatePath('/suppliers');
    return created;
  } catch (error: any) {
    console.error('âŒ Error creating supplier:', error);
    throw new Error(`Erreur lors de la crÃ©ation: ${error.message}`);
  }
});

/**
 * Update a supplier
 */
export const updateSupplier = secureAction(async (userId, user, id: string, data: any) => {
  console.log('ðŸ“ [updateSupplier] Processing update for:', id);

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
    // âœ… Ã‰tape 1 â€” Write directly to dedicated columns
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
    revalidatePath('/suppliers', 'layout');
    revalidatePath('/suppliers/[id]', 'page');
    return updated;
  } catch (err: any) {
     console.error("âŒ DB Update Error:", err);
     throw new Error("Erreur mise Ã  jour fournisseur: " + err.message);
  }
});

/**
 * Delete a supplier
 */
export const deleteSupplier = secureAction(async (userId, user, id: string) => {
  try {
    // Pre-check for linked data to provide a clear functional error instead of a raw DB error
    const [ordersCountRow, paymentsCountRow, creditsCountRow, receiptsCountRow, lensOrdersCountRow] = await Promise.all([
      db.select({ c: count() })
        .from(supplierOrders)
        .where(and(eq(supplierOrders.supplierId, id), eq(supplierOrders.userId, userId)))
        .then((rows) => rows[0] ?? { c: 0 }),
      db.select({ c: count() })
        .from(supplierPayments)
        .where(and(eq(supplierPayments.supplierId, id), eq(supplierPayments.userId, userId)))
        .then((rows) => rows[0] ?? { c: 0 }),
      db.select({ c: count() })
        .from(supplierCredits)
        .where(and(eq(supplierCredits.supplierId, id), eq(supplierCredits.userId, userId)))
        .then((rows) => rows[0] ?? { c: 0 }),
      db.select({ c: count() })
        .from(goodsReceipts)
        .where(and(eq(goodsReceipts.supplierId, id), eq(goodsReceipts.userId, userId)))
        .then((rows) => rows[0] ?? { c: 0 }),
      db.select({ c: count() })
        .from(lensOrders)
        .where(and(eq(lensOrders.supplierId, id), eq(lensOrders.userId, userId)))
        .then((rows) => rows[0] ?? { c: 0 }),
    ]);

    const hasLinkedData =
      Number(ordersCountRow.c) > 0 ||
      Number(paymentsCountRow.c) > 0 ||
      Number(creditsCountRow.c) > 0 ||
      Number(receiptsCountRow.c) > 0 ||
      Number(lensOrdersCountRow.c) > 0;

    if (hasLinkedData) {
      return {
        success: false,
        error:
          "Impossible de supprimer ce fournisseur car il possède des commandes, paiements, avoirs ou réceptions associées. Veuillez d'abord supprimer ou archiver son historique.",
      };
    }

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
    revalidatePath('/suppliers', 'layout');
    revalidatePath('/suppliers/[id]', 'page');
    
    return { success: true };
  } catch (error: any) {
    const isConstraintError = 
        error.code === '23503' || 
        (error.message && error.message.includes('foreign key constraint')) ||
        (error.message && error.message.includes('violates foreign key'));
        
    if (isConstraintError) {
      return { 
        success: false, 
        error: "Impossible de supprimer ce fournisseur car il possède des commandes, paiements ou avoirs associés. Veuillez d'abord supprimer son historique." 
      };
    }
    console.error("Error deleting supplier:", error);
    return { success: false, error: "Erreur lors de la suppression." };
  }
});


'use server';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction, secureActionWithResponse } from '@/lib/secure-action';
import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import { measurePerformance } from '@/lib/performance';
import { getClientUsageStats } from './adminActions';


// Helper to serialize contact info into notes
function serializeContactInfo(data: any) {
  const contact = {
    nom: data.contactNom,
    tel: data.contactTelephone,
    email: data.contactEmail
  };
  // If no contact info, return original notes
  if (!contact.nom && !contact.tel && !contact.email) return data.notes || '';
  
  const contactJson = JSON.stringify(contact);
  const cleanNotes = (data.notes || '').replace(/\[CONTACT_DATA_JSON:.*?\]/, '').trim();
  return `${cleanNotes}\n[CONTACT_DATA_JSON:${contactJson}]`;
}

// Helper to deserialize
function parseContactInfo(notes: string | null) {
  if (!notes) return { nom: '', tel: '', email: '', cleanNotes: '' };
  
  const match = notes.match(/\[CONTACT_DATA_JSON:(.*?)\]/);
  if (match && match[1]) {
    try {
      const contact = JSON.parse(match[1]);
      const cleanNotes = notes.replace(match[0], '').trim();
      return { ...contact, cleanNotes };
    } catch (e) { 
      return { nom: '', tel: '', email: '', cleanNotes: notes }; 
    }
  }
  return { nom: '', tel: '', email: '', cleanNotes: notes }; // No contact data found
}

/**
 * Get all suppliers for the current user
 */
/**
 * Get all suppliers for the current user
 */
export const getSuppliersList = secureActionWithResponse(async (userId, user) => {
  return await measurePerformance(`getSuppliersList-${userId}`, async () => {
    noStore();
    
    console.log('⚡ [v2] Fetching suppliers list for user:', userId);

    try {
      const results = await db.select()
        .from(suppliers)
        .where(eq(suppliers.userId, userId))
        .orderBy(desc(suppliers.createdAt));
      
      const mappedItems = results.map((row: any) => {
        const contactInfo = parseContactInfo(row.notes);
        return {
          id: row.id,
          userId: row.userId,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          city: row.city,
          ice: row.ice,
          if: row.if,
          rc: row.rc,
          taxId: row.taxId,
          category: row.category,
          paymentTerms: row.paymentTerms,
          paymentMethod: row.paymentMethod,
          bank: row.bank,
          rib: row.rib,
          notes: contactInfo.cleanNotes,
          status: row.status,
          createdAt: row.createdAt ? (typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString()) : null,
          updatedAt: row.updatedAt ? (typeof row.updatedAt === 'string' ? row.updatedAt : row.updatedAt.toISOString()) : null,
          nomCommercial: row.name,
          telephone: row.phone,
          typeProduits: row.category ? row.category.split(', ') : [],
          adresse: row.address,
          ville: row.city,
          delaiPaiement: row.paymentTerms,
          modePaiement: row.paymentMethod,
          banque: row.bank,
          contactNom: contactInfo.nom,
          contactTelephone: contactInfo.tel,
          contactEmail: contactInfo.email,
          defaultTaxMode: row.defaultTaxMode,
          currentBalance: Number(row.currentBalance || 0),
        };
      });

      return mappedItems;
    } catch (error: any) {
      console.error('[getSuppliersList] CRITICAL ERROR:', error);
      throw new Error(`Erreur récupération fournisseurs: ${error.message}`);
    }
  }, { userId });
});

/**
 * Get a single supplier by ID
 */
export const getSupplier = secureAction(async (userId, user, id: string) => {
  noStore();

  try {
    const [row] = await db.select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .limit(1);

    if (!row) return null;

    // Map single item
    const contactInfo = parseContactInfo(row.notes);
    return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        city: row.city,
        ice: row.ice,
        if: row.if,
        rc: row.rc,
        taxId: row.taxId,
        category: row.category,
        paymentTerms: row.paymentTerms,
        paymentMethod: row.paymentMethod,
        bank: row.bank,
        rib: row.rib,
        notes: contactInfo.cleanNotes,
        status: row.status,
        createdAt: row.createdAt ? (typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString()) : null,
        updatedAt: row.updatedAt ? (typeof row.updatedAt === 'string' ? row.updatedAt : row.updatedAt.toISOString()) : null,
        
        // UI Keys
        nomCommercial: row.name,
        telephone: row.phone,
        typeProduits: row.category ? row.category.split(', ') : [],
        adresse: row.address,
        ville: row.city,
        delaiPaiement: row.paymentTerms,
        modePaiement: row.paymentMethod,
        banque: row.bank,
        contactNom: contactInfo.nom,
        contactTelephone: contactInfo.tel,
        contactEmail: contactInfo.email,
        defaultTaxMode: row.defaultTaxMode,
    };
  } catch (error: any) {
    console.error('💥 Error fetching supplier:', error);
    throw new Error(`Erreur lors de la récupération du fournisseur: ${error.message}`);
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

  // Serialize contact info into notes
  const notesWithContact = serializeContactInfo(data);

  try {
    const [created] = await db
      .insert(suppliers)
      .values({
        userId, // from secureAction
        name: data.nomCommercial, // Key from payload
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        ice: data.ice || null,
        if: data.if || null, // 'if' is a reserved word but key is 'if' in schema
        rc: data.rc || null,
        taxId: data.taxId || null,
        category: data.typeProduits ? data.typeProduits.join(', ') : null,
        paymentTerms: data.paymentTerms || null,
        paymentMethod: data.paymentMethod || null,
        bank: data.bank || null,
        rib: data.rib || null,
        notes: notesWithContact, // Save with contact info hidden
        status: data.status || 'Actif',
        defaultTaxMode: data.defaultTaxMode || 'HT',
      } as any)
      .returning();

    revalidateTag('suppliers');
    revalidatePath('/suppliers');
    return created;
  } catch (error: any) {
    console.error('❌ Error creating supplier:', error);
    console.error('Details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    throw new Error(`Erreur lors de la création: ${error.message}`);
  }
});

/**
 * Update a supplier
 */
export const updateSupplier = secureAction(async (userId, user, id: string, data: any) => {
  console.log('📝 [updateSupplier] Processing update for:', id);

  // 1. Build Payload explicitly to exclude non-schema fields
  const dbPayload: any = {};

  // Map Standard Fields
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

  // 2. Handle Contact Info -> Notes
  if (data.contactNom !== undefined || data.contactTelephone !== undefined || data.contactEmail !== undefined) {
      dbPayload.notes = serializeContactInfo(data);
  } else if (data.notes !== undefined) {
      dbPayload.notes = data.notes;
  }

  dbPayload.updatedAt = new Date();
  
  try {
    const [updated] = await db.update(suppliers)
      .set(dbPayload)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .returning();

    revalidateTag('suppliers');
    revalidatePath('/suppliers'); 
    revalidatePath('/dashboard/fournisseurs');
    revalidatePath(`/dashboard/fournisseurs/${id}`);
    
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

  revalidateTag('suppliers');
  revalidatePath('/dashboard/fournisseurs');
  return { success: true };
});

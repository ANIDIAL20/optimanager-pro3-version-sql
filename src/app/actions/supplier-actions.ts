
'use server';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';


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
export async function getSuppliersList() {
  noStore();
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }
  
  console.log('⚡ [v2] Fetching suppliers list for user:', session.user.id);


  try {
    // Fallback to raw SQL since query builder is failing
    const query = sql`
      SELECT * FROM "suppliers"
      WHERE "user_id"::text = ${session.user.id}
      ORDER BY "created_at" DESC
    `;
    
    const result = await db.execute(query);
    
    const mappedItems = result.rows.map((row: any) => {
      const contactInfo = parseContactInfo(row.notes);
      return {
      id: row.id,
      userId: row.user_id,
      
      // English keys (Legacy/DB)
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      ice: row.ice,
      if: row.if,
      rc: row.rc,
      taxId: row.tax_id,
      category: row.category,
      paymentTerms: row.payment_terms,
      paymentMethod: row.payment_method,
      bank: row.bank,
      rib: row.rib,
      notes: contactInfo.cleanNotes, // Return clean notes
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,

      // UI Keys (French, matching types.ts & columns.tsx)
      nomCommercial: row.name,
      telephone: row.phone,
      typeProduits: row.category ? row.category.split(', ') : [],
      adresse: row.address,
      ville: row.city,
      delaiPaiement: row.payment_terms,
      modePaiement: row.payment_method,
      banque: row.bank,
      
      // Add parsed contact info
      contactNom: contactInfo.nom,
      contactTelephone: contactInfo.tel,
      contactEmail: contactInfo.email,
      };
    });

    return mappedItems;
  } catch (error: any) {
    console.error('[getSuppliersList] CRITICAL SQL ERROR:', error);
    throw new Error(`Erreur récupération fournisseurs (SQL): ${error.message}`);
  }
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(id: string) {
  noStore();
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  try {
    // Reuse the working getSuppliersList query to ensure consistency and prevent "Failed query" errors
    // This is safer than running a separate ad-hoc query that might differ in subtle ways
    const allSuppliers = await getSuppliersList();
    
    // Find specific supplier in memory
    const supplier = allSuppliers.find((s: any) => String(s.id) === String(id));

    if (!supplier) return null;

    return supplier;
  } catch (error: any) {
    console.error('❌ Error fetching supplier:', error);
    throw new Error(`Erreur lors de la récupération du fournisseur: ${error.message}`);
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: any) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  console.log('📝 Creating supplier with data:', JSON.stringify(data, null, 2));

  // Serialize contact info into notes
  const notesWithContact = serializeContactInfo(data);

  try {
    const [created] = await db
      .insert(suppliers)
      .values({
        userId: session.user.id,
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
      } as any)
      .returning();

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
}

/**
 * Update a supplier
 */
export async function updateSupplier(id: string, data: any) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

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

  if(data.typeProduits && Array.isArray(data.typeProduits)) {
    dbPayload.category = data.typeProduits.join(', ');
  }

  // 2. Handle Contact Info -> Notes
  if (data.contactNom !== undefined || data.contactTelephone !== undefined || data.contactEmail !== undefined) {
      dbPayload.notes = serializeContactInfo(data);
  } else if (data.notes !== undefined) {
      dbPayload.notes = data.notes;
  }

  console.log('💾 [updateSupplier] Final DB Payload keys:', Object.keys(dbPayload));

  // 3. Construct Raw SQL Update
  // We use sql.join to build the SET clause dynamically to bypass Drizzle ID casting issues
  const explicitSetClauses = [];
  
  if (dbPayload.name !== undefined) explicitSetClauses.push(sql`"name" = ${dbPayload.name}`);
  if (dbPayload.email !== undefined) explicitSetClauses.push(sql`"email" = ${dbPayload.email}`);
  if (dbPayload.phone !== undefined) explicitSetClauses.push(sql`"phone" = ${dbPayload.phone}`);
  if (dbPayload.address !== undefined) explicitSetClauses.push(sql`"address" = ${dbPayload.address}`);
  if (dbPayload.city !== undefined) explicitSetClauses.push(sql`"city" = ${dbPayload.city}`);
  if (dbPayload.ice !== undefined) explicitSetClauses.push(sql`"ice" = ${dbPayload.ice}`);
  if (dbPayload.if !== undefined) explicitSetClauses.push(sql`"if" = ${dbPayload.if}`);
  if (dbPayload.rc !== undefined) explicitSetClauses.push(sql`"rc" = ${dbPayload.rc}`);
  if (dbPayload.taxId !== undefined) explicitSetClauses.push(sql`"tax_id" = ${dbPayload.taxId}`);
  if (dbPayload.rib !== undefined) explicitSetClauses.push(sql`"rib" = ${dbPayload.rib}`);
  if (dbPayload.bank !== undefined) explicitSetClauses.push(sql`"bank" = ${dbPayload.bank}`);
  if (dbPayload.paymentTerms !== undefined) explicitSetClauses.push(sql`"payment_terms" = ${dbPayload.paymentTerms}`);
  if (dbPayload.paymentMethod !== undefined) explicitSetClauses.push(sql`"payment_method" = ${dbPayload.paymentMethod}`);
  if (dbPayload.status !== undefined) explicitSetClauses.push(sql`"status" = ${dbPayload.status}`);
  if (dbPayload.category !== undefined) explicitSetClauses.push(sql`"category" = ${dbPayload.category}`);
  if (dbPayload.notes !== undefined) explicitSetClauses.push(sql`"notes" = ${dbPayload.notes}`);

  explicitSetClauses.push(sql`"updated_at" = ${new Date()}`);

  const query = sql`
    UPDATE "suppliers"
    SET ${sql.join(explicitSetClauses, sql`, `)}
    WHERE "id"::text = ${id} AND "user_id" = ${session.user.id}
    RETURNING *
  `;

  try {
    const { rows } = await db.execute(query);
    const updated = rows[0];

    revalidatePath('/suppliers'); 
    revalidatePath('/dashboard/fournisseurs');
    revalidatePath(`/dashboard/fournisseurs/${id}`);
    
    return updated;
  } catch (err: any) {
     console.error("❌ SQL Update Error:", err);
     throw new Error("Erreur mise à jour fournisseur: " + err.message);
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(id: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  await db
    .delete(suppliers)
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.userId, session.user.id)
      )
    );

  revalidatePath('/dashboard/fournisseurs');
  return { success: true };
}

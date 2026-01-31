
'use server';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';


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

  try {
    // Fallback to raw SQL since query builder is failing
    const query = sql`
      SELECT * FROM "suppliers"
      WHERE "user_id" = ${session.user.id}
      ORDER BY "created_at" DESC
    `;
    
    const result = await db.execute(query);
    
    // Map usage of snake_case DB columns to camelCase if needed by UI?
    // The UI likely expects properties matching the interface.
    // Let's check what the schema definition returns vs what we need.
    // The previous code returned the dizzzle schema object, which maps DB snake_case to JS camelCase keys via the 2nd arg in pgTable?
    // No, Drizzle pgTable keys are the JS keys.
    // Does 'suppliers.paymentTerms' map to 'payment_terms'?
    // Yes.
    // So raw SQL returns 'payment_terms'. We need to map it manually to 'paymentTerms' if the UI uses that.
    // Let's verify usage in the UI components (columns.tsx).
    
    // For now, let's return it as-is, BUT map strictly necessary fields if UI breaks.
    // Actually, Drizzle schema defines:
    // paymentTerms: text('payment_terms')
    // So `suppliers.paymentTerms` key is `paymentTerms`.
    // Raw SQL returns `payment_terms`.
    // I MUST map it.
    
    const mappedItems = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
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
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return mappedItems;
  } catch (error: any) {
    console.error('[getSuppliersList] CRITICAL SQL ERROR:', error);
    throw new Error(`Erreur récupération fournisseurs (SQL): ${error.message}`);
  }
  } catch (error: any) {
    console.error('[getSuppliers] CRITICAL ERROR:', error);
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    throw new Error(`Erreur récupération fournisseurs: ${error.message}`);
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

  const item = await db.query.suppliers.findFirst({
    where: and(eq(suppliers.id, id), eq(suppliers.userId, session.user.id))
  });

  return item;
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: any) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  // Remove undefined fields
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );

  const [created] = await db
    .insert(suppliers)
    .values({
      userId: session.user.id,
      name: data.nomCommercial, // Map form field to schema
      category: data.typeProduits ? data.typeProduits.join(', ') : '', // Flatten array
      ...cleanData,
    } as any)
    .returning();

  revalidatePath('/dashboard/fournisseurs');
  return created;
}

/**
 * Update a supplier
 */
export async function updateSupplier(id: string, data: any) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  // Remove undefined fields
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  
  // Handling mapping if necessary
  if(data.nomCommercial) cleanData.name = data.nomCommercial;
  if(data.typeProduits && Array.isArray(data.typeProduits)) {
    cleanData.category = data.typeProduits.join(', ');
  }

  const [updated] = await db
    .update(suppliers)
    .set({
        ...cleanData,
        updatedAt: new Date(),
    } as any)
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.userId, session.user.id)
      )
    )
    .returning();

  revalidatePath('/dashboard/fournisseurs');
  revalidatePath(`/dashboard/fournisseurs/${id}`);
  return updated;
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

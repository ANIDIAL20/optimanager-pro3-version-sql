/**
 * Contact Lens Prescriptions Actions - Neon/Drizzle Version
 * Secure management of contact lens prescriptions
 */

'use server';

import { db } from '@/db';
import { contactLensPrescriptions, clients } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface ContactLensPrescriptionData {
  rightEye?: {
    baseCurve?: string;
    diameter?: string;
    power?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
  };
  leftEye?: {
    baseCurve?: string;
    diameter?: string;
    power?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
  };
  brand?: string;
  lensType?: string;
  doctorName?: string;
  duration?: string;
  expirationDate?: string;
}

export interface ContactLensPrescriptionInput {
  clientId: string;
  date: Date;
  data: ContactLensPrescriptionData;
  notes?: string;
}

export interface ContactLensPrescription {
  id: string;
  clientId: string;
  clientName?: string;
  date: string;
  data: ContactLensPrescriptionData;
  notes?: string;
  createdAt: string;
}

// ========================================
// CONTACT LENS PRESCRIPTION ACTIONS
// ========================================

/**
 * Get all contact lens prescriptions (optionally filtered by client)
 */
export const getContactLensPrescriptions = secureAction(async (userId, user, clientId?: string) => {
  try {
    const query = db.query.contactLensPrescriptions.findMany({
      where: and(
        eq(contactLensPrescriptions.userId, userId),
        clientId ? eq(contactLensPrescriptions.clientId, parseInt(clientId)) : undefined
      ),
      with: {
        client: true
      },
      orderBy: [desc(contactLensPrescriptions.date)]
    });

    const results = await query;

    const mapped: ContactLensPrescription[] = results.map((p: typeof results[0]) => ({
      id: p.id.toString(),
      clientId: p.clientId?.toString() || '',
      clientName: p.client?.fullName,
      date: p.date?.toISOString() || '',
      data: p.prescriptionData as ContactLensPrescriptionData,
      notes: p.notes || '',
      createdAt: p.createdAt?.toISOString() || ''
    }));

    await logSuccess(userId, 'READ', 'contact_lens_prescriptions', 'list', { count: mapped.length });
    return { success: true, data: mapped };

  } catch (error: any) {
    await logFailure(userId, 'READ', 'contact_lens_prescriptions', error.message);
    return { success: false, error: 'Erreur lors de la récupération des ordonnances de lentilles' };
  }
});

/**
 * Get Single Contact Lens Prescription
 */
export const getContactLensPrescription = secureAction(async (userId, user, id: string) => {
  try {
    const prescriptionId = parseInt(id);
    const result = await db.query.contactLensPrescriptions.findFirst({
      where: and(
        eq(contactLensPrescriptions.id, prescriptionId),
        eq(contactLensPrescriptions.userId, userId)
      ),
      with: {
        client: true
      }
    });

    if (!result) return { success: false, error: 'Ordonnance de lentilles introuvable' };

    const mapped: ContactLensPrescription = {
      id: result.id.toString(),
      clientId: result.clientId?.toString() || '',
      clientName: result.client?.fullName,
      date: result.date?.toISOString() || '',
      data: result.prescriptionData as ContactLensPrescriptionData,
      notes: result.notes || '',
      createdAt: result.createdAt?.toISOString() || ''
    };

    return { success: true, data: mapped };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * Create Contact Lens Prescription
 */
export const createContactLensPrescription = secureAction(async (userId, user, input: ContactLensPrescriptionInput) => {
  try {
    const clientId = parseInt(input.clientId);

    // Verify client ownership
    const clientExists = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.userId, userId))
    });
    if (!clientExists) return { success: false, error: 'Client introuvable' };

    const result = await db.insert(contactLensPrescriptions).values({
      userId,
      clientId,
      date: input.date,
      prescriptionData: input.data,
      notes: input.notes,
    }).returning();

    await logSuccess(userId, 'CREATE', 'contact_lens_prescriptions', result[0].id.toString());
    
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${clientId}`);

    return { success: true, message: 'Ordonnance de lentilles créée', id: result[0].id.toString() };

  } catch (error: any) {
    await logFailure(userId, 'CREATE', 'contact_lens_prescriptions', error.message);
    return { success: false, error: 'Erreur création' };
  }
});

/**
 * Update Contact Lens Prescription
 */
export const updateContactLensPrescription = secureAction(async (userId, user, id: string, input: Partial<ContactLensPrescriptionInput>) => {
  try {
    const prescriptionId = parseInt(id);

    const existing = await db.select().from(contactLensPrescriptions)
      .where(and(eq(contactLensPrescriptions.id, prescriptionId), eq(contactLensPrescriptions.userId, userId)))
      .limit(1);
    
    if (existing.length === 0) return { success: false, error: 'Ordonnance de lentilles introuvable' };

    const updateData: any = { updatedAt: new Date() };
    if (input.date) updateData.date = input.date;
    if (input.data) updateData.prescriptionData = input.data;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const [updated] = await db.update(contactLensPrescriptions)
      .set(updateData)
      .where(eq(contactLensPrescriptions.id, prescriptionId))
      .returning();

    await logSuccess(userId, 'UPDATE', 'contact_lens_prescriptions', id);

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${updated.clientId}`);

    return { success: true, message: 'Ordonnance de lentilles mise à jour' };

  } catch (error: any) {
    await logFailure(userId, 'UPDATE', 'contact_lens_prescriptions', error.message, id);
    return { success: false, error: 'Erreur mise à jour' };
  }
});

/**
 * Delete Contact Lens Prescription
 */
export const deleteContactLensPrescription = secureAction(async (userId, user, id: string) => {
  try {
    const prescriptionId = parseInt(id);

    const result = await db.delete(contactLensPrescriptions)
      .where(and(eq(contactLensPrescriptions.id, prescriptionId), eq(contactLensPrescriptions.userId, userId)))
      .returning();
    
    if (result.length === 0) return { success: false, error: 'Ordonnance de lentilles introuvable' };

    await logSuccess(userId, 'DELETE', 'contact_lens_prescriptions', id);

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${result[0].clientId}`);

    return { success: true, message: 'Ordonnance de lentilles supprimée' };

  } catch (error: any) {
    await logFailure(userId, 'DELETE', 'contact_lens_prescriptions', error.message, id);
    return { success: false, error: 'Erreur suppression' };
  }
});

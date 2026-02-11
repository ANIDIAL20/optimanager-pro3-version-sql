/**
 * Prescriptions Actions - Neon/Drizzle Version
 * Secure management of optical prescriptions
 */

'use server';

import { db } from '@/db';
import { prescriptionsLegacy as prescriptions, prescriptions as newPrescriptionsTable, clients } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface EyePrescription {
    sphere: string;
    cylinder: string;
    axis: string;
    addition?: string;
}

export interface PrescriptionData {
    od: EyePrescription;
    og: EyePrescription;
    pd: string;
    doctorName?: string;
}

export interface PrescriptionInput {
    clientId: string;
    date: Date;
    data: PrescriptionData;
    notes?: string;
}

export interface Prescription {
    id: string;
    clientId: string;
    clientName?: string;
    date: string;
    data: PrescriptionData;
    notes?: string;
    createdAt: string;
}

// ========================================
// PRESCRIPTION ACTIONS
// ========================================

/**
 * Get all prescriptions (optionally filtered by client)
 */
// Consolidated Get Prescriptions function
export const getPrescriptions = secureAction(async (userId, user, clientId?: string) => {
    try {
        // 1. Fetch from LEGACY table
        const legacyQuery = db.query.prescriptionsLegacy.findMany({
            where: and(
                eq(prescriptions.userId, userId),
                clientId ? eq(prescriptions.clientId, parseInt(clientId)) : undefined
            ),
            with: { client: true }
        });

        // 2. Fetch from NEW table (AI Scanner)
        const newPrescriptionsQuery = db.query.prescriptions.findMany({
            where: and(
                eq(newPrescriptionsTable.userId, userId),
                clientId ? eq(newPrescriptionsTable.clientId, parseInt(clientId)) : undefined
            ),
             with: { client: true }
        });

        const [legacyResults, newResults] = await Promise.all([legacyQuery, newPrescriptionsQuery]);

        // 3. Map LEGACY results
        const mappedLegacy: Prescription[] = legacyResults.map((p: any) => ({
            id: p.id?.toString(),
            clientId: p.clientId?.toString() || '',
            clientName: (p as any).client?.fullName || 'N/A',
            date: p.date instanceof Date ? p.date.toISOString() : (p.date || ''),
            data: p.prescriptionData as PrescriptionData,
            notes: p.notes || '',
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : (p.createdAt || ''),
            source: 'legacy'
        }));

        // 4. Map NEW results
        const mappedNew: Prescription[] = newResults.map((p: any) => ({
            id: p.id,
            clientId: p.clientId?.toString() || '',
            clientName: (p as any).client?.fullName || 'N/A',
            date: p.prescriptionDate instanceof Date ? p.prescriptionDate.toISOString() : (p.prescriptionDate || ''),
            data: {
                od: {
                    sphere: p.odSph?.toString() || '',
                    cylinder: p.odCyl?.toString() || '',
                    axis: p.odAxis?.toString() || '',
                    addition: p.odAdd?.toString() || ''
                },
                og: {
                    sphere: p.osSph?.toString() || '',
                    cylinder: p.osCyl?.toString() || '',
                    axis: p.osAxis?.toString() || '',
                    addition: p.osAdd?.toString() || ''
                },
                pd: p.pd?.toString() || '',
                doctorName: p.doctorName || ''
            },
            notes: p.notes || '',
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : (p.createdAt || ''),
            imageUrl: p.imageUrl,
            source: 'scan'
        }));

        // 5. Combine and Sort by Date
        const allPrescriptions = [...mappedNew, ...mappedLegacy].sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        await logSuccess(userId, 'READ', 'prescriptions', 'list', { count: allPrescriptions.length });
        return { success: true, data: allPrescriptions };

    } catch (error: any) {
        console.error('💥 Error fetching prescriptions:', error);
        await logFailure(userId, 'READ', 'prescriptions', error.message);
        return { success: false, error: `Erreur récupération ordonnances: ${error.message}` };
    }
});

/**
 * Get Single Prescription
 */
export const getPrescription = secureAction(async (userId, user, id: string) => {
    try {
        const prescriptionId = parseInt(id);
        const result = await db.query.prescriptionsLegacy.findFirst({
            where: and(
                eq(prescriptions.id, prescriptionId),
                eq(prescriptions.userId, userId)
            ),
            with: {
                client: true
            }
        });

        if (!result) return { success: false, error: 'Ordonnance introuvable' };

        const mapped: Prescription = {
            id: result.id.toString(),
            clientId: result.clientId?.toString() || '',
            clientName: result.client?.fullName,
            date: result.date?.toISOString() || '',
            data: result.prescriptionData as PrescriptionData,
            notes: result.notes || '',
            createdAt: result.createdAt?.toISOString() || ''
        };

        return { success: true, data: mapped };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Create Prescription
 */
export const createPrescription = secureAction(async (userId, user, input: PrescriptionInput) => {
    try {
        const clientId = parseInt(input.clientId);

        // Verify client ownership
        const clientExists = await db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.userId, userId))
        });
        if (!clientExists) return { success: false, error: 'Client introuvable' };

        const result = await db.insert(prescriptions).values({
            userId,
            clientId,
            date: input.date,
            prescriptionData: input.data,
            notes: input.notes,
        }).returning();

        await logSuccess(userId, 'CREATE', 'prescriptions', result[0].id.toString());
        
        revalidatePath('/dashboard/clients');
        revalidatePath(`/dashboard/clients/${clientId}`);

        return { success: true, message: 'Ordonnance créée', id: result[0].id.toString() };

    } catch (error: any) {
        await logFailure(userId, 'CREATE', 'prescriptions', error.message);
        return { success: false, error: `Erreur création: ${error.message}` };
    }
});

/**
 * Update Prescription
 */
export const updatePrescription = secureAction(async (userId, user, id: string, input: Partial<PrescriptionInput>) => {
    try {
        const prescriptionId = parseInt(id);

        const existing = await db.select().from(prescriptions)
            .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.userId, userId)))
            .limit(1);
        
        if (existing.length === 0) return { success: false, error: 'Ordonnance introuvable' };

        const updateData: any = { updatedAt: new Date() };
        if (input.date) updateData.date = input.date;
        if (input.data) updateData.prescriptionData = input.data;
        if (input.notes !== undefined) updateData.notes = input.notes;

        await db.update(prescriptions)
            .set(updateData)
            .where(eq(prescriptions.id, prescriptionId));

        await logSuccess(userId, 'UPDATE', 'prescriptions', id);
        return { success: true, message: 'Ordonnance mise à jour' };

    } catch (error: any) {
        await logFailure(userId, 'UPDATE', 'prescriptions', error.message, id);
        return { success: false, error: 'Erreur mise à jour' };
    }
});

/**
 * Delete Prescription
 */
export const deletePrescription = secureAction(async (userId, user, id: string) => {
    try {
        let deleted = false;

        // 1. Try deleting from LEGACY table (if ID is integer)
        const prescriptionId = parseInt(id);
        if (!isNaN(prescriptionId)) {
            const result = await db.delete(prescriptions)
                .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.userId, userId)))
                .returning();
            if (result.length > 0) deleted = true;
        }

        // 2. If not found, try deleting from NEW table (UUID)
        if (!deleted) {
             const result = await db.delete(newPrescriptionsTable)
                .where(and(eq(newPrescriptionsTable.id, id), eq(newPrescriptionsTable.userId, userId)))
                .returning();
             if (result.length > 0) deleted = true;
        }
        
        if (!deleted) return { success: false, error: 'Ordonnance introuvable' };

        await logSuccess(userId, 'DELETE', 'prescriptions', id);
        revalidatePath('/dashboard/clients'); // Ensure cache is cleared
        return { success: true, message: 'Ordonnance supprimée' };

    } catch (error: any) {
        await logFailure(userId, 'DELETE', 'prescriptions', error.message, id);
        return { success: false, error: 'Erreur suppression' };
    }
});

/**
 * Clients Actions - Neon/Drizzle Version with Security & Relations
 * Migrated from Firestore to PostgreSQL with full frontend compatibility
 */

'use server';

import { db } from '@/db';
import { clients, prescriptionsLegacy as prescriptions, prescriptions as newPrescriptionsTable, sales, lensOrders, clientInteractions } from '@/db/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { getClientUsageStats } from '@/app/actions/adminActions';
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

export interface Prescription {
    id?: string;
    date: string;
    od: EyePrescription; // Oeil Droit (Right Eye)
    og: EyePrescription; // Oeil Gauche (Left Eye)
    pd: string; // Pupillary Distance
    doctorName?: string;
    notes?: string;
    createdAt: string;
}

export interface Client {
    id?: string;
    name: string;
    prenom?: string;
    nom?: string;
    phone: string;
    phone2?: string;
    email?: string;
    gender?: string;
    cin?: string;
    mutuelle?: string;
    city?: string;
    address?: string;
    dateOfBirth?: string;
    prescriptions?: Prescription[];
    createdAt: string;
    updatedAt?: string;
}

// ========================================
// CLIENT ACTIONS
// ========================================

/**
 * Get all clients for authenticated user
 * ✅ SECURED - Only returns user's clients
 * ✅ INCLUDES PRESCRIPTIONS - Frontend compatible
 */
export const getClients = secureAction(async (userId, user, searchQuery?: string) => {
    console.log(`👥 Fetching clients for user: ${userId}`);

    try {
        // Use relational query to automatically fetch prescriptions
        // 🔒 RobustFetch: Only select necessary columns to avoid failures if DB schema has missing columns (like updatedAt)
        const userClientsWithPrescriptions = await db.query.clients.findMany({
            where: eq(clients.userId, userId), // ⚠️ CRITICAL: Filter by userId
            with: {
                prescriptionsLegacy: {
                    columns: {
                        id: true,
                        prescriptionData: true,
                    }
                },
                prescriptions: {
                    columns: {
                        id: true,
                        createdAt: true,
                        // Avoid selecting odSph, etc. which might be missing
                    }
                },
            },
            orderBy: desc(clients.createdAt),
        });

        // Transform to match Client interface
        let transformedClients: Client[] = userClientsWithPrescriptions.map((client: any) => ({
            id: client.id.toString(),
            name: client.fullName,
            prenom: client.prenom,
            nom: client.nom,
            phone: client.phone,
            phone2: client.phone2,
            email: client.email,
            gender: client.gender,
            cin: client.cin,
            mutuelle: client.mutuelle,
            address: client.address,
            city: client.city,
            dateOfBirth: client.dateOfBirth?.toISOString(),
            prescriptions: [
                ...(client.prescriptionsLegacy || []).map((p: any) => p.prescriptionData as any),
                ...(client.prescriptions || []).map((p: any) => ({
                    id: p.id,
                    date: p.prescriptionDate?.toISOString() || '',
                    od: { sphere: p.odSph?.toString() || '', cylinder: p.odCyl?.toString() || '', axis: p.odAxis?.toString() || '', addition: p.odAdd?.toString() || '', pd: p.odPd?.toString() || '', height: p.odHeight?.toString() || '' },
                    og: { sphere: p.osSph?.toString() || '', cylinder: p.osCyl?.toString() || '', axis: p.osAxis?.toString() || '', addition: p.osAdd?.toString() || '', pd: p.osPd?.toString() || '', height: p.osHeight?.toString() || '' },
                    pd: p.pd?.toString() || '',
                    createdAt: p.createdAt?.toISOString() || ''
                } as any))
            ], // 👈 Prescriptions merged!
            createdAt: client.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: client.updatedAt?.toISOString(),
        }));

        // Apply search filter if provided
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            transformedClients = transformedClients.filter(client =>
                client.name.toLowerCase().includes(lowerQuery) ||
                (client.phone && client.phone.includes(searchQuery)) ||
                (client.email && client.email.toLowerCase().includes(lowerQuery))
            );
        }

        console.log(`✅ Found ${transformedClients.length} clients`);
        await logSuccess(userId, 'READ', 'clients', 'LIST_ALL', { count: transformedClients.length, searchQuery });

        return { success: true, clients: transformedClients };

    } catch (error: any) {
        console.error('💥 Error fetching clients:', error);
        await logFailure(userId, 'READ', 'clients', error.message);
        return {
            success: false,
            error: 'Erreur lors de la récupération des clients',
            clients: []
        };
    }
});

/**
 * Get a single client by ID
 * ✅ SECURED - Verifies ownership
 * ✅ INCLUDES PRESCRIPTIONS - Frontend compatible
 */
export const getClient = secureAction(async (userId, user, clientId: string) => {
    console.log(`👤 Fetching client: ${clientId}`);

    try {
        const clientIdNum = parseInt(clientId);
        
        // 🛡️ RobustFetch Step 1: Fetch Client Primary Data (Safe Selection)
        // We use a safe list of columns that definitely exist in the DB
        const clientResults = await db.select({
            id: clients.id,
            fullName: clients.fullName,
            prenom: clients.prenom,
            nom: clients.nom,
            email: clients.email,
            phone: clients.phone,
            address: clients.address,
            city: clients.city,
            gender: clients.gender,
            cin: clients.cin,
            dateOfBirth: clients.dateOfBirth,
            mutuelle: clients.mutuelle,
            notes: clients.notes,
            balance: clients.balance,
            totalSpent: clients.totalSpent,
            isActive: clients.isActive,
            lastVisit: clients.lastVisit,
            createdAt: clients.createdAt,
            updatedAt: clients.updatedAt,
        })
        .from(clients)
        .where(and(
            eq(clients.id, clientIdNum),
            eq(clients.userId, userId)
        ))
        .limit(1);

        if (clientResults.length === 0) {
            return { success: false, error: 'Client introuvable' };
        }

        const clientData = clientResults[0];
        const allPrescriptions: any[] = [];

        // 🛡️ RobustFetch Step 2: Fetch Legacy Prescriptions (Isolated)
        try {
            const legacyResults = await db.select()
                .from(prescriptions) // Variable 'prescriptions' refers to 'prescriptionsLegacy' table in this file
                .where(and(
                    eq(prescriptions.clientId, clientIdNum),
                    eq(prescriptions.userId, userId)
                ))
                .orderBy(desc(prescriptions.createdAt));
            
            allPrescriptions.push(...legacyResults.map((p: any) => ({
                ...(p.prescriptionData as any),
                id: p.id?.toString(),
                createdAt: p.createdAt?.toISOString() || ''
            })));
        } catch (e: any) {
            console.warn(`[getClient] Failed to fetch legacy prescriptions for client ${clientId}: ${e?.message || 'Unknown error'}`);
        }

        // 🛡️ RobustFetch Step 3: Fetch New Structured Prescriptions (Isolated)
        try {
             const newResults = await db.query.prescriptions.findMany({
                where: and(
                    eq(newPrescriptionsTable.clientId, clientIdNum),
                    eq(newPrescriptionsTable.userId, userId)
                ),
                orderBy: (p: any, { desc }: any) => [desc(p.createdAt)],
            });

            allPrescriptions.push(...newResults.map((p: any) => ({
                id: p.id,
                date: p.prescriptionDate?.toISOString() || '',
                od: {
                    sphere: p.odSph?.toString() || '',
                    cylinder: p.odCyl?.toString() || '',
                    axis: p.odAxis?.toString() || '',
                    addition: p.odAdd?.toString() || '',
                    pd: p.odPd?.toString() || '',
                    height: p.odHeight?.toString() || ''
                },
                og: {
                    sphere: p.osSph?.toString() || '',
                    cylinder: p.osCyl?.toString() || '',
                    axis: p.osAxis?.toString() || '',
                    addition: p.osAdd?.toString() || '',
                    pd: p.osPd?.toString() || '',
                    height: p.osHeight?.toString() || ''
                },
                pd: p.pd?.toString() || '',
                doctorName: p.doctorName || '',
                notes: p.notes || '',
                createdAt: p.createdAt?.toISOString() || ''
            })));
        } catch (e: any) {
            console.warn(`[getClient] Failed to fetch new prescriptions for client ${clientId}: ${e?.message || 'Unknown error'}`);
        }

        // Final sorting
        const sortedPrescriptions = allPrescriptions.sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        // Transform to Client interface
        const client: Client = {
            id: clientData.id.toString(),
            name: clientData.fullName,
            prenom: clientData.prenom || undefined,
            nom: clientData.nom || undefined,
            phone: clientData.phone || '',
            email: clientData.email || undefined,
            gender: clientData.gender || undefined,
            cin: clientData.cin || undefined,
            mutuelle: clientData.mutuelle || undefined,
            address: clientData.address || undefined,
            city: clientData.city || undefined,
            dateOfBirth: clientData.dateOfBirth?.toISOString(),
            prescriptions: sortedPrescriptions,
            createdAt: clientData.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: clientData.updatedAt?.toISOString(),
        };

        console.log(`✅ Client fetched: ${client.name} with ${sortedPrescriptions.length} prescriptions`);
        await logSuccess(userId, 'READ', 'clients', clientId);

        return { success: true, client };

    } catch (error: any) {
        console.error('💥 Critical error in getClient:', error.message);
        await logFailure(userId, 'READ', 'clients', error.message, clientId);
        return {
            success: false,
            error: `Erreur critique lors de la récupération du client: ${error.message}`
        };
    }
});

/**
 * Create a new client
 * ✅ SECURED - Automatically assigns to authenticated user
 */
export const createClient = secureAction(async (userId, user, data: Omit<Client, 'id' | 'createdAt' | 'prescriptions'>) => {
    console.log(`📝 Creating client: ${data.name}`);

    try {
        if (!data.name || !data.phone) {
            return {
                success: false,
                error: 'Le nom et le téléphone sont requis'
            };
        }

        // 🛡️ CHECK QUOTAS
        const usage = await getClientUsageStats(userId);
        if (usage.clients.count >= usage.clients.limit) {
             return { success: false, error: `Vous avez atteint la limite de clients pour votre plan (${usage.clients.limit}). Veuillez mettre à niveau.` };
        }

        const clientData = {
            userId, // ⚠️ CRITICAL: Set userId
            fullName: data.name,
            prenom: data.prenom || null,
            nom: data.nom || null,
            phone: data.phone,
            phone2: data.phone2 || null,
            email: data.email || null,
            gender: data.gender || null,
            cin: data.cin || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            mutuelle: data.mutuelle || null,
            address: data.address || null,
            city: data.city || null,
            notes: null,
            balance: '0',
            totalSpent: '0',
            isActive: true,
            lastVisit: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.insert(clients).values(clientData).returning();
        
        await logSuccess(userId, 'CREATE', 'clients', result[0].id.toString(), { name: data.name }, null, clientData);

        revalidatePath('/dashboard/clients');
        return {
            success: true,
            id: result[0].id.toString(),
            message: 'Client créé avec succès'
        };

    } catch (error: any) {
        console.error('💥 Error creating client:', error);
        await logFailure(userId, 'CREATE', 'clients', error.message);
        return {
            success: false,
            error: 'Erreur lors de la création du client'
        };
    }
});

/**
 * Update client information
 * ✅ SECURED - Verifies ownership before updating
 */
export const updateClient = secureAction(async (userId, user, clientId: string, data: Partial<Client>) => {
    console.log(`🔄 Updating client: ${clientId}`);

    try {
        const clientIdNum = parseInt(clientId);

        // Verify ownership first
        const existing = await db
            .select()
            .from(clients)
            .where(and(
                eq(clients.id, clientIdNum),
                eq(clients.userId, userId) // ⚠️ CRITICAL: Verify ownership
            ))
            .limit(1);

        if (existing.length === 0) {
            return {
                success: false,
                error: 'Client introuvable ou accès refusé'
            };
        }

        // Prepare update data
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (data.name) updateData.fullName = data.name;
        if ((data as any).prenom !== undefined) updateData.prenom = (data as any).prenom;
        if ((data as any).nom !== undefined) updateData.nom = (data as any).nom;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.phone2 !== undefined) updateData.phone2 = data.phone2;
        if (data.email !== undefined) updateData.email = data.email;
        if ((data as any).gender !== undefined) updateData.gender = (data as any).gender;
        if ((data as any).cin !== undefined) updateData.cin = (data as any).cin;
        if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
        if (data.mutuelle !== undefined) updateData.mutuelle = data.mutuelle;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.city !== undefined) updateData.city = data.city;

        // Update the client
        await db
            .update(clients)
            .set(updateData)
            .where(eq(clients.id, clientIdNum));

        await logSuccess(userId, 'UPDATE', 'clients', clientId, { name: data.name || existing[0].fullName }, existing[0], { ...existing[0], ...updateData });

        revalidatePath('/dashboard/clients');
        revalidatePath(`/dashboard/clients/${clientId}`);
        return {
            success: true,
            message: 'Client mis à jour avec succès'
        };

    } catch (error: any) {
        console.error('💥 Error updating client:', error);
        await logFailure(userId, 'UPDATE', 'clients', error.message, clientId);
        return {
            success: false,
            error: 'Erreur lors de la mise à jour du client'
        };
    }
});

/**
 * Add a new interaction/note
 */
export const addClientInteraction = secureAction(async (userId, user, clientId: string, data: { type: string; content: string }) => {
    try {
        const clientIdNum = parseInt(clientId);
        
        const result = await db.insert(clientInteractions).values({
            userId,
            clientId: clientIdNum,
            type: data.type,
            content: data.content,
            createdAt: new Date()
        }).returning();

        revalidatePath(`/dashboard/clients/${clientId}`);
        return { success: true, data: result[0] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Get client interactions
 */
export const getClientInteractions = secureAction(async (userId, user, clientId: string) => {
    try {
        const clientIdNum = parseInt(clientId);
        const results = await db.query.clientInteractions.findMany({
            where: and(
                eq(clientInteractions.clientId, clientIdNum),
                eq(clientInteractions.userId, userId)
            ),
            orderBy: [desc(clientInteractions.createdAt)]
        });

        return { success: true, data: results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Add prescription to client
 * ✅ SECURED - Creates prescription in separate table
 */
export const addPrescription = secureAction(async (
    userId,
    user,
    clientId: string,
    prescriptionData: Omit<Prescription, 'id' | 'createdAt'>
) => {
    console.log(`👓 Adding prescription for client: ${clientId}`);

    try {
        const clientIdNum = parseInt(clientId);

        // Verify client exists and belongs to user
        const existingClient = await db
            .select()
            .from(clients)
            .where(and(
                eq(clients.id, clientIdNum),
                eq(clients.userId, userId)
            ))
            .limit(1);

        if (existingClient.length === 0) {
            return {
                success: false,
                error: 'Client introuvable ou accès refusé'
            };
        }

        // Create prescription record
        const prescription = {
            userId, // ⚠️ CRITICAL: Set userId
            clientId: clientIdNum,
            prescriptionData: {
                ...prescriptionData,
                createdAt: new Date().toISOString(),
            },
            date: new Date(prescriptionData.date),
            notes: prescriptionData.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(prescriptions).values(prescription);

        console.log(`✅ Prescription added`);
        await logSuccess(userId, 'CREATE', 'prescriptions', clientId, { clientId });

        revalidatePath(`/dashboard/clients/${clientId}`);
        return {
            success: true,
            message: 'Ordonnance ajoutée avec succès'
        };

    } catch (error: any) {
        console.error('💥 Error adding prescription:', error);
        await logFailure(userId, 'CREATE', 'prescriptions', error.message, clientId);
        return {
            success: false,
            error: 'Erreur lors de l\'ajout de l\'ordonnance'
        };
    }
});

/**
 * Delete a client
 * ✅ SECURED - Verifies ownership before deleting
 */
export const deleteClient = secureAction(async (userId, user, clientId: string) => {
    console.log(`🗑️ Deleting client: ${clientId}`);

    try {
        const clientIdNum = parseInt(clientId);

        // Verify ownership first
        const existing = await db
            .select()
            .from(clients)
            .where(and(
                eq(clients.id, clientIdNum),
                eq(clients.userId, userId) // ⚠️ CRITICAL: Verify ownership
            ))
            .limit(1);

        if (existing.length === 0) {
            return {
                success: false,
                error: 'Client introuvable ou accès refusé'
            };
        }

        // Delete associated prescriptions first (cascade) with strict userId check
        await db
            .delete(prescriptions)
            .where(and(
                eq(prescriptions.clientId, clientIdNum),
                eq(prescriptions.userId, userId) // 🔒 Strict ownership check
            ));

        // Delete the client
        await db
            .delete(clients)
            .where(and(
                eq(clients.id, clientIdNum),
                eq(clients.userId, userId)
            ));

        console.log(`✅ Client deleted`);
        await logSuccess(userId, 'DELETE', 'clients', clientId);

        revalidatePath('/dashboard/clients');
        return {
            success: true,
            message: 'Client supprimé avec succès'
        };

    } catch (error: any) {
        console.error('💥 Error deleting client:', error);
        await logFailure(userId, 'DELETE', 'clients', error.message, clientId);
        return {
            success: false,
            error: 'Erreur lors de la suppression du client'
        };
    }
});

/**
 * Get client snapshot with recent activity
 * ✅ SECURED - Returns comprehensive client overview
 */
export const getClientSnapshot = secureAction(async (userId, user, clientId: string) => {
    console.log(`📊 Fetching snapshot for client: ${clientId}`);

    try {
        const clientIdNum = parseInt(clientId);

        // Get client
        const client = await db.query.clients.findFirst({
            where: and(
                eq(clients.id, clientIdNum),
                eq(clients.userId, userId)
            ),
            columns: {
                id: true,
                fullName: true,
                phone: true,
                // phone2: true,
                email: true,
                gender: true,
                cin: true,
                dateOfBirth: true,
                mutuelle: true,
                address: true,
                city: true,
                balance: true,
                // creditLimit: true,
                totalSpent: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        // Get recent sales (last 10 for debt calculation)
        const recentSales = await db.query.sales.findMany({
            where: and(
                eq(sales.userId, userId),
                eq(sales.clientId, clientIdNum)
            ),
            orderBy: [desc(sales.createdAt)],
            limit: 10
        });

        // Get recent prescriptions (last 3)
        // 🔒 RobustFetch: Using prescriptionsLegacy + limited columns to avoid schema mismatch
        const recentPrescriptions = await db.query.prescriptionsLegacy.findMany({
            where: and(
                eq(prescriptions.userId, userId),
                eq(prescriptions.clientId, clientIdNum)
            ),
            columns: {
                id: true,
                prescriptionData: true,
                createdAt: true,
            },
            orderBy: [desc(prescriptions.createdAt)],
            limit: 3
        });

        // Get pending lens orders
        const pendingOrders = await db.query.lensOrders.findMany({
            where: and(
                eq(lensOrders.userId, userId),
                eq(lensOrders.clientId, clientIdNum),
                eq(lensOrders.status, 'pending')
            )
        });

        // Calculate total debt from sales
        const totalDebt = recentSales.reduce((sum: number, s: any) => {
            const remaining = parseFloat((s as any).resteAPayer || '0');
            return sum + remaining;
        }, 0);

        // Get last visit date from most recent sale
        const lastVisit = recentSales.length > 0 ? recentSales[0].createdAt : null;

        // Get last prescription
        const lastPrescription = recentPrescriptions.length > 0 ? recentPrescriptions[0] : null;

        // Get recent interactions
        const recentInteractions = await db.query.clientInteractions.findMany({
            where: and(
                eq(clientInteractions.userId, userId),
                eq(clientInteractions.clientId, clientIdNum)
            ),
            orderBy: [desc(clientInteractions.createdAt)],
            limit: 10
        });

        console.log(`✅ Snapshot fetched with ${recentSales.length} sales, ${recentPrescriptions.length} prescriptions`);
        await logSuccess(userId, 'READ', 'clients', clientId || 'unknown', { snapshot: true });

        return {
            success: true,
            data: {
                client,
                totalDebt,
                lastVisit,
                lastPrescription,
                recentSales,
                recentPrescriptions,
                pendingOrders,
                recentInteractions
            }
        };
    } catch (error: any) {
        console.error('💥 Error fetching client snapshot:', error);
        await logFailure(userId, 'READ', 'clients', error.message, clientId);
        return { success: false, error: error.message };
    }
});

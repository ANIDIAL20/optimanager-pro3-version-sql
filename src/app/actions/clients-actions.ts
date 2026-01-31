/**
 * Clients Actions - Neon/Drizzle Version with Security & Relations
 * Migrated from Firestore to PostgreSQL with full frontend compatibility
 */

'use server';

import { db } from '@/db';
import { clients, prescriptions, sales, lensOrders } from '@/db/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

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
        const userClientsWithPrescriptions = await db.query.clients.findMany({
            where: eq(clients.userId, userId), // ⚠️ CRITICAL: Filter by userId
            with: {
                prescriptions: true, // 👈 Auto-fetch prescriptions
            },
            orderBy: desc(clients.createdAt),
        });

        // Transform to match Client interface
        let transformedClients: Client[] = userClientsWithPrescriptions.map(client => ({
            id: client.id.toString(),
            name: client.fullName,
            phone: client.phone || '',
            email: client.email || undefined,
            city: client.city || undefined,
            mutuelle: client.mutuelle || undefined, // TODO: Add if needed in schema
            address: client.address || undefined,
            dateOfBirth: undefined, // TODO: Add if needed in schema
            prescriptions: client.prescriptions.map(p => p.prescriptionData as any) || [], // 👈 Prescriptions included!
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
        await logSuccess(userId, 'READ', 'clients', undefined, { count: transformedClients.length, searchQuery });

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
        
        // Use relational query to automatically fetch prescriptions
        const clientWithPrescriptions = await db.query.clients.findFirst({
            where: and(
                eq(clients.id, clientIdNum),
                eq(clients.userId, userId) // ⚠️ CRITICAL: Verify ownership
            ),
            with: {
                prescriptions: {
                    orderBy: desc(prescriptions.date), // 👈 Order prescriptions by date
                },
            },
        });

        if (!clientWithPrescriptions) {
            return {
                success: false,
                error: 'Client introuvable'
            };
        }

        // Transform to Client interface
        const client: Client = {
            id: clientWithPrescriptions.id.toString(),
            name: clientWithPrescriptions.fullName,
            phone: clientWithPrescriptions.phone || '',
            email: clientWithPrescriptions.email || undefined,
            city: clientWithPrescriptions.city || undefined,
            address: clientWithPrescriptions.address || undefined,
            prescriptions: clientWithPrescriptions.prescriptions.map(p => p.prescriptionData as any) || [], // 👈 Prescriptions included!
            createdAt: clientWithPrescriptions.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: clientWithPrescriptions.updatedAt?.toISOString(),
        };

        console.log(`✅ Client fetched: ${client.name} with ${client.prescriptions.length} prescriptions`);
        await logSuccess(userId, 'READ', 'clients', clientId);

        return { success: true, client };

    } catch (error: any) {
        console.error('💥 Error fetching client:', error);
        await logFailure(userId, 'READ', 'clients', error.message, clientId);
        return {
            success: false,
            error: 'Erreur lors de la récupération du client'
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

        console.log(`✅ Client created with ID: ${result[0].id}`);
        await logSuccess(userId, 'CREATE', 'clients', result[0].id);

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

        console.log(`✅ Client updated`);
        await logSuccess(userId, 'UPDATE', 'clients', clientId);

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
        await logSuccess(userId, 'CREATE', 'prescriptions', undefined, { clientId });

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

        // Delete associated prescriptions first (cascade)
        await db
            .delete(prescriptions)
            .where(eq(prescriptions.clientId, clientIdNum));

        // Delete the client
        await db
            .delete(clients)
            .where(eq(clients.id, clientIdNum));

        console.log(`✅ Client deleted`);
        await logSuccess(userId, 'DELETE', 'clients', clientId);

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
            )
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
        const recentPrescriptions = await db.query.prescriptions.findMany({
            where: and(
                eq(prescriptions.userId, userId),
                eq(prescriptions.clientId, clientIdNum)
            ),
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
        const totalDebt = recentSales.reduce((sum, s) => {
            const remaining = parseFloat(s.remainingAmount || '0');
            return sum + remaining;
        }, 0);

        // Get last visit date from most recent sale
        const lastVisit = recentSales.length > 0 ? recentSales[0].createdAt : null;

        // Get last prescription
        const lastPrescription = recentPrescriptions.length > 0 ? recentPrescriptions[0] : null;

        console.log(`✅ Snapshot fetched with ${recentSales.length} sales, ${recentPrescriptions.length} prescriptions`);
        await logSuccess(userId, 'READ', 'clients', clientId, { snapshot: true });

        return {
            success: true,
            data: {
                client,
                totalDebt,
                lastVisit,
                lastPrescription,
                recentSales,
                recentPrescriptions,
                pendingOrders
            }
        };
    } catch (error: any) {
        console.error('💥 Error fetching client snapshot:', error);
        await logFailure(userId, 'READ', 'clients', error.message, clientId);
        return { success: false, error: error.message };
    }
});

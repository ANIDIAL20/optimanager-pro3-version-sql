/**
 * Devis Actions - Neon/Drizzle Version
 * Secure devis management with conversion to sales
 */

'use server';

import { db } from '@/db';
import { devis, sales, products, stockMovements } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface DevisItem {
    id?: string;
    productId?: string; // ID of the product
    reference: string;
    designation: string;
    
    // New fields
    marque?: string;
    modele?: string;
    couleur?: string;

    quantite: number;
    prixUnitaire: number;
}

export interface Devis {
    id: string;
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    items: DevisItem[];
    totalHT: number;
    totalTTC: number;
    status: 'EN_ATTENTE' | 'VALIDE' | 'REFUSE' | 'TRANSFORME';
    createdAt: string;
    updatedAt?: string;
    saleId?: string;
    validUntil?: string;
}

export interface CreateDevisInput {
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    items: DevisItem[];
    status?: Devis['status'];
    validUntil?: Date;
}

// ========================================
// DEVIS ACTIONS
// ========================================

/**
 * Get all devis
 */
export const getDevis = secureAction(async (userId, user) => {
    try {
        const results = await db.query.devis.findMany({
            where: eq(devis.userId, userId),
            orderBy: [desc(devis.createdAt)]
        });

        const mapped: Devis[] = results.map(d => ({
            id: d.id.toString(),
            clientId: d.clientId?.toString(),
            clientName: d.clientName,
            clientPhone: d.clientPhone || undefined,
            items: (d.items as DevisItem[]) || [],
            totalHT: Number(d.totalHT),
            totalTTC: Number(d.totalTTC),
            status: (d.status as Devis['status']) || 'EN_ATTENTE',
            createdAt: d.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: d.updatedAt?.toISOString(),
            saleId: d.saleId?.toString(),
            validUntil: d.validUntil?.toISOString()
        }));

        await logSuccess(userId, 'READ', 'devis', undefined, { count: mapped.length });
        return { success: true, devis: mapped };

    } catch (error: any) {
        await logFailure(userId, 'READ', 'devis', error.message);
        return { success: false, error: 'Erreur lors de la récupération des devis', devis: [] };
    }
});

/**
 * Get single devis
 */
export const getDevisById = secureAction(async (userId, user, devisId: string) => {
    try {
        const id = parseInt(devisId);
        const result = await db.query.devis.findFirst({
            where: and(eq(devis.id, id), eq(devis.userId, userId))
        });

        if (!result) return { success: false, error: 'Devis non trouvé' };

        const mapped: Devis = {
            id: result.id.toString(),
            clientId: result.clientId?.toString(),
            clientName: result.clientName,
            clientPhone: result.clientPhone || undefined,
            items: (result.items as DevisItem[]) || [],
            totalHT: Number(result.totalHT),
            totalTTC: Number(result.totalTTC),
            status: (result.status as Devis['status']) || 'EN_ATTENTE',
            createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: result.updatedAt?.toISOString(),
            saleId: result.saleId?.toString(),
            validUntil: result.validUntil?.toISOString()
        };

        return { success: true, devis: mapped };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Create Devis
 */
export const createDevis = secureAction(async (userId, user, data: CreateDevisInput) => {
    try {
        if (!data.clientName) return { success: false, error: 'Nom client requis' };
        if (!data.items || data.items.length === 0) return { success: false, error: 'Articles requis' };

        // Calculate totals
        const totalHT = data.items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
        const totalTTC = totalHT * 1.20;

        const newDevis = {
            userId,
            clientId: data.clientId ? parseInt(data.clientId) : null,
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            items: data.items,
            totalHT: totalHT.toFixed(2),
            totalTTC: totalTTC.toFixed(2),
            status: data.status || 'EN_ATTENTE',
            validUntil: data.validUntil,
            createdAt: new Date(),
        };

        const result = await db.insert(devis).values(newDevis).returning();

        await logSuccess(userId, 'CREATE', 'devis', result[0].id.toString());
        return { success: true, id: result[0].id.toString(), message: 'Devis créé avec succès' };

    } catch (error: any) {
        await logFailure(userId, 'CREATE', 'devis', error.message);
        return { success: false, error: 'Erreur création devis' };
    }
});

/**
 * Update Devis Status
 */
export const updateDevisStatus = secureAction(async (userId, user, devisId: string, status: Devis['status']) => {
    try {
        const id = parseInt(devisId);
        
        const result = await db.update(devis)
            .set({ status, updatedAt: new Date() })
            .where(and(eq(devis.id, id), eq(devis.userId, userId)))
            .returning();
            
        if (result.length === 0) return { success: false, error: 'Devis introuvable' };

        await logSuccess(userId, 'UPDATE_STATUS', 'devis', devisId, { status });
        return { success: true, message: 'Statut mis à jour' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Delete Devis
 */
export const deleteDevis = secureAction(async (userId, user, devisId: string) => {
    try {
        const id = parseInt(devisId);

        const result = await db.delete(devis)
            .where(and(eq(devis.id, id), eq(devis.userId, userId)))
            .returning();

        if (result.length === 0) return { success: false, error: 'Devis introuvable' };

        await logSuccess(userId, 'DELETE', 'devis', devisId);
        return { success: true, message: 'Devis supprimé' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Convert Devis to Sale
 */
export const convertDevisToSale = secureAction(async (userId, user, devisId: string) => {
    try {
        const id = parseInt(devisId);

        const result = await db.transaction(async (tx) => {
            // 1. Get Devis
            const devisData = await tx.query.devis.findFirst({
                where: and(eq(devis.id, id), eq(devis.userId, userId))
            });

            if (!devisData) throw new Error("Devis introuvable.");
            if (devisData.status === 'TRANSFORME') throw new Error("Déjà transformé.");

            // 2. Check Stock & Prepare Updates
            const devisItems = devisData.items as DevisItem[];
            
            for (const item of devisItems) {
                if (item.productId) {
                    const pid = parseInt(item.productId);
                    if (!isNaN(pid)) {
                         const product = await tx.query.products.findFirst({
                             where: eq(products.id, pid)
                         });
                         
                         if (product) {
                             if ((product.quantiteStock || 0) < item.quantite) {
                                 throw new Error(`Stock insuffisant pour ${item.designation}`);
                             }
                             
                             // Update stock
                             await tx.update(products)
                                 .set({ quantiteStock: (product.quantiteStock || 0) - item.quantite })
                                 .where(eq(products.id, pid));

                             // Log movement
                             await tx.insert(stockMovements).values({
                                 userId,
                                 productId: pid,
                                 quantite: -item.quantite,
                                 type: 'Vente (Devis)',
                                 ref: `DEVIS-${id}`,
                                 date: new Date()
                             });
                         }
                    }
                }
            }

            // 3. Create Sale
            const saleItems = devisItems.map(item => ({
                productRef: item.productId || item.reference, // Use productId if available, else reference
                productName: item.designation,
                marque: item.marque,
                modele: item.modele,
                couleur: item.couleur,
                quantity: item.quantite,
                unitPrice: item.prixUnitaire,
                total: item.quantite * item.prixUnitaire,
            }));

            const saleNumber = `SALE-${Date.now().toString().slice(-8)}`;

            const newSale = {
                userId,
                clientId: devisData.clientId,
                clientName: devisData.clientName,
                clientPhone: devisData.clientPhone,
                saleNumber,
                items: saleItems,
                totalHT: devisData.totalHT,
                totalTTC: devisData.totalTTC,
                totalNet: devisData.totalTTC,
                totalTVA: (Number(devisData.totalHT) * 0.20).toFixed(2), 
                totalPaye: '0',
                resteAPayer: devisData.totalTTC,
                status: 'impaye',
                paymentHistory: [],
                type: 'commande',
                createdAt: new Date(),
                date: new Date()
            };

            const insertedSale = await tx.insert(sales).values(newSale).returning();

            // 4. Update Devis
            await tx.update(devis)
                .set({ 
                    status: 'TRANSFORME', 
                    saleId: insertedSale[0].id,
                    updatedAt: new Date()
                })
                .where(eq(devis.id, id));

            return insertedSale[0].id;
        });

        await logSuccess(userId, 'CONVERT_DEVIS', 'sales', result.toString());
        return { success: true, saleId: result.toString(), message: 'Transformé en vente' };

    } catch (error: any) {
        await logFailure(userId, 'CONVERT_DEVIS', 'devis', error.message, devisId);
        return { success: false, error: error.message };
    }
});

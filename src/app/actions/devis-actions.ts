/**
 * Devis Actions - Neon/Drizzle Version
 * Secure devis management with conversion to sales
 */

'use server';




import { dbWithTransactions,  db  } from '@/db';
import { devis, sales, products, stockMovements, shopProfiles } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { calculateLineItem } from '@/lib/tva-helpers';
import { getDocumentSettings } from '@/lib/document-settings';

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

    // Financials
    priceHT?: number;
    tvaRate?: number;
    amountTVA?: number;
    totalHT?: number;
    totalTTC?: number;

    unitPrice?: number; // Alias for priceUnitaire
    
    // Lens Details
    lensDetails?: any[];
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
        console.log(`🔍 Fetching devis for user: ${userId}`);

        // Use select() instead of query relational builder for better reliability
        const resultRows = await db
            .select()
            .from(devis)
            .where(eq(devis.userId, userId))
            .orderBy(desc(devis.createdAt));

        console.log(`✅ Fetched ${resultRows.length} devis rows`);

        const mapped: Devis[] = resultRows.map((d: typeof resultRows[0]) => ({
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

        await logSuccess(userId, 'READ', 'devis', 'list', { count: mapped.length });
        return { success: true, devis: mapped };

    } catch (error: any) {
        console.error('❌ GET_DEVIS_ERROR_FULL:', error);
        await logFailure(userId, 'READ', 'devis', error.message || 'Unknown error');
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

        // Calculate totals with strict VAT logic
        let runningTotalHT = 0;
        let runningTotalTVA = 0;
        let runningTotalTTC = 0;

        const enrichedItems = await Promise.all(data.items.map(async (item) => {
            // Check product for exemptions
            let hasTva = true;
            if (item.productId) {
                const pid = parseInt(item.productId);
                if (!isNaN(pid)) {
                    const product = await db.query.products.findFirst({
                        where: and(eq(products.id, pid), eq(products.userId, userId)),
                        columns: {
                            category: true,
                            categorie: true,
                            hasTva: true,
                            reference: true,
                            marque: true,
                            modele: true,
                            couleur: true
                        }
                    });
                    if (product) {
                        const cat = product.categorie || product.category;
                        const isExempt = cat && ['Monture', 'Montures', 'Medical'].includes(cat);
                        if (product.hasTva === false || isExempt) hasTva = false;

                        // Ensure reference is correct
                        if (product.reference) {
                            item.reference = product.reference;
                        }

                        // Enrich text fields if missing
                        if (!item.marque && product.marque) item.marque = product.marque;
                        if (!item.modele && product.modele) item.modele = product.modele;
                        if (!item.couleur && product.couleur) item.couleur = product.couleur;
                    }
                }
            }

            // Calculate
            const tax = calculateLineItem(item.prixUnitaire, item.quantite, true, hasTva);

            runningTotalHT += tax.totalHT;
            runningTotalTVA += tax.totalTVA;
            runningTotalTTC += tax.totalTTC;

            return {
                ...item,
                priceHT: tax.unitHT,
                tvaRate: tax.rate,
                amountTVA: tax.unitTVA,
                totalHT: tax.totalHT,
                totalTTC: tax.totalTTC,
                unitPrice: item.prixUnitaire
            };
        }));

        const profile = await db.query.shopProfiles.findFirst({
            where: eq(shopProfiles.userId, userId)
        });
        const currentSettings = await getDocumentSettings(profile?.id || 0);

        const newDevis = {
            userId,
            clientId: data.clientId ? parseInt(data.clientId) : null,
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            items: enrichedItems,
            totalHT: runningTotalHT.toFixed(2),
            totalTTC: runningTotalTTC.toFixed(2),
            status: data.status || 'EN_ATTENTE',
            validUntil: data.validUntil,
            createdAt: new Date(),
            documentSettingsSnapshot: currentSettings,
            templateVersionUsed: currentSettings.version
        };

        const inserted = await db.insert(devis).values(newDevis).returning();

        await logSuccess(userId, 'CREATE', 'devis', inserted[0].id.toString(), { clientName: data.clientName, total: runningTotalTTC }, null, newDevis);
        revalidatePath('/dashboard/devis');
        return { success: true, id: inserted[0].id.toString(), message: 'Devis créé avec succès' };

    } catch (error: any) {
        await logFailure(userId, 'CREATE', 'devis', error.message);
        return { success: false, error: 'Erreur création devis' };
    }
});

/**
 * Update Devis Status
 */
import { revalidatePath } from 'next/cache';

// ... (other imports)

// ...

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

        revalidatePath('/dashboard/devis');
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

        revalidatePath('/dashboard/devis');
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

        const result = await dbWithTransactions.transaction(async (tx: any) => {
            // ... (transaction logic remains same)
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
                            where: and(eq(products.id, pid), eq(products.userId, userId))
                        });

                        if (product) {
                            if ((product.quantiteStock || 0) < item.quantite) {
                                throw new Error(`Stock insuffisant pour ${item.designation}`);
                            }

                            // ✅ Optimistic Locking update
                            const updateRes = await tx.update(products)
                                .set({
                                    quantiteStock: sql`${products.quantiteStock} - ${item.quantite}`,
                                    version: sql`${products.version} + 1`,
                                    updatedAt: new Date()
                                })
                                .where(and(
                                    eq(products.id, pid),
                                    eq(products.version, product.version)
                                ));

                            if (updateRes.rowCount === 0) {
                                throw new Error(`Erreur de concurrence pour ${item.designation}.`);
                            }

                            // Log movement
                            await tx.insert(stockMovements).values({
                                userId,
                                productId: pid,
                                quantite: -item.quantite,
                                type: 'Vente (Devis)',
                                ref: `DEVIS-${id}`,
                                date: new Date()
                            });

                            // Audit log product
                            await logAudit({
                                userId,
                                entityType: 'product',
                                entityId: pid.toString(),
                                action: 'UPDATE_STOCK',
                                oldValue: { stock: product.quantiteStock, version: product.version },
                                newValue: { stock: product.quantiteStock - item.quantite, version: product.version + 1 },
                                metadata: { devisRef: id.toString() },
                                success: true
                            });
                        }
                    }
                }
            }

            // 3. Create Sale
            const saleItems = devisItems.map(item => ({
                productRef: item.reference || (item.productId ? item.productId : item.reference), // Prioritize reference string!
                productName: item.designation,
                marque: item.marque,
                modele: item.modele,
                couleur: item.couleur,
                unitPrice: item.prixUnitaire,
                quantity: item.quantite,
                total: item.quantite * item.prixUnitaire,
                lensDetails: item.lensDetails,
            }));

            const saleNumber = `SALE-${Date.now().toString().slice(-8)}`;

            // 2b. Fetch Settings for New Sale Snapshot
            const profile = await tx.query.shopProfiles.findFirst({
                where: eq(shopProfiles.userId, userId)
            });
            const currentSettings = await getDocumentSettings(profile?.id || 0);

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
                date: new Date(),
                documentSettingsSnapshot: currentSettings,
                templateVersionUsed: currentSettings.version
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

            await logAudit({
                userId,
                entityType: 'sale',
                entityId: insertedSale[0].id.toString(),
                action: 'CREATE_FROM_DEVIS',
                newValue: newSale,
                metadata: { devisId: id },
                success: true
            });

            return insertedSale[0].id;
        });

        await logSuccess(userId, 'CONVERT_DEVIS', 'sales', result.toString());

        revalidatePath('/dashboard/devis');
        revalidatePath('/dashboard/ventes'); // Also revalidate sales list

        return { success: true, saleId: result.toString(), message: 'Transformé en vente' };

    } catch (error: any) {
        await logFailure(userId, 'CONVERT_DEVIS', 'devis', error.message, devisId);
        return { success: false, error: error.message };
    }
});

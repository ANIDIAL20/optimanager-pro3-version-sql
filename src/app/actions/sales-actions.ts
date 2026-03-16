/**
 * Sales Actions - Neon/Drizzle Version
 * Secure sales management with relational data and stock adjustments
 */

'use server';
import { neonConfig } from '@neondatabase/serverless';
// Configure WebSocket for Node.js environment (required for transactions)
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  neonConfig.webSocketConstructor = eval('require')('ws');
}

import { db } from '@/db';
import { sales, saleItems, clients, products, lensOrders, clientTransactions, devis, stockMovements, saleLensDetails, prescriptionsLegacy, comptabiliteJournal } from '@/db/schema';
import { eq, and, desc, sql, inArray, or } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { withTiming } from '@/lib/db-monitor';
import { revalidatePath, revalidateTag } from 'next/cache';
import { track } from '@vercel/analytics/server';
import { redis } from '@/lib/cache/redis';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface SaleItem {
    productId?: string;
    productRef: string;
    productName: string;
    nomProduit?: string; // alias

    // Details
    reference?: string;
    marque?: string;
    modele?: string;
    couleur?: string;

    // Financials
    quantity: number;
    unitPrice: number; // TTC
    priceHT?: number;
    tvaRate?: number;
    amountTVA?: number;

    total: number; // TTC
    totalHT?: number;
    totalTTC?: number;

    returnedQuantity?: number;

    // Snapshot fields
    category?: string;
    brand?: string;
    productType?: string;

    // Optical Details
    lensDetails?: {
        eye: 'OD' | 'OG';
        sphere?: string;
        cylinder?: string;
        axis?: string;
        addition?: string;
        treatment?: string;
    }[];

    metadata?: any;

    // Legacy
    prixVente?: number;
    price?: number;
}

export interface Sale {
    id: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    clientMutuelle?: string;
    clientAddress?: string;
    saleNumber?: string;
    prescriptionSnapshot?: any;
    items: SaleItem[];
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    totalNet?: number;
    totalPaye: number;
    resteAPayer: number;
    status: string;
    deliveryStatus?: string;
    paymentMethod?: string;
    paymentHistory?: any[];
    notes?: string;
    createdAt: string;
    date?: string;
    lastPaymentDate?: string;
    isOfficialInvoice?: boolean;
}

export interface CreateSaleInput {
    clientId?: string;
    items: SaleItem[];
    lensOrderIds?: number[]; // IDs of lens orders to link
    paymentMethod?: string;
    notes?: string;
    totalHT?: number; // Optional, usually calculated
    totalTVA?: number;
    totalTTC?: number;
    amountPaid?: number; // 🆕 Initial Cash-in
    reservationIds?: number[]; // 🆕 IDs of reservations to link
    isDeclared?: boolean; // 🆕 Dual-Mode
    factureOfficielle?: boolean; // 🆕 POS v2 Official Invoice
}

// Helper for tax calculation
function calculateTaxBreakdown(price: number, qty: number, isTTC: boolean, hasTva: boolean) {
    // Basic rate: 20% or 0%
    const rate = hasTva ? 0.20 : 0.0;

    let unitHT, unitTVA, unitTTC;

    if (isTTC) {
        unitTTC = price;
        unitHT = hasTva ? price / 1.2 : price;
        unitTVA = unitTTC - unitHT;
    } else {
        unitHT = price;
        unitTVA = unitHT * rate;
        unitTTC = unitHT + unitTVA;
    }

    return {
        unitHT: Number(unitHT.toFixed(2)),
        unitTVA: Number(unitTVA.toFixed(2)),
        unitTTC: Number(unitTTC.toFixed(2)),
        totalHT: Number((unitHT * qty).toFixed(2)),
        totalTVA: Number((unitTVA * qty).toFixed(2)),
        totalTTC: Number((unitTTC * qty).toFixed(2)),
        rate: hasTva ? 20 : 0
    };
}

async function generateInvoiceNumber(userId: string, tx: any) {
    const year = new Date().getFullYear();
    const prefix = `${year}-`;

    // Find the last invoice number for this user and year
    // Optimized for concurrency: use a locking read if possible or atomic increments
    // For now, we select desc limit 1.
    // Note: In high concurrency, this needs a separate counters table. 
    // Given the scale (single shop usually), this is acceptable with unique constraint fallback.

    const lastSale = await tx.query.sales.findFirst({
        where: and(
            eq(sales.userId, userId),
            sql`${sales.saleNumber} LIKE ${prefix + '%'}`
        ),
        orderBy: [desc(sales.saleNumber)],
        columns: { saleNumber: true }
    });

    let nextNum = 1;
    if (lastSale && lastSale.saleNumber) {
        const parts = lastSale.saleNumber.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
            nextNum = parseInt(parts[1]) + 1;
        }
    }

    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

// ========================================
// SALES ACTIONS
// ========================================

// Helper to map DB sales to Sale type
const mapSale = (s: any): Sale => ({
    id: s.id.toString(),
    clientId: s.clientId?.toString(),
    clientName: s.clientName || s.client?.fullName,
    clientPhone: s.clientPhone || s.client?.phone,
    clientMutuelle: s.clientMutuelle || s.client?.mutuelle,
    clientAddress: s.clientAddress || s.client?.address,
    saleNumber: s.saleNumber,
    prescriptionSnapshot: s.prescriptionSnapshot,
    items: (s.items as SaleItem[]) || [],
    totalHT: Number(s.totalHT),
    totalTVA: Number(s.totalTVA),
    totalTTC: Number(s.totalTTC),
    totalNet: Number(s.totalNet || s.totalTTC),
    totalPaye: Number(s.totalPaye),
    resteAPayer: Number(s.resteAPayer),
    status: s.status || 'impaye',
    deliveryStatus: s.deliveryStatus || 'en_attente',
    paymentMethod: s.paymentMethod,
    paymentHistory: (s.paymentHistory as any[]) || [],
    notes: s.notes,
    createdAt: s.createdAt ? (typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString()) : new Date().toISOString(),
    date: s.date ? (typeof s.date === 'string' ? s.date : s.date.toISOString()) : undefined,
    lastPaymentDate: s.lastPaymentDate ? (typeof s.lastPaymentDate === 'string' ? s.lastPaymentDate : s.lastPaymentDate.toISOString()) : undefined,
    isOfficialInvoice: s.isOfficialInvoice ?? true,
});



/**
 * Get all sales
 */
export const getSales = secureAction(async (userId, user) => {
    try {
        console.log('📊 Fetching sales for userId (Drizzle):', userId);

        const results = await db.query.sales.findMany({
            where: eq(sales.userId, userId),
            orderBy: [desc(sales.createdAt)],
            with: {
                client: {
                    columns: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        mutuelle: true,
                        address: true
                    }
                }
            }
        });

        console.log(`✅ Found ${results.length} sales (Drizzle)`);

        const mappedSales: Sale[] = results.map(mapSale);

        await logSuccess(userId, 'READ', 'sales', 'LIST_ALL', { count: mappedSales.length });
        return { success: true, sales: mappedSales };

    } catch (error: any) {
        console.error('💥 ERROR in getSales (Drizzle):', error);
        await logFailure(userId, 'READ', 'sales', error.message);
        return { success: false, error: `Erreur lors de la récupération des ventes: ${error.message}`, sales: [] };
    }
});

/**
 * Get single sale
 */
export const getSale = secureAction(async (userId, user, saleId: string) => {
    try {
        const id = parseInt(saleId);
        if (isNaN(id)) return { success: false, error: 'ID vente invalide' };

        const sale = await db.query.sales.findFirst({
            where: and(eq(sales.id, id), eq(sales.userId, userId)),
            with: {
                client: {
                    columns: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        mutuelle: true,
                        address: true
                    }
                }
            }
        });

        if (!sale) return { success: false, error: 'Vente introuvable' };

        const mappedSale = mapSale(sale);

        return { success: true, sale: mappedSale };

    } catch (error: any) {
        console.error('💥 Error fetching sale (Drizzle):', error);
        return { success: false, error: error.message };
    }
});

/**
 * Create a new sale
 */
/**
 * Create a new sale with stock management
 */
export const createSale = secureAction(async (userId, user, data: CreateSaleInput) => {
    console.log(`📝 Creating sale for user ${userId}`, JSON.stringify(data, null, 2));

    try {
        if (!data.items || data.items.length === 0) {
            return { success: false, error: 'Veuillez ajouter au moins un article' };
        }
        const saleId = await withTiming('CREATE_SALE_COMPLETE', async () => {
            return await db.transaction(async (tx: any) => {
                const activeItemsInput = data.items.filter(i => i.quantity > 0);
                if (activeItemsInput.length === 0) {
                    throw new Error('Veuillez ajouter au moins un article avec une quantité positive');
                }
                // 2. Fetch Client Data + Snapshot
                let clientSnapshot: any = {};
                let clientIdNum: number | undefined;

                if (data.clientId) {
                    clientIdNum = parseInt(data.clientId);
                    if (isNaN(clientIdNum)) throw new Error("ID Client invalide");

                    const client = await tx.query.clients.findFirst({
                        where: and(eq(clients.id, clientIdNum), eq(clients.userId, userId)),
                        columns: {
                            id: true,
                            fullName: true,
                            phone: true,
                            address: true,
                            balance: true,
                            creditLimit: true,
                        },
                        with: {
                            prescriptionsLegacy: {
                                orderBy: (prescriptionsLegacy: any, { desc }: any) => [desc(prescriptionsLegacy.createdAt)],
                                limit: 1
                            }
                        }
                    });

                    if (client) {
                        clientSnapshot = {
                            clientName: client.fullName,
                            clientPhone: client.phone,
                            clientAddress: client.address
                        };

                        if (client.prescriptionsLegacy && client.prescriptionsLegacy.length > 0) {
                            const latest = client.prescriptionsLegacy[0];
                            if (latest) {
                                clientSnapshot.prescriptionSnapshot = latest.prescriptionData;
                            }
                        }
                    }
                }

                // 3. Update Stock & Enrich Items
                const enrichedItems: any[] = [];

                // ✅ N+1 Fix: Fetch all products in bulk
                const productRefs = activeItemsInput.map(i => i.productRef);
                const possibleIds = productRefs.map(r => parseInt(r)).filter(id => !isNaN(id));
                const possibleRefs = productRefs.filter(r => isNaN(parseInt(r)));

                const fetchedProducts = await tx.query.products.findMany({
                    where: and(
                        eq(products.userId, userId),
                        or(
                            possibleIds.length > 0 ? inArray(products.id, possibleIds) : undefined,
                            possibleRefs.length > 0 ? inArray(products.reference, possibleRefs) : undefined
                        )
                    )
                });

                let runningTotalHT = 0;
                let runningTotalTVA = 0;
                let runningTotalTTC = 0;

                for (const item of activeItemsInput) {
                    const productToUpdate = fetchedProducts.find((p: any) =>
                        p.id.toString() === item.productRef || p.reference === item.productRef
                    );

                    if (productToUpdate) {
                        // CHECK STOCK
                        if (productToUpdate.isStockManaged && (productToUpdate.quantiteStock || 0) < item.quantity) {
                            throw new Error(`STOCK_INSUFFISANT: ${productToUpdate.nom}`);
                        }

                        // OPTIMISTIC LOCKING UPDATE
                        if (productToUpdate.isStockManaged) {
                            const updateResult = await tx.update(products)
                                .set({
                                    quantiteStock: sql`${products.quantiteStock} - ${item.quantity}`,
                                    version: sql`${products.version} + 1`,
                                    updatedAt: new Date()
                                })
                                .where(and(
                                    eq(products.id, productToUpdate.id),
                                    eq(products.version, productToUpdate.version)
                                ));

                            if (updateResult.rowCount === 0) {
                                throw new Error(`CONCURRENCY_ERROR: Le produit ${productToUpdate.nom} a été modifié.`);
                            }
                        }
                    }

                    // ✅ DUAL-MODE TVA LOGIC
                    const isDeclared = data.isDeclared === true;
                    let rawRate = Number(productToUpdate?.tvaRate || item.tvaRate || 20);
                    const effectiveRate = isDeclared ? rawRate : 0;

                    const unitTTC = Number(item.unitPrice || 0);
                    const unitHT = unitTTC / (1 + (effectiveRate / 100));
                    const unitTVA = unitTTC - unitHT;

                    const lineHT = unitHT * item.quantity;
                    const lineTTC = unitTTC * item.quantity;
                    const lineTVA = lineTTC - lineHT;

                    enrichedItems.push({
                        productId: productToUpdate?.id.toString() || item.productRef,
                        productRef: productToUpdate?.reference || item.productRef,
                        productName: item.productName || productToUpdate?.nom || 'Article Inconnu',

                        brand: productToUpdate?.brand || productToUpdate?.marque || 'N/A',
                        marque: productToUpdate?.brand || productToUpdate?.marque || 'N/A',
                        modele: productToUpdate?.modele || '-',
                        category: productToUpdate?.category || productToUpdate?.categorie || 'OPTIQUE',
                        productType: productToUpdate?.productType || (productToUpdate?.categorie?.toLowerCase().includes('monture') ? 'frame' : 'accessory'),

                        reference: productToUpdate?.reference || item.productRef,
                        unitPrice: unitTTC,
                        priceHT: unitHT,
                        tvaRate: effectiveRate,
                        amountTVA: unitTVA,

                        quantity: item.quantity,
                        totalHT: lineHT,
                        totalTTC: lineTTC,
                        total: lineTTC,

                        lensDetails: item.lensDetails,
                        metadata: item.metadata
                    });

                    runningTotalHT += lineHT;
                    runningTotalTVA += lineTVA;
                    runningTotalTTC += lineTTC;
                }

                // 5. Reference Numbers
                const saleNumber = await generateInvoiceNumber(userId, tx);
                let transactionNumber = null;
                if (data.isDeclared) {
                    const countResult = await tx.execute(sql`SELECT count(*) FROM sales WHERE user_id = ${userId} AND is_declared = true`);
                    const count = parseInt(countResult.rows[0].count) || 0;
                    transactionNumber = `FACT-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
                }

                // 5b. Check for existing advances (LENS_ORDERS and RESERVATIONS)
                let existingAdvancesAmount = 0;
                const advanceEntries: any[] = [];
                const searchReferences: string[] = [];

                if (data.lensOrderIds && data.lensOrderIds.length > 0) {
                    data.lensOrderIds.forEach(id => searchReferences.push(`LENS_ORDER:${id}`));
                }
                if (data.reservationIds && data.reservationIds.length > 0) {
                    data.reservationIds.forEach(id => searchReferences.push(`RESERVATION:${id}`));
                }

                if (searchReferences.length > 0) {
                    const advances = await tx.query.clientTransactions.findMany({
                        where: and(
                            clientIdNum ? eq(clientTransactions.clientId, clientIdNum) : undefined,
                            eq(clientTransactions.type, 'PAYMENT'),
                            inArray(clientTransactions.referenceId, searchReferences)
                        )
                    });

                    for (const adv of advances) {
                        const amount = Math.abs(Number(adv.amount));
                        existingAdvancesAmount += amount;
                        advanceEntries.push({
                            id: `ADV-${adv.id}`,
                            amount: amount,
                            date: adv.date?.toISOString() || new Date().toISOString(),
                            method: 'Advance',
                            note: adv.notes || 'Avance récupérée',
                            receivedBy: 'System'
                        });
                    }
                }

                const amountPaidFromInput = data.amountPaid !== undefined ? Number(data.amountPaid) : 0;
                const initialPaid = isNaN(amountPaidFromInput) ? 0 : amountPaidFromInput;
                const totalPayeForSale = initialPaid + existingAdvancesAmount;
                const resteAPayer = Math.max(0, runningTotalTTC - totalPayeForSale);

                console.log('💰 [CreateSale] Final Calculation:', {
                    runningTotalTTC,
                    initialPaid,
                    existingAdvancesAmount,
                    totalPayeForSale,
                    resteAPayer
                });

                let status: 'impaye' | 'partiel' | 'paye' = 'impaye';
                if (resteAPayer <= 0.05) status = 'paye';
                else if (totalPayeForSale > 0.1) status = 'partiel';

                const initialPaymentHistory = [];

                // Add current payment if any (This is the "Avance" entered in POS)
                if (initialPaid > 0) {
                    initialPaymentHistory.push({
                        id: `PAY-INIT-${Date.now()}`,
                        amount: initialPaid,
                        date: new Date().toISOString(),
                        method: data.paymentMethod || 'Especes',
                        note: 'Avance',
                        receivedBy: user.email || 'System'
                    });
                }

                // Add existing advances found in transactions
                if (advanceEntries.length > 0) {
                    initialPaymentHistory.push(...advanceEntries);
                }

                const saleData = {
                    userId,
                    clientId: clientIdNum,
                    saleNumber,
                    transactionNumber,
                    isDeclared: data.isDeclared || false,
                    ...clientSnapshot,
                    items: enrichedItems,
                    totalHT: runningTotalHT.toFixed(2),
                    totalTVA: runningTotalTVA.toFixed(2),
                    totalTTC: runningTotalTTC.toFixed(2),
                    totalNet: runningTotalTTC.toFixed(2),
                    totalPaye: totalPayeForSale.toFixed(2),
                    resteAPayer: resteAPayer.toFixed(2),
                    status,
                    deliveryStatus: 'en_attente',
                    paymentMethod: data.paymentMethod,
                    paymentHistory: initialPaymentHistory,
                    type: data.isDeclared ? 'INVOICE' : 'VENTE',
                    
                    // 🆕 Accounting integration
                    isOfficialInvoice: data.factureOfficielle ?? true,
                    comptabiliteStatus: (data.factureOfficielle ?? true) ? 'PENDING' : 'EXCLUDED',
                    
                    createdAt: new Date(),
                    date: new Date(),
                    lastPaymentDate: totalPayeForSale > 0 ? new Date() : undefined
                };

                const saleResult = await tx.insert(sales).values(saleData).returning();
                const createdSaleId = saleResult[0].id;

                // 🔥 CAISSE LOGIC REMOVED

                // 🆕 COMPTABILITE: Link to Journal if official
                if (data.factureOfficielle ?? true) {
                    await tx.insert(comptabiliteJournal).values({
                        userId,
                        saleId: createdSaleId,
                        montantHT: runningTotalHT.toFixed(2),
                        tva: runningTotalTVA.toFixed(2),
                        montantTTC: runningTotalTTC.toFixed(2),
                        statut: 'BROUILLON'
                    });
                }

                // 7. Normalized Items Insertion
                for (const item of enrichedItems) {
                    const itemResult = await tx.insert(saleItems).values({
                        saleId: createdSaleId,
                        productId: parseInt(item.productId!) || null,
                        brand: item.brand,
                        category: item.category,
                        productType: item.productType as any,
                        label: item.productName,
                        qty: item.quantity,
                        unitPriceHT: item.priceHT?.toFixed(2),
                        unitPriceTVA: item.amountTVA?.toFixed(2),
                        unitPriceTTC: item.unitPrice.toFixed(2),
                        tvaRate: item.tvaRate?.toFixed(2),
                        lineTotalHT: item.totalHT?.toFixed(2),
                        lineTotalTVA: (item.totalTTC! - item.totalHT!).toFixed(2),
                        lineTotalTTC: item.totalTTC?.toFixed(2),
                    }).returning();

                    if (item.productType === 'lens' && item.lensDetails) {
                        for (const lens of item.lensDetails) {
                            await tx.insert(saleLensDetails).values({
                                saleItemId: itemResult[0].id,
                                eye: lens.eye,
                                sphere: lens.sphere || '0.00',
                                cylinder: lens.cylinder || '0.00',
                                axis: lens.axis || '0',
                                addition: lens.addition || '0.00',
                                treatment: lens.treatment || 'N/A'
                            });
                        }
                    }

                    // 🆕 COMPLEX PACK LOGIC: Create Prescription + Lens Order
                    if (item.metadata?.isComplexPack && clientIdNum) {
                        const m = item.metadata;
                        
                        // 1. Insert Legacy Prescription (JSON format)
                        const [presc] = await tx.insert(prescriptionsLegacy).values({
                            userId,
                            clientId: clientIdNum,
                            date: m.prescription.date ? new Date(m.prescription.date) : new Date(),
                            prescriptionData: {
                                od: {
                                    sphere: m.prescription.od.sph?.toString() || '0.00',
                                    cylinder: m.prescription.od.cyl?.toString() || '0.00',
                                    axis: m.prescription.od.axis?.toString() || '0',
                                    addition: m.prescription.od.add?.toString() || '0.00',
                                    pd: m.prescription.od.pd?.toString() || '0.00',
                                    height: m.prescription.od.hauteur?.toString() || '0.00'
                                },
                                og: {
                                    sphere: m.prescription.og.sph?.toString() || '0.00',
                                    cylinder: m.prescription.og.cyl?.toString() || '0.00',
                                    axis: m.prescription.og.axis?.toString() || '0',
                                    addition: m.prescription.og.add?.toString() || '0.00',
                                    pd: m.prescription.og.pd?.toString() || '0.00',
                                    height: m.prescription.og.hauteur?.toString() || '0.00'
                                },
                                doctorName: m.prescription.doctorName,
                                pd: m.prescription.pd.binocular?.toString() || '0.00'
                            },
                            notes: `Généré depuis Vente #${saleNumber}`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }).returning();

                        // 2. Insert Lens Order
                        await tx.insert(lensOrders).values({
                            userId,
                            clientId: clientIdNum,
                            prescriptionId: presc.id,
                            saleId: createdSaleId,
                            orderType: m.lensOrder.orderType,
                            lensType: item.productName,
                            supplierId: (m.lensOrder.supplierId && m.lensOrder.supplierId !== "") ? m.lensOrder.supplierId : null,
                            supplierName: m.lensOrder.supplierName || 'Fournisseur externe (Pack)', 
                            indice: m.lensOrder.index, // 🆕 Lens Index 
                            
                            sphereR: m.prescription.od.sph?.toString() || '0.00',
                            cylindreR: m.prescription.od.cyl?.toString() || '0.00',
                            axeR: m.prescription.od.axis?.toString() || '0',
                            additionR: m.prescription.od.add?.toString() || '0.00',
                            hauteurR: m.prescription.od.hauteur?.toString() || '0.00',
                            ecartPupillaireR: m.prescription.od.pd?.toString() || '0.00',

                            sphereL: m.prescription.og.sph?.toString() || '0.00',
                            cylindreL: m.prescription.og.cyl?.toString() || '0.00',
                            axeL: m.prescription.og.axis?.toString() || '0',
                            additionL: m.prescription.og.add?.toString() || '0.00',
                            hauteurL: m.prescription.og.hauteur?.toString() || '0.00',
                            ecartPupillaireL: m.prescription.og.pd?.toString() || '0.00',

                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            totalPrice: (item.unitPrice * item.quantity).toString(),
                            sellingPrice: item.unitPrice.toString(),
                            estimatedBuyingPrice: (m.lensOrder.purchasePrice || 0).toString(),
                            estimatedMargin: (item.unitPrice - (m.lensOrder.purchasePrice || 0)).toString(),
                            status: 'pending',
                            notes: m.lensOrder.notes,
                            orderDate: new Date()
                        });
                    }
                }

                // ✅ UPDATE LENS ORDERS STATUS TO 'SOLD' (Smart Advance Persistence)
                if (data.lensOrderIds && data.lensOrderIds.length > 0) {
                    await tx.update(lensOrders)
                        .set({ 
                            status: 'sold', 
                            saleId: createdSaleId,
                            updatedAt: new Date() 
                        })
                        .where(and(
                            inArray(lensOrders.id, data.lensOrderIds),
                            eq(lensOrders.userId, userId)
                        ));

                    // 🔥 CLEANUP: Mark the auto-generated VERRE- products as inactive and zero stock
                    const verreRefs = data.lensOrderIds.map(id => `VERRE-${id}`);
                    await tx.update(products)
                        .set({ 
                            isActive: false, 
                            quantiteStock: 0,
                            updatedAt: new Date()
                        })
                        .where(and(
                            inArray(products.reference, verreRefs),
                            eq(products.userId, userId)
                        ));
                }

                // ✅ HANDLE SCANNED VERRE- PRODUCTS (Fallback for barcodes)
                const scannedVerreItems = data.items.filter(item => 
                    (item.productRef || '').startsWith('VERRE-') || (item.reference || '').startsWith('VERRE-')
                );

                if (scannedVerreItems.length > 0) {
                    const scannedRefs: string[] = [];
                    const scannedLensIds: number[] = [];

                    for (const item of scannedVerreItems) {
                        const ref = item.reference || item.productRef || '';
                        scannedRefs.push(ref);
                        const id = parseInt(ref.replace('VERRE-', ''), 10);
                        if (!isNaN(id)) scannedLensIds.push(id);
                    }

                    if (scannedLensIds.length > 0) {
                        await tx.update(lensOrders)
                            .set({ 
                                status: 'sold', 
                                saleId: createdSaleId,
                                updatedAt: new Date() 
                            })
                            .where(and(
                                inArray(lensOrders.id, scannedLensIds),
                                eq(lensOrders.userId, userId),
                                eq(lensOrders.status, 'received')
                            ));
                    }

                    if (scannedRefs.length > 0) {
                        await tx.update(products)
                            .set({ 
                                isActive: false, 
                                quantiteStock: 0,
                                updatedAt: new Date() 
                            })
                            .where(and(
                                inArray(products.reference, scannedRefs),
                                eq(products.userId, userId)
                            ));
                    }
                }

                // 8. CLIENT LEDGER
                if (clientIdNum) {
                    const client = await tx.query.clients.findFirst({ where: eq(clients.id, clientIdNum) });
                    if (client) {
                        const currentBalance = Number(client.balance || 0);
                        const newBalance = currentBalance + runningTotalTTC - totalPayeForSale;

                        await tx.update(clients).set({
                            balance: newBalance.toFixed(2),
                            totalSpent: sql`${clients.totalSpent} + ${runningTotalTTC}`,
                            updatedAt: new Date()
                        }).where(eq(clients.id, clientIdNum));

                        // Record NEW Payment Transaction only if strictly positive
                        if (initialPaid > 0) {
                            await tx.insert(clientTransactions).values({
                                userId,
                                clientId: clientIdNum,
                                type: 'PAYMENT',
                                referenceId: `SALE:${saleNumber}`, // Link to sale
                                amount: (-initialPaid).toString(), // Negative = Credit
                                previousBalance: (currentBalance + runningTotalTTC).toFixed(2),
                                newBalance: (currentBalance + runningTotalTTC - initialPaid).toFixed(2),
                                notes: `Avance lors de la Vente #${saleNumber}`,
                                date: new Date()
                            });
                        }

                        // Also update existing advances transactions to link them to the sale!
                        if (searchReferences.length > 0) {
                            await tx.update(clientTransactions)
                                .set({
                                    notes: sql`${clientTransactions.notes} || ' (Lié à Vente #' || ${saleNumber} || ')'`
                                })
                                .where(and(
                                    clientIdNum ? eq(clientTransactions.clientId, clientIdNum) : undefined,
                                    eq(clientTransactions.type, 'PAYMENT'),
                                    inArray(clientTransactions.referenceId, searchReferences)
                                ));
                        }
                    }
                }

                revalidatePath('/dashboard/ventes');
                revalidatePath('/dashboard/stock');
                revalidatePath('/dashboard/lens-orders');
                revalidatePath('/dashboard/notifications');
                revalidatePath('/dashboard/clients', 'layout'); // refreshes client POS tab too

                try {
                    await redis?.del(`notifications:count:${userId}`);
                } catch {
                    // ignore cache errors
                }

                return { success: true, id: createdSaleId.toString(), message: `Vente #${saleNumber} créée` };
            });

        });

        return saleId;

    } catch (error: any) {
        console.error('💥 Error creating sale:', error);
        console.error('💥 Stack:', error.stack);
        await logFailure(userId, 'CREATE', 'sales', error.message);
        return { success: false, error: `Erreur lors de la création de la vente: ${error.message}` };
    }
});

/**
 * Delete a sale
 */
export const deleteSale = secureAction(async (userId, user, saleId: string) => {
    try {
        const id = parseInt(saleId);

        await db.transaction(async (tx: any) => {
            // 1. Fetch sale to get items for stock reversion
            const saleDoc = await tx.query.sales.findFirst({
                where: and(eq(sales.id, id), eq(sales.userId, userId)),
                with: {
                    client: {
                        columns: { id: true, balance: true }
                    }
                }
            });

            if (!saleDoc) throw new Error("Vente introuvable");

            // 2. Revert Stock
            if (saleDoc.items && Array.isArray(saleDoc.items)) {
                for (const item of saleDoc.items as SaleItem[]) {
                    // Start logic similar to processReturn, but for full quantity
                    if (!item.productRef) continue;

                    // Try to identify product
                    let productId: number | null = parseInt(item.productRef);
                    if (isNaN(productId)) {
                        const p = await tx.query.products.findFirst({
                            where: and(eq(products.userId, userId), eq(products.reference, item.productRef))
                        });
                        if (p) productId = p.id;
                        else productId = null;
                    }

                    if (productId) {
                        // Re-add the quantity to stock
                        await tx.update(products)
                            .set({
                                quantiteStock: sql`${products.quantiteStock} + ${item.quantity}`,
                                updatedAt: new Date()
                            })
                            .where(eq(products.id, productId));
                    }
                }
            }

            // 3. Unlink Devis (if any)
            await tx.update(devis)
                .set({ saleId: null, status: 'VALIDE' }) // Revert devis to valid state
                .where(and(eq(devis.saleId, id), eq(devis.userId, userId)));

            // 4. Delete Sale
            await tx.delete(sales)
                .where(eq(sales.id, id));
        });

        await logSuccess(userId, 'DELETE', 'sales', saleId, { action: 'delete_sale' });
        revalidatePath('/dashboard/ventes');
        revalidatePath('/dashboard/stock');
        revalidatePath('/dashboard/clients', 'layout');
        return { success: true, message: 'Vente supprimée et stock restauré avec succès' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Update Delivery Status
 */
export const updateDeliveryStatus = secureAction(async (userId, user, saleId: string, status: 'en_attente' | 'en_cours' | 'pret' | 'livre') => {
    try {
        const id = parseInt(saleId);
        if (isNaN(id)) return { success: false, error: 'ID vente invalide' };

        await db.update(sales)
            .set({ deliveryStatus: status, updatedAt: new Date() })
            .where(and(eq(sales.id, id), eq(sales.userId, userId)));

        await logSuccess(userId, 'UPDATE', 'sales', saleId, { action: 'update_delivery_status', status });
        revalidatePath('/dashboard/ventes');
        revalidatePath('/dashboard/clients', 'layout');
        return { success: true, message: `Statut de livraison mis Ã  jour: ${status}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Process Return
 */
export const processReturn = secureAction(async (userId, user, saleId: string, returnItems: { productRef: string; quantity: number; price: number; name: string }[]) => {
    try {
        const id = parseInt(saleId);

        await db.transaction(async (tx: any) => {
            const sale = await tx.query.sales.findFirst({
                where: and(eq(sales.id, id), eq(sales.userId, userId)),
                with: {
                    client: {
                        columns: { id: true, balance: true }
                    }
                }
            });

            if (!sale) throw new Error("Vente introuvable");

            const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // 1. Update Product Stocks
            for (const item of returnItems) {
                let productId: number | null = parseInt(item.productRef);
                if (isNaN(productId)) {
                    const p = await tx.query.products.findFirst({
                        where: and(eq(products.userId, userId), eq(products.reference, item.productRef))
                    });
                    if (p) productId = p.id;
                    else productId = null;
                }

                if (productId) {
                    await tx.update(products)
                        .set({
                            quantiteStock: sql`${products.quantiteStock} + ${item.quantity}`,
                            updatedAt: new Date()
                        })
                        .where(eq(products.id, productId));
                }
            }

            // 2. Recalculate Sale Totals
            // Instead of subtracting, let's recalculate from updated items to be safe
            // Or just subtract correctly.

            const currentTotalTTC = Number(sale.totalTTC || 0);
            const currentTotalHT = Number(sale.totalHT || 0);
            const currentTotalPaid = Number(sale.totalPaye || 0);

            // Calculate value of returned items
            const returnedTTC = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            // Approximation for HT: price / 1.2
            const returnedHT = returnItems.reduce((sum, item) => sum + ((item.price / 1.2) * item.quantity), 0);

            const newTotalTTC = Math.max(0, currentTotalTTC - returnedTTC);
            const newTotalHT = Math.max(0, currentTotalHT - returnedHT);
            const newTotalTVA = newTotalTTC - newTotalHT;

            // 3. Handle Payment/Refund Logic
            // Only issue a refund if the client has paid MORE than the new Total.
            // If they owe money, just reduce the debt (don't refund cash).

            let refundAmount = 0;
            let newTotalPaid = currentTotalPaid;
            let paymentRecordsToAdd: any[] = [];

            if (currentTotalPaid > newTotalTTC) {
                // Client paid more than what they kept -> Refund the difference
                refundAmount = currentTotalPaid - newTotalTTC;
                newTotalPaid = newTotalTTC; // Paid amount becomes equal to total (fully paid)

                paymentRecordsToAdd.push({
                    id: `REF-${Date.now()}`,
                    amount: -refundAmount,
                    date: new Date().toISOString(),
                    method: 'refund',
                    note: `Remboursement suite retour: ${returnItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
                    receivedBy: user.email || 'System'
                });
            } else {
                // Client paid less than or equal to new total -> No refund, just less debt
                // No payment record needed, unless we want to track the 'return' event as a note?
                // Let's rely on the updated items list to show what happened.
            }

            // 4. Determine New Status
            const remaining = Math.max(0, newTotalTTC - newTotalPaid);
            let newStatus = 'impaye';
            if (remaining <= 0.01) newStatus = 'paye';
            else if (newTotalPaid > 0.01) newStatus = 'partiel';

            // 5. Update Sale
            const updatedItems = (sale.items as SaleItem[]).map(i => {
                const returned = returnItems.find(r => r.productRef === i.productRef && r.name === i.productName);
                if (returned) {
                    return { ...i, returnedQuantity: (i.returnedQuantity || 0) + returned.quantity };
                }
                return i;
            });

            const currentHistory = (sale.paymentHistory as any[]) || [];

            await tx.update(sales)
                .set({
                    items: updatedItems,
                    paymentHistory: [...currentHistory, ...paymentRecordsToAdd],
                    totalTTC: newTotalTTC.toFixed(2),
                    totalNet: newTotalTTC.toFixed(2),
                    totalHT: newTotalHT.toFixed(2),
                    totalTVA: newTotalTVA.toFixed(2),
                    totalPaye: newTotalPaid.toFixed(2),
                    resteAPayer: remaining.toFixed(2),
                    status: newStatus,
                    updatedAt: new Date()
                })
                .where(eq(sales.id, id));

            await logSuccess(userId, 'RETURN', 'sales', saleId, { action: 'process_return', totalRefund: returnedTTC, actualRefund: refundAmount }, sale, { ...sale, items: updatedItems, totalTTC: newTotalTTC.toFixed(2), status: newStatus });
        });

        revalidatePath('/dashboard/ventes');
        revalidatePath(`/dashboard/ventes/${saleId}`);
        revalidatePath('/dashboard/stock');
        revalidatePath('/dashboard/clients', 'layout');
        return { success: true, message: 'Retour effectué avec succès' };

    } catch (error: any) {
        await logFailure(userId, 'RETURN', 'sales', error.message, saleId);
        return { success: false, error: 'Erreur lors du traitement du retour' };
    }
});

/**
 * Get sales for a specific client
 */
export const getClientSales = secureAction(async (userId, user, clientId: string) => {
    try {
        const id = parseInt(clientId);
        const salesData = await db.query.sales.findMany({
            where: and(eq(sales.clientId, id), eq(sales.userId, userId)),
            orderBy: [desc(sales.createdAt)],
            with: {
                client: {
                    columns: {
                        id: true,
                        fullName: true,
                    }
                }
            }
        });

        const mappedSales = salesData.map(mapSale);

        return { success: true, sales: mappedSales };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Add a payment to a sale
 */
export const addPayment = secureAction(async (userId, user, saleId: string, payment: { amount: number; method: string; note?: string; date?: string }) => {
    try {
        const id = parseInt(saleId);

        await db.transaction(async (tx: any) => {
            const saleDoc = await tx.query.sales.findFirst({
                where: and(eq(sales.id, id), eq(sales.userId, userId)),
                with: {
                    client: {
                        columns: { id: true, balance: true, fullName: true, phone: true }
                    }
                }
            });

            if (!saleDoc) throw new Error("Vente introuvable");

            // Calculate new totals
            const currentPaid = Number(saleDoc.totalPaye || 0);
            const newPaid = currentPaid + payment.amount;
            const totalTTC = Number(saleDoc.totalTTC || saleDoc.totalNet || 0);
            const remaining = Math.max(0, totalTTC - newPaid);

            // Determine status
            let newStatus = 'impaye';
            if (remaining <= 0.01) newStatus = 'paye';
            else if (newPaid > 0) newStatus = 'partiel';

            // Create payment record
            const newPaymentRecord = {
                id: `PAY-${Date.now()}`,
                amount: payment.amount,
                date: payment.date || new Date().toISOString(),
                method: payment.method,
                note: payment.note,
                receivedBy: user.email || 'System'
            };

            const currentHistory = (saleDoc.paymentHistory as any[]) || [];

            await tx.update(sales)
                .set({
                    paymentHistory: [...currentHistory, newPaymentRecord],
                    totalPaye: newPaid.toFixed(2),
                    resteAPayer: remaining.toFixed(2),
                    status: newStatus,
                    lastPaymentDate: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(sales.id, id));

            // Ledger Update
            if (saleDoc.clientId) {
                const client = await tx.query.clients.findFirst({
                    where: eq(clients.id, saleDoc.clientId),
                    columns: { id: true, balance: true }
                });
                if (client) {
                    const amountPaid = payment.amount;
                    const currentBalance = Number(client.balance || 0);
                    // Logic: Payment reduces balance (debt)
                    const newBalance = currentBalance - amountPaid;

                    await tx.update(clients)
                        .set({
                            balance: newBalance.toFixed(2),
                            updatedAt: new Date()
                        })
                        .where(eq(clients.id, saleDoc.clientId));

                    await tx.insert(clientTransactions).values({
                        userId,
                        clientId: saleDoc.clientId,
                        type: 'PAYMENT',
                        referenceId: newPaymentRecord.id,
                        amount: (-amountPaid).toFixed(2), // Negative = Credit
                        previousBalance: currentBalance.toFixed(2),
                        newBalance: newBalance.toFixed(2),
                        notes: `Paiement Vente #${saleDoc.saleNumber || saleDoc.id}: ${payment.note || ''}`,
                        date: new Date(payment.date || new Date())
                    });
                }
            }
            await logSuccess(userId, 'UPDATE', 'sales', saleId, {
                action: 'addPayment',
                amount: payment.amount,
                saleNumber: saleDoc?.saleNumber
            });

            revalidatePath('/dashboard/ventes');
            revalidatePath(`/dashboard/ventes/${saleId}`);
            if (saleDoc.clientId) revalidatePath(`/dashboard/clients/${saleDoc.clientId}`);
        });

        return { success: true, message: 'Paiement enregistré avec succès' };

    } catch (error: any) {
        await logFailure(userId, 'UPDATE', 'sales', error.message, saleId);
        return { success: false, error: 'Erreur lors de l\'enregistrement du paiement' };
    }
});
